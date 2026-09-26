import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamTradingCard } from "@/components/team-trading-card";
import { getEventDashboard } from "@/lib/event-dashboard";

const EVENT_KEY = "2026vaale1";

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
  const eventKey = event?.trim().toLowerCase() || EVENT_KEY;

  if (!Number.isFinite(teamNumber)) notFound();

  const dashboard = await getEventDashboard(eventKey);
  const team = dashboard.teams.find((row) => row.teamNumber === teamNumber);
  if (!team) notFound();

  const teamMatches = dashboard.matches.filter((match) =>
    [...match.alliances.red.team_keys, ...match.alliances.blue.team_keys].includes(team.teamKey),
  );

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/teams" className="text-sm font-semibold text-blue-300 hover:text-[#ffd84d]">← All Icebreaker teams</Link>
        <div className="font-mono text-xs text-slate-600">{eventKey}</div>
      </div>

      <TeamTradingCard eventKey={eventKey} team={team} matchCount={teamMatches.length} />

      <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70">
        <div className="border-b border-blue-400/10 bg-[#11243d] px-5 py-3">
          <h2 className="font-semibold text-[#ffd84d]">Official match schedule</h2>
          <p className="mt-1 text-xs text-slate-500">TBA schedule context, separate from the individual 1731 scouting reports above.</p>
        </div>
        <div className="divide-y divide-blue-400/10">
          {teamMatches.map((match) => {
            const isRed = match.alliances.red.team_keys.includes(team.teamKey);
            const alliance = isRed ? match.alliances.red : match.alliances.blue;
            const opponent = isRed ? match.alliances.blue : match.alliances.red;
            return (
              <div key={match.key} className="grid gap-2 px-5 py-4 text-sm hover:bg-[#0b5fff]/5 sm:grid-cols-[90px_1fr_auto] sm:items-center">
                <div className="font-medium text-white">{match.comp_level === "qm" ? `Q${match.match_number}` : `${match.comp_level.toUpperCase()} ${match.set_number}-${match.match_number}`}</div>
                <div className="text-slate-400">
                  <span className={isRed ? "text-red-300" : "text-blue-300"}>{isRed ? "Red" : "Blue"}</span>
                  {" · with "}
                  {alliance.team_keys.filter((key) => key !== team.teamKey).map((key) => key.replace(/^frc/, "")).join(", ")}
                  {" · vs "}
                  {opponent.team_keys.map((key) => key.replace(/^frc/, "")).join(", ")}
                </div>
                <div className="font-mono text-slate-200">{alliance.score >= 0 ? `${alliance.score}–${opponent.score}` : "Upcoming"}</div>
              </div>
            );
          })}
          {!teamMatches.length ? <div className="px-5 py-8 text-center text-sm text-slate-500">No official matches published for this team yet.</div> : null}
        </div>
      </section>
    </main>
  );
}
