import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventDashboard } from "@/lib/event-dashboard";

function value(number: number | null, digits = 1) {
  return number === null ? "—" : number.toFixed(digits);
}

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
        <Link href="/events" className="text-sm text-zinc-500 hover:text-zinc-200">← Events</Link>
        <p className="mt-6 text-sm uppercase tracking-[0.2em] text-zinc-500">{dashboard.event.name}</p>
        <h1 className="mt-2 text-4xl font-semibold">Team {team.teamNumber} · {team.nickname}</h1>
        <p className="mt-2 text-zinc-400">{[team.city, team.stateProv].filter(Boolean).join(", ")}</p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <Metric label="Rank" value={team.rank?.toString() ?? "—"} source="TBA" />
        <Metric label="EPA" value={value(team.epa)} source="Statbotics" />
        <Metric label="OPR" value={value(team.opr)} source="TBA" />
        <Metric label="DPR" value={value(team.dpr)} source="TBA" />
        <Metric label="CCWM" value={value(team.ccwm)} source="TBA" />
        <Metric label="Auto EPA" value={value(team.epaAuto)} source="Statbotics" />
        <Metric label="Teleop EPA" value={value(team.epaTeleop)} source="Statbotics" />
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-xl font-semibold">Event snapshot</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div><div className="text-sm text-zinc-500">Record</div><div className="mt-1 text-2xl font-semibold">{team.record ? `${team.record.wins}-${team.record.losses}-${team.record.ties}` : "—"}</div></div>
          <div><div className="text-sm text-zinc-500">Endgame EPA</div><div className="mt-1 text-2xl font-semibold">{value(team.epaEndgame)}</div></div>
          <div><div className="text-sm text-zinc-500">Matches on schedule</div><div className="mt-1 text-2xl font-semibold">{teamMatches.length}</div></div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-800">
        <div className="border-b border-zinc-800 bg-zinc-900 px-5 py-3"><h2 className="font-semibold">Matches</h2></div>
        <div className="divide-y divide-zinc-800">
          {teamMatches.map((match) => {
            const isRed = match.alliances.red.team_keys.includes(team.teamKey);
            const alliance = isRed ? match.alliances.red : match.alliances.blue;
            const opponent = isRed ? match.alliances.blue : match.alliances.red;
            return (
              <div key={match.key} className="grid gap-2 px-5 py-4 text-sm sm:grid-cols-[90px_1fr_auto] sm:items-center">
                <div className="font-medium">{match.comp_level === "qm" ? `Q${match.match_number}` : `${match.comp_level.toUpperCase()} ${match.set_number}-${match.match_number}`}</div>
                <div className="text-zinc-400">{isRed ? "Red" : "Blue"} · with {alliance.team_keys.filter((key) => key !== team.teamKey).map((key) => key.replace(/^frc/, "")).join(", ")} · vs {opponent.team_keys.map((key) => key.replace(/^frc/, "")).join(", ")}</div>
                <div className="font-mono">{alliance.score >= 0 ? `${alliance.score}–${opponent.score}` : "Upcoming"}</div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, source }: { label: string; value: string; source: string }) {
  return <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"><div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div><div className="mt-2 text-2xl font-semibold">{value}</div><div className="mt-2 text-xs text-zinc-600">{source}</div></div>;
}
