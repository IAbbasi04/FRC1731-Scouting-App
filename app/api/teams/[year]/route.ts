import { NextResponse } from "next/server";
import { computeFilteredOpr } from "@/lib/filtered-opr";
import { getEventMatches, getEventOprs, getEventsForYear, getTeamsForYearPage } from "@/lib/tba";

export const maxDuration = 60;

const MIN_YEAR = 1992;
const MAX_CONCURRENCY = 12;
const OFFSEASON_EVENT_TYPE = 99;

type OprValue = { value: number; eventKey: string; eventName: string; date: string };

type TeamAggregate = {
  values: OprValue[];
  filteredValues: OprValue[];
  districtKeys: Set<string>;
};

function teamNumberFromKey(teamKey: string) {
  return Number(teamKey.replace(/^frc/, ""));
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= items.length) return;
      results[index] = await fn(items[index]);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function loadYearTeams(year: number) {
  const teams = [];
  for (let page = 0; page < 40; page += 1) {
    const rows = await getTeamsForYearPage(page, year);
    if (!rows.length) break;
    teams.push(...rows);
    if (rows.length < 500) break;
  }
  return teams;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ year: string }> },
) {
  try {
    const { year: rawYear } = await params;
    const year = Number(rawYear);
    const currentYear = new Date().getFullYear();

    if (!Number.isInteger(year) || year < MIN_YEAR || year > currentYear) {
      return NextResponse.json({ error: `Year must be between ${MIN_YEAR} and ${currentYear}.` }, { status: 400 });
    }

    const [allEvents, teams] = await Promise.all([getEventsForYear(year), loadYearTeams(year)]);
    const events = allEvents.filter((event) => event.event_type !== OFFSEASON_EVENT_TYPE);
    const teamMeta = new Map(teams.map((team) => [team.team_number, team]));
    const districtMap = new Map<string, { key: string; abbreviation: string; displayName: string }>();

    for (const event of events) {
      if (!event.district) continue;
      districtMap.set(event.district.key, {
        key: event.district.key,
        abbreviation: event.district.abbreviation,
        displayName: event.district.display_name,
      });
    }

    const eventRows = await mapWithConcurrency(events, MAX_CONCURRENCY, async (event) => {
      const [oprs, matches] = await Promise.all([
        getEventOprs(event.key).catch(() => null),
        getEventMatches(event.key).catch(() => null),
      ]);
      const filtered = matches ? computeFilteredOpr(matches) : null;
      return { event, oprs, filtered };
    });

    const aggregates = new Map<number, TeamAggregate>();
    let eventsWithOpr = 0;
    let eventsWithFilteredOpr = 0;
    let qualificationMatches = 0;
    let removedOutlierMatches = 0;

    for (const { event, oprs, filtered } of eventRows) {
      const date = event.end_date || event.start_date || `${year}-01-01`;
      const hasRawOpr = Boolean(oprs?.oprs && Object.keys(oprs.oprs).length > 0);
      const hasFilteredOpr = Boolean(filtered && Object.keys(filtered.oprs).length > 0);

      if (hasRawOpr) eventsWithOpr += 1;
      if (hasFilteredOpr) eventsWithFilteredOpr += 1;
      if (filtered) {
        qualificationMatches += filtered.qualificationMatchCount;
        removedOutlierMatches += filtered.removedMatchCount;
      }

      if (oprs?.oprs) {
        for (const [teamKey, value] of Object.entries(oprs.oprs)) {
          if (!Number.isFinite(value)) continue;
          const teamNumber = teamNumberFromKey(teamKey);
          const aggregate = aggregates.get(teamNumber) ?? { values: [], filteredValues: [], districtKeys: new Set<string>() };
          aggregate.values.push({ value, eventKey: event.key, eventName: event.name, date });
          if (event.district?.key) aggregate.districtKeys.add(event.district.key);
          aggregates.set(teamNumber, aggregate);
        }
      }

      if (filtered?.oprs) {
        for (const [teamKey, value] of Object.entries(filtered.oprs)) {
          if (!Number.isFinite(value)) continue;
          const teamNumber = teamNumberFromKey(teamKey);
          const aggregate = aggregates.get(teamNumber) ?? { values: [], filteredValues: [], districtKeys: new Set<string>() };
          aggregate.filteredValues.push({ value, eventKey: event.key, eventName: event.name, date });
          if (event.district?.key) aggregate.districtKeys.add(event.district.key);
          aggregates.set(teamNumber, aggregate);
        }
      }
    }

    const rows = Array.from(aggregates.entries())
      .filter(([, aggregate]) => aggregate.values.length > 0)
      .map(([teamNumber, aggregate]) => {
        const ordered = [...aggregate.values].sort((a, b) => a.date.localeCompare(b.date) || a.eventKey.localeCompare(b.eventKey));
        const filteredOrdered = [...aggregate.filteredValues].sort((a, b) => a.date.localeCompare(b.date) || a.eventKey.localeCompare(b.eventKey));
        const latest = ordered[ordered.length - 1];
        const peak = Math.max(...ordered.map((item) => item.value));
        const average = ordered.reduce((sum, item) => sum + item.value, 0) / ordered.length;
        const filteredAverage = filteredOrdered.length
          ? filteredOrdered.reduce((sum, item) => sum + item.value, 0) / filteredOrdered.length
          : null;
        const meta = teamMeta.get(teamNumber);

        return {
          teamNumber,
          nickname: meta?.nickname ?? meta?.name ?? `Team ${teamNumber}`,
          city: meta?.city ?? null,
          stateProv: meta?.state_prov ?? null,
          country: meta?.country ?? null,
          peakOpr: peak,
          averageOpr: average,
          latestOpr: latest.value,
          filteredOpr: filteredAverage,
          filteredEventCount: filteredOrdered.length,
          latestEventKey: latest.eventKey,
          latestEventName: latest.eventName,
          latestEventDate: latest.date,
          eventCount: ordered.length,
          districtKeys: Array.from(aggregate.districtKeys).sort(),
          oprValues: ordered.map((item) => ({
            value: item.value,
            eventKey: item.eventKey,
            eventName: item.eventName,
            date: item.date,
          })),
        };
      });

    rows.sort((a, b) => b.peakOpr - a.peakOpr || a.teamNumber - b.teamNumber);

    const districts = Array.from(districtMap.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName) || a.key.localeCompare(b.key),
    );

    return NextResponse.json(
      {
        year,
        generatedAt: new Date().toISOString(),
        eventCount: events.length,
        excludedOffseasonEventCount: allEvents.length - events.length,
        eventsWithOpr,
        eventsWithFilteredOpr,
        qualificationMatches,
        removedOutlierMatches,
        teamCount: rows.length,
        districts,
        teams: rows,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not build the team OPR leaderboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
