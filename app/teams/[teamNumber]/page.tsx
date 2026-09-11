import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventDashboard } from "@/lib/event-dashboard";
import { TeamEventMetrics, TeamEventSnapshot } from "@/components/team-event-metrics";

export default async function TeamEventProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ teamNumber: string }>;
  searchParams: Promise<{ event?: string }>;
}) {
  const { teamNumber: rawTeamNumber } = await params;
  const { event } = await searchParams;
  const teamNumber = Number(rawTeamNumber);

  if (!Number.isFinite(teamNumber) || !event) notFound();

  const dashboard = await getEventDashboard(event);
  const team = dashboard.teams.find((row) => row.teamNumber === teamNumber);
  if (!team) notFound();

  const teamMatches = dashboard.matches.filter((match) =>
    [...match.alliances.red.team_keys, ...match.alliances.blue.team_keys].includes(team.teamKey),
  );

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div>
        <Link href="/events" className="text-sm text-blue-300 hover:text-[#ffd84d]">← Events</Link>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-[#ffd84d]">{dashboard.event.name}</p>
        <h1 className="mt-2 text-4xl font-semibold text-white">Team {team.teamNumber} · {team.nickname}</h1>
        <p className="mt-2 text-slate-400">{[team.city, team.stateProv].filter(Boolean).join(", ")}</p>
      </div>

      <TeamEventMetrics team={team} />
      <TeamEventSnapshot team={team} matchCount={teamMatches.length} />

      <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70">
        <div className="border-b border-blue-400/10 bg-[#11243d] px-5 py-3"><h2 className="font-semibold text-[#ffd84d]">Matches</h2></div>
        <div className="divide-y divide-blue-400/10">
          {teamMatches.map((match) => {
            const isRed = match.alliances.red.team_keys.includes(team.teamKey);
            const alliance = isRed ? match.alliances.red : match.alliances.blue;
            const opponent = isRed ? match.alliances.blue : match.alliances.red;
            return (
              <div key={match.key} className="grid gap-2 px-5 py-4 text-sm hover:bg-[#0b5fff]/5 sm:grid-cols-[90px_1fr_auto] sm:items-center">
                <div className="font-medium text-white">{match.comp_level === "qm" ? `Q${match.match_number}` : `${match.comp_level.toUpperCase()} ${match.set_number}-${match.match_number}`}</div>
                <div className="text-slate-400">{isRed ? "Red" : "Blue"} · with {alliance.team_keys.filter((key) => key !== team.teamKey).map((key) => key.replace(/^frc/, "")).join(", ")} · vs {opponent.team_keys.map((key) => key.replace(/^frc/, "")).join(", ")}</div>
                <div className="font-mono text-slate-200">{alliance.score >= 0 ? `${alliance.score}–${opponent.score}` : "Upcoming"}</div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
