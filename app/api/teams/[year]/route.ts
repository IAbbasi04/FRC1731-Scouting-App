import { NextResponse } from "next/server";
import { getEventOprs, getEventsForYear, getTeamsForYearPage } from "@/lib/tba";

export const maxDuration = 60;

const MIN_YEAR = 1992;
const MAX_CONCURRENCY = 12;

type TeamAggregate = {
  values: Array<{ value: number; eventKey: string; eventName: string; date: string }>;
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

    const [events, teams] = await Promise.all([getEventsForYear(year), loadYearTeams(year)]);
    const teamMeta = new Map(teams.map((team) => [team.team_number, team]));

    const eventRows = await mapWithConcurrency(events, MAX_CONCURRENCY, async (event) => {
      const oprs = await getEventOprs(event.key).catch(() => null);
      return { event, oprs };
    });

    const aggregates = new Map<number, TeamAggregate>();
    let eventsWithOpr = 0;

    for (const { event, oprs } of eventRows) {
      if (!oprs?.oprs || Object.keys(oprs.oprs).length === 0) continue;
      eventsWithOpr += 1;
      const date = event.end_date || event.start_date || `${year}-01-01`;

      for (const [teamKey, value] of Object.entries(oprs.oprs)) {
        if (!Number.isFinite(value)) continue;
        const teamNumber = teamNumberFromKey(teamKey);
        const aggregate = aggregates.get(teamNumber) ?? { values: [] };
        aggregate.values.push({ value, eventKey: event.key, eventName: event.name, date });
        aggregates.set(teamNumber, aggregate);
      }
    }

    const rows = Array.from(aggregates.entries()).map(([teamNumber, aggregate]) => {
      const ordered = [...aggregate.values].sort((a, b) => a.date.localeCompare(b.date) || a.eventKey.localeCompare(b.eventKey));
      const latest = ordered[ordered.length - 1];
      const peak = Math.max(...ordered.map((item) => item.value));
      const average = ordered.reduce((sum, item) => sum + item.value, 0) / ordered.length;
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
        latestEventKey: latest.eventKey,
        latestEventName: latest.eventName,
        latestEventDate: latest.date,
        eventCount: ordered.length,
      };
    });

    rows.sort((a, b) => b.peakOpr - a.peakOpr || a.teamNumber - b.teamNumber);

    return NextResponse.json(
      {
        year,
        generatedAt: new Date().toISOString(),
        eventCount: events.length,
        eventsWithOpr,
        teamCount: rows.length,
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
