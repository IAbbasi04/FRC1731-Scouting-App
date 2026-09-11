"use client";

import type { EventDashboardTeam } from "@/types/frc";
import { useMetricPreferences } from "@/components/metric-preferences";

function value(number: number | null, digits = 1) {
  return number === null ? "—" : number.toFixed(digits);
}

export function TeamEventMetrics({ team }: { team: EventDashboardTeam }) {
  const { visibility } = useMetricPreferences();

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      <Metric label="Rank" value={team.rank?.toString() ?? "—"} source="TBA" />
      {visibility.epa ? <Metric label="EPA" value={value(team.epa)} source="Statbotics" /> : null}
      {visibility.opr ? <Metric label="OPR" value={value(team.opr)} source="TBA" /> : null}
      {visibility.dpr ? <Metric label="DPR" value={value(team.dpr)} source="TBA" /> : null}
      {visibility.ccwm ? <Metric label="CCWM" value={value(team.ccwm)} source="TBA" /> : null}
      {visibility.epa ? <Metric label="Auto EPA" value={value(team.epaAuto)} source="Statbotics" /> : null}
      {visibility.epa ? <Metric label="Teleop EPA" value={value(team.epaTeleop)} source="Statbotics" /> : null}
    </section>
  );
}

export function TeamEventSnapshot({ team, matchCount }: { team: EventDashboardTeam; matchCount: number }) {
  const { visibility } = useMetricPreferences();
  return (
    <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70 p-6">
      <h2 className="text-xl font-semibold text-[#ffd84d]">Event snapshot</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Snapshot label="Record" value={team.record ? `${team.record.wins}-${team.record.losses}-${team.record.ties}` : "—"} />
        {visibility.epa ? <Snapshot label="Endgame EPA" value={value(team.epaEndgame)} /> : null}
        <Snapshot label="Matches on schedule" value={matchCount.toString()} />
      </div>
    </section>
  );
}

function Metric({ label, value, source }: { label: string; value: string; source: string }) {
  return <div className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-4"><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="mt-2 text-2xl font-semibold text-white">{value}</div><div className="mt-2 text-xs text-[#ffd84d]/70">{source}</div></div>;
}

function Snapshot({ label, value }: { label: string; value: string }) {
  return <div><div className="text-sm text-slate-500">{label}</div><div className="mt-1 text-2xl font-semibold text-white">{value}</div></div>;
}
