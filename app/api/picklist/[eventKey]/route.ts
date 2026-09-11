import { NextResponse } from "next/server";
import { getEvent, getEventOprs, getEventRankings, getEventTeams } from "@/lib/tba";

function teamNumberFromKey(teamKey: string) {
  return Number(teamKey.replace(/^frc/, ""));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventKey: string }> },
) {
  try {
    const { eventKey } = await params;
    const normalized = eventKey.trim().toLowerCase();
    const [event, teams, rankings, oprs] = await Promise.all([
      getEvent(normalized),
      getEventTeams(normalized),
      getEventRankings(normalized).catch(() => null),
      getEventOprs(normalized).catch(() => null),
    ]);

    const rankByTeam = new Map(
      (rankings?.rankings ?? []).map((row) => [teamNumberFromKey(row.team_key), row.rank]),
    );

    const rows = teams
      .map((team) => ({
        teamNumber: team.team_number,
        teamKey: team.key,
        nickname: team.nickname ?? team.name,
        city: team.city,
        stateProv: team.state_prov,
        rank: rankByTeam.get(team.team_number) ?? null,
        opr: oprs?.oprs?.[team.key] ?? null,
      }))
      .sort((a, b) => {
        if (a.opr === null && b.opr === null) return a.teamNumber - b.teamNumber;
        if (a.opr === null) return 1;
        if (b.opr === null) return -1;
        return b.opr - a.opr || a.teamNumber - b.teamNumber;
      });

    return NextResponse.json({
      event: {
        key: event.key,
        name: event.name,
        year: event.year,
        city: event.city,
        stateProv: event.state_prov,
      },
      teams: rows,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load pick-list data.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
