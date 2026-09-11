import {
  getEvent,
  getEventMatches,
  getEventOprs,
  getEventRankings,
  getEventTeams,
} from "@/lib/tba";
import { getStatboticsTeamEvent } from "@/lib/statbotics";
import type { EventDashboard, EventDashboardTeam } from "@/types/frc";

function teamNumberFromKey(teamKey: string) {
  return Number(teamKey.replace(/^frc/, ""));
}

export async function getEventDashboard(eventKey: string): Promise<EventDashboard> {
  const [event, teams, rankings, matches, oprs] = await Promise.all([
    getEvent(eventKey),
    getEventTeams(eventKey),
    getEventRankings(eventKey),
    getEventMatches(eventKey),
    getEventOprs(eventKey),
  ]);

  const rankingByTeam = new Map(
    (rankings.rankings ?? []).map((row) => [teamNumberFromKey(row.team_key), row]),
  );

  const epaEntries = await Promise.all(
    teams.map(async (team) => {
      try {
        const data = await getStatboticsTeamEvent(team.team_number, eventKey);
        return [team.team_number, data] as const;
      } catch {
        return [team.team_number, null] as const;
      }
    }),
  );
  const epaByTeam = new Map(epaEntries);

  const teamRows: EventDashboardTeam[] = teams.map((team) => {
    const ranking = rankingByTeam.get(team.team_number);
    const epa = epaByTeam.get(team.team_number);
    return {
      teamNumber: team.team_number,
      teamKey: team.key,
      nickname: team.nickname ?? team.name,
      city: team.city,
      stateProv: team.state_prov,
      rank: ranking?.rank ?? null,
      record: ranking?.record ?? null,
      opr: oprs?.oprs?.[team.key] ?? null,
      dpr: oprs?.dprs?.[team.key] ?? null,
      ccwm: oprs?.ccwms?.[team.key] ?? null,
      epa: epa?.epa?.total_points?.mean ?? null,
      epaAuto: epa?.epa?.breakdown?.auto_points ?? null,
      epaTeleop: epa?.epa?.breakdown?.teleop_points ?? null,
      epaEndgame: epa?.epa?.breakdown?.endgame_points ?? null,
    };
  });

  const sortedMatches = [...matches].sort((a, b) => {
    if (a.comp_level !== b.comp_level) return a.comp_level.localeCompare(b.comp_level);
    if (a.set_number !== b.set_number) return a.set_number - b.set_number;
    return a.match_number - b.match_number;
  });

  return {
    event,
    teams: teamRows,
    rankings: rankings.rankings ?? [],
    matches: sortedMatches,
  };
}
