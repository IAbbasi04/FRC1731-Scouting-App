"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { ArrowDownUp, ExternalLink } from "lucide-react";
import type { EventDashboard, EventDashboardTeam, TbaMatch } from "@/types/frc";

type SortKey = "rank" | "teamNumber" | "epa" | "opr" | "dpr" | "ccwm";

function metric(value: number | null, digits = 1) {
  return value === null ? "—" : value.toFixed(digits);
}

function record(team: EventDashboardTeam) {
  if (!team.record) return "—";
  return `${team.record.wins}-${team.record.losses}-${team.record.ties}`;
}

function matchLabel(match: TbaMatch) {
  if (match.comp_level === "qm") return `Q${match.match_number}`;
  return `${match.comp_level.toUpperCase()} ${match.set_number}-${match.match_number}`;
}

function allianceTeams(teamKeys: string[]) {
  return teamKeys.map((key) => key.replace(/^frc/, "")).join(" · ");
}

export function EventLookup() {
  const [eventKey, setEventKey] = useState("");
  const [dashboard, setDashboard] = useState<EventDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [descending, setDescending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!eventKey.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/events/${eventKey.trim()}/dashboard`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load event dashboard.");
      setDashboard(data);
    } catch (err) {
      setDashboard(null);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  const sortedTeams = useMemo(() => {
    if (!dashboard) return [];
    const copy = [...dashboard.teams];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null) return 1;
      if (bv === null) return -1;
      const difference = Number(av) - Number(bv);
      return descending ? -difference : difference;
    });
    return copy;
  }, [dashboard, sortKey, descending]);

  const completedMatches = dashboard?.matches.filter(
    (match) => match.alliances.red.score >= 0 && match.alliances.blue.score >= 0,
  ) ?? [];
  const upcomingMatches = dashboard?.matches.filter(
    (match) => match.alliances.red.score < 0 || match.alliances.blue.score < 0,
  ) ?? [];

  function chooseSort(next: SortKey) {
    if (sortKey === next) setDescending((value) => !value);
    else {
      setSortKey(next);
      setDescending(next !== "rank" && next !== "teamNumber");
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="flex max-w-2xl flex-col gap-3 rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/90 p-5 shadow-lg shadow-blue-950/20 sm:flex-row">
        <input
          value={eventKey}
          onChange={(event) => setEventKey(event.target.value)}
          aria-label="TBA event key"
          className="min-w-0 flex-1 rounded-xl border border-blue-300/20 bg-[#07111f] px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-[#0b5fff] focus:ring-2 focus:ring-[#0b5fff]/20"
          placeholder="e.g. 2026vahay"
        />
        <button disabled={loading || !eventKey.trim()} className="rounded-xl bg-[#ffd84d] px-5 py-3 font-semibold text-[#07111f] hover:bg-yellow-300 disabled:opacity-50">
          {loading ? "Building dashboard…" : "Load event"}
        </button>
      </form>

      {error ? <p className="rounded-xl border border-red-400/30 bg-red-950/30 p-4 text-sm text-red-200">{error}</p> : null}

      {dashboard ? (
        <>
          <section className="rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#0d1b2e] to-[#0b5fff]/10 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#ffd84d]">{dashboard.event.key}</p>
                <h2 className="mt-2 text-3xl font-semibold text-white">{dashboard.event.name}</h2>
                <p className="mt-2 text-slate-400">
                  {[dashboard.event.city, dashboard.event.state_prov, dashboard.event.country].filter(Boolean).join(", ")}
                  {" · "}{dashboard.event.start_date} → {dashboard.event.end_date}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[['Teams', dashboard.teams.length], ['Played', completedMatches.length], ['Upcoming', upcomingMatches.length]].map(([label, value]) => (
                  <div key={String(label)} className="rounded-xl border border-blue-300/10 bg-[#07111f]/80 px-4 py-3">
                    <div className="text-2xl font-semibold text-white">{value}</div>
                    <div className="text-xs text-[#ffd84d]">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div><h2 className="text-xl font-semibold text-white">Team metrics</h2><p className="text-sm text-slate-500">TBA rankings/OPR plus Statbotics EPA. Click a heading to sort.</p></div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70">
              <table className="min-w-full text-sm">
                <thead className="bg-[#11243d] text-left text-slate-300">
                  <tr>
                    {([
                      ["rank", "Rank"], ["teamNumber", "Team"], ["epa", "EPA"], ["opr", "OPR"], ["dpr", "DPR"], ["ccwm", "CCWM"],
                    ] as Array<[SortKey, string]>).map(([key, label]) => (
                      <th key={key} className="px-4 py-3 font-medium">
                        <button onClick={() => chooseSort(key)} className="inline-flex items-center gap-1 hover:text-[#ffd84d]">{label}<ArrowDownUp size={13} /></button>
                      </th>
                    ))}
                    <th className="px-4 py-3 font-medium">Record</th>
                    <th className="px-4 py-3 font-medium">Team name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-400/10">
                  {sortedTeams.map((team) => (
                    <tr key={team.teamKey} className="bg-[#07111f]/30 hover:bg-[#0b5fff]/10">
                      <td className="px-4 py-3">{team.rank ?? "—"}</td>
                      <td className="px-4 py-3 font-mono font-semibold"><Link className="text-[#ffd84d] hover:text-yellow-200 hover:underline" href={`/teams/${team.teamNumber}?event=${dashboard.event.key}`}>{team.teamNumber}</Link></td>
                      <td className="px-4 py-3 font-medium text-blue-200">{metric(team.epa)}</td>
                      <td className="px-4 py-3">{metric(team.opr)}</td>
                      <td className="px-4 py-3">{metric(team.dpr)}</td>
                      <td className="px-4 py-3">{metric(team.ccwm)}</td>
                      <td className="px-4 py-3">{record(team)}</td>
                      <td className="px-4 py-3"><div>{team.nickname}</div><div className="text-xs text-slate-600">{[team.city, team.stateProv].filter(Boolean).join(", ")}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <MatchList title="Upcoming matches" matches={upcomingMatches.slice(0, 12)} />
            <MatchList title="Recent results" matches={[...completedMatches].reverse().slice(0, 12)} />
          </section>

          <p className="flex items-center gap-2 text-xs text-slate-600"><ExternalLink size={12} /> External metrics remain labeled by source; our future scouting-derived metrics will stay separate.</p>
        </>
      ) : null}
    </div>
  );
}

function MatchList({ title, matches }: { title: string; matches: TbaMatch[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70">
      <div className="border-b border-blue-400/10 bg-[#11243d] px-5 py-3"><h2 className="font-semibold text-[#ffd84d]">{title}</h2></div>
      {matches.length === 0 ? <p className="p-5 text-sm text-slate-500">No matches to show yet.</p> : (
        <div className="divide-y divide-blue-400/10">
          {matches.map((match) => (
            <div key={match.key} className="grid grid-cols-[70px_1fr_auto] items-center gap-3 px-5 py-3 text-sm hover:bg-[#0b5fff]/5">
              <div className="font-medium text-white">{matchLabel(match)}</div>
              <div className="space-y-1 text-slate-400"><div><span className="mr-2 text-red-300">RED</span>{allianceTeams(match.alliances.red.team_keys)}</div><div><span className="mr-2 text-blue-300">BLUE</span>{allianceTeams(match.alliances.blue.team_keys)}</div></div>
              <div className="text-right font-mono text-slate-200"><div>{match.alliances.red.score >= 0 ? match.alliances.red.score : "—"}</div><div>{match.alliances.blue.score >= 0 ? match.alliances.blue.score : "—"}</div></div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
