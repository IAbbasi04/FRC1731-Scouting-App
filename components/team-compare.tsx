"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import type { EventDashboard, EventDashboardTeam } from "@/types/frc";
import { useMetricPreferences } from "@/components/metric-preferences";

const metricConfig = [
  { key: "epa", label: "EPA" },
  { key: "opr", label: "OPR" },
  { key: "ccwm", label: "CCWM" },
  { key: "dpr", label: "DPR" },
] as const;

type MetricKey = (typeof metricConfig)[number]["key"];

function format(value: number | null) {
  return value === null ? "—" : value.toFixed(1);
}

function record(team: EventDashboardTeam) {
  if (!team.record) return "—";
  return `${team.record.wins}-${team.record.losses}-${team.record.ties}`;
}

function parseTeams(value: string) {
  return [...new Set(value.split(/[\s,]+/).map((item) => Number(item.trim())).filter((item) => Number.isInteger(item) && item > 0))].slice(0, 6);
}

export function TeamCompare() {
  const { visibility } = useMetricPreferences();
  const [eventKey, setEventKey] = useState("");
  const [teamInput, setTeamInput] = useState("1731");
  const [dashboard, setDashboard] = useState<EventDashboard | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const teamNumbers = parseTeams(teamInput);
    if (!eventKey.trim() || teamNumbers.length === 0) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventKey.trim()}/dashboard`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load event data.");
      setDashboard(data);
      setSelectedTeams(teamNumbers);
    } catch (err) {
      setDashboard(null);
      setSelectedTeams([]);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const teams = useMemo(() => {
    if (!dashboard) return [];
    return selectedTeams
      .map((number) => dashboard.teams.find((team) => team.teamNumber === number))
      .filter((team): team is EventDashboardTeam => Boolean(team));
  }, [dashboard, selectedTeams]);

  const missingTeams = useMemo(() => {
    if (!dashboard) return [];
    return selectedTeams.filter((number) => !dashboard.teams.some((team) => team.teamNumber === number));
  }, [dashboard, selectedTeams]);

  const visibleMetrics = metricConfig.filter((metric) => visibility[metric.key]);

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/90 p-5 md:grid-cols-[1fr_2fr_auto] md:items-end">
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-medium text-[#ffd84d]">Event key</span>
          <input value={eventKey} onChange={(e) => setEventKey(e.target.value)} placeholder="2026vahay" className="w-full rounded-xl border border-blue-300/20 bg-[#07111f] px-4 py-3 text-white outline-none focus:border-[#0b5fff]" />
        </label>
        <label className="space-y-2 text-sm text-slate-300">
          <span className="font-medium text-[#ffd84d]">Teams to compare</span>
          <input value={teamInput} onChange={(e) => setTeamInput(e.target.value)} placeholder="1731, 2363, 8592" className="w-full rounded-xl border border-blue-300/20 bg-[#07111f] px-4 py-3 text-white outline-none focus:border-[#0b5fff]" />
        </label>
        <button disabled={loading || !eventKey.trim() || parseTeams(teamInput).length === 0} className="rounded-xl bg-[#ffd84d] px-5 py-3 font-semibold text-[#07111f] hover:bg-yellow-300 disabled:opacity-50">
          {loading ? "Comparing…" : "Compare"}
        </button>
      </form>

      {error ? <div className="rounded-xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">{error}</div> : null}
      {missingTeams.length > 0 ? <div className="rounded-xl border border-yellow-300/20 bg-yellow-400/5 p-4 text-sm text-yellow-100">Not found at this event: {missingTeams.join(", ")}</div> : null}

      {dashboard && teams.length > 0 ? (
        <>
          <section className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#0d1b2e] to-[#0b5fff]/10 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ffd84d]">{dashboard.event.key}</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{dashboard.event.name}</h2>
            <p className="mt-2 text-sm text-slate-400">Comparing {teams.length} team{teams.length === 1 ? "" : "s"}. Public metric visibility follows the Metrics control in the header.</p>
          </section>

          <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <article key={team.teamNumber} className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/90 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/teams/${team.teamNumber}?event=${dashboard.event.key}`} className="text-2xl font-bold text-[#ffd84d] hover:underline">{team.teamNumber}</Link>
                    <h3 className="mt-1 font-semibold text-white">{team.nickname}</h3>
                    <p className="text-sm text-slate-500">{[team.city, team.stateProv].filter(Boolean).join(", ")}</p>
                  </div>
                  <div className="text-right"><div className="text-2xl font-semibold text-white">#{team.rank ?? "—"}</div><div className="text-xs text-slate-500">Rank</div></div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  {visibleMetrics.map((metric) => <Metric key={metric.key} label={metric.label} value={format(team[metric.key])} />)}
                  <Metric label="Record" value={record(team)} />
                </div>
              </article>
            ))}
          </section>

          {visibleMetrics.length > 0 ? (
            <section className="space-y-5">
              <div><h2 className="text-xl font-semibold text-white">Metric comparison</h2><p className="text-sm text-slate-500">Bars are scaled within the currently selected teams for each visible metric.</p></div>
              {visibleMetrics.map((metric) => <MetricBars key={metric.key} teams={teams} metricKey={metric.key} label={metric.label} />)}
            </section>
          ) : (
            <div className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70 p-5 text-sm text-slate-400">All public performance metrics are hidden. Use <span className="font-semibold text-[#ffd84d]">Metrics</span> in the header to turn one on.</div>
          )}

          <section className="overflow-x-auto rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70">
            <table className="min-w-full text-sm">
              <thead className="bg-[#11243d] text-slate-300"><tr><th className="px-4 py-3 text-left">Team</th><th className="px-4 py-3 text-right">Rank</th>{visibleMetrics.map((metric) => <th key={metric.key} className="px-4 py-3 text-right">{metric.label}</th>)}<th className="px-4 py-3 text-right">Record</th></tr></thead>
              <tbody className="divide-y divide-blue-400/10">
                {teams.map((team) => <tr key={team.teamNumber} className="hover:bg-[#0b5fff]/5"><td className="px-4 py-3 font-semibold text-[#ffd84d]">{team.teamNumber} <span className="font-normal text-slate-400">{team.nickname}</span></td><td className="px-4 py-3 text-right">{team.rank ?? "—"}</td>{visibleMetrics.map((metric) => <td key={metric.key} className="px-4 py-3 text-right">{format(team[metric.key])}</td>)}<td className="px-4 py-3 text-right">{record(team)}</td></tr>)}
              </tbody>
            </table>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-blue-300/10 bg-[#07111f]/70 p-3"><div className="text-xs uppercase tracking-wide text-slate-500">{label}</div><div className="mt-1 text-lg font-semibold text-white">{value}</div></div>;
}

function MetricBars({ teams, metricKey, label }: { teams: EventDashboardTeam[]; metricKey: MetricKey; label: string }) {
  const numeric = teams.map((team) => team[metricKey]).filter((value): value is number => value !== null);
  const max = numeric.length ? Math.max(...numeric.map((value) => Math.abs(value)), 1) : 1;

  return (
    <div className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-5">
      <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold text-[#ffd84d]">{label}</h3><span className="text-xs text-slate-600">Source: external metrics</span></div>
      <div className="space-y-3">
        {teams.map((team) => {
          const value = team[metricKey];
          const width = value === null ? 0 : Math.max((Math.abs(value) / max) * 100, 3);
          return (
            <div key={team.teamNumber} className="grid grid-cols-[64px_1fr_58px] items-center gap-3">
              <div className="font-mono font-semibold text-slate-300">{team.teamNumber}</div>
              <div className="h-8 overflow-hidden rounded-lg bg-[#07111f]"><div className="flex h-full items-center rounded-lg bg-gradient-to-r from-[#0b5fff] to-blue-400 px-2" style={{ width: `${width}%` }}><span className="truncate text-xs font-semibold text-white">{team.nickname}</span></div></div>
              <div className="text-right font-mono text-sm text-white">{format(value)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
