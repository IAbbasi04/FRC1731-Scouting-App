"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Trophy } from "lucide-react";

type SortMetric = "peakOpr" | "averageOpr" | "latestOpr";
type DistrictFilter = "all" | "none" | string;

type DistrictOption = {
  key: string;
  abbreviation: string;
  displayName: string;
};

type TeamRow = {
  teamNumber: number;
  nickname: string;
  city: string | null;
  stateProv: string | null;
  country: string | null;
  peakOpr: number;
  averageOpr: number;
  latestOpr: number;
  latestEventKey: string;
  latestEventName: string;
  latestEventDate: string;
  eventCount: number;
  districtKeys: string[];
};

type LeaderboardResponse = {
  year: number;
  generatedAt: string;
  eventCount: number;
  excludedOffseasonEventCount: number;
  eventsWithOpr: number;
  teamCount: number;
  districts: DistrictOption[];
  teams: TeamRow[];
};

const PAGE_SIZE = 100;

const METRICS: Array<{ key: SortMetric; label: string; description: string }> = [
  { key: "peakOpr", label: "Peak OPR", description: "Best event OPR that season" },
  { key: "averageOpr", label: "Average OPR", description: "Mean OPR across events" },
  { key: "latestOpr", label: "Latest OPR", description: "Most recent event OPR" },
];

function formatOpr(value: number) {
  return Number.isFinite(value) ? value.toFixed(1) : "—";
}

export function TeamsLeaderboard() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [sortMetric, setSortMetric] = useState<SortMetric>("peakOpr");
  const [districtFilter, setDistrictFilter] = useState<DistrictFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function loadLeaderboard(selectedYear: number, force = false) {
    setLoading(true);
    setMessage(null);
    setPage(1);
    try {
      const response = await fetch(`/api/teams/${selectedYear}${force ? `?refresh=${Date.now()}` : ""}`);
      const payload = (await response.json()) as LeaderboardResponse | { error?: string };
      if (!response.ok || !("teams" in payload)) {
        throw new Error("error" in payload && payload.error ? payload.error : "Could not load team rankings.");
      }
      setData(payload);
      setDistrictFilter("all");
    } catch (error) {
      setData(null);
      setMessage(error instanceof Error ? error.message : "Could not load team rankings.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLeaderboard(year);
  }, [year]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLowerCase();

    const districtRows = data.teams.filter((team) => {
      if (districtFilter === "all") return true;
      if (districtFilter === "none") return team.districtKeys.length === 0;
      return team.districtKeys.includes(districtFilter);
    });

    const rows = query
      ? districtRows.filter((team) =>
          [team.teamNumber, team.nickname, team.city, team.stateProv, team.country]
            .filter((value) => value !== null && value !== undefined)
            .some((value) => String(value).toLowerCase().includes(query)),
        )
      : districtRows;

    return [...rows].sort((a, b) => b[sortMetric] - a[sortMetric] || a.teamNumber - b.teamNumber);
  }, [data, districtFilter, search, sortMetric]);

  useEffect(() => {
    setPage(1);
  }, [search, sortMetric, districtFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const years = Array.from({ length: currentYear - 1992 + 1 }, (_, index) => currentYear - index);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/85 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-[auto_minmax(12rem,18rem)_minmax(16rem,1fr)] sm:items-end">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-300">Season</span>
              <select
                value={year}
                onChange={(event) => setYear(Number(event.target.value))}
                className="min-h-11 w-full rounded-xl border border-blue-300/20 bg-[#07111f] px-3 py-2.5 text-white outline-none focus:border-[#0b5fff]"
              >
                {years.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-300">District</span>
              <select
                value={districtFilter}
                onChange={(event) => setDistrictFilter(event.target.value)}
                disabled={!data}
                className="min-h-11 w-full rounded-xl border border-blue-300/20 bg-[#07111f] px-3 py-2.5 text-white outline-none focus:border-[#0b5fff] disabled:opacity-50"
              >
                <option value="all">All districts</option>
                {data?.districts.map((district) => (
                  <option key={district.key} value={district.key}>
                    {district.displayName} ({district.abbreviation.toUpperCase()})
                  </option>
                ))}
                <option value="none">No district</option>
              </select>
            </label>

            <label className="min-w-0 space-y-2 text-sm">
              <span className="font-medium text-slate-300">Search teams</span>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Team number, name, city, country…"
                  className="min-h-11 w-full rounded-xl border border-blue-300/20 bg-[#07111f] py-2.5 pl-9 pr-3 text-white outline-none placeholder:text-slate-700 focus:border-[#0b5fff]"
                />
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void loadLeaderboard(year, true)}
            disabled={loading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-[#ffd84d]/40 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh data
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {METRICS.map((metric) => {
            const active = sortMetric === metric.key;
            return (
              <button
                key={metric.key}
                type="button"
                onClick={() => setSortMetric(metric.key)}
                className={`rounded-xl border p-3 text-left transition ${active ? "border-[#ffd84d]/45 bg-[#ffd84d]/10" : "border-blue-300/15 bg-[#07111f]/55 hover:border-blue-300/30"}`}
              >
                <div className={`font-semibold ${active ? "text-[#ffd84d]" : "text-slate-200"}`}>{metric.label}</div>
                <div className="mt-1 text-xs text-slate-500">{metric.description}</div>
              </button>
            );
          })}
        </div>
      </section>

      {message ? <div className="rounded-xl border border-red-300/20 bg-red-400/5 px-4 py-3 text-sm text-red-200">{message}</div> : null}

      {loading && !data ? (
        <div className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70 px-5 py-12 text-center text-slate-400">
          <RefreshCw size={22} className="mx-auto mb-3 animate-spin" />
          Building the {year} global OPR leaderboard…
        </div>
      ) : null}

      {data ? (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <StatCard label="Teams with OPR" value={data.teamCount.toLocaleString()} />
            <StatCard label="Official events with OPR" value={`${data.eventsWithOpr}/${data.eventCount}`} />
            <StatCard label="Current view" value={`${filtered.length.toLocaleString()} teams`} />
          </section>

          <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-[#11243d] text-left text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
                  <tr>
                    <th className="px-3 py-3 text-center sm:px-4">Rank</th>
                    <th className="px-3 py-3 sm:px-4">Team</th>
                    <th className="px-3 py-3 text-right sm:px-4">Peak</th>
                    <th className="px-3 py-3 text-right sm:px-4">Average</th>
                    <th className="px-3 py-3 text-right sm:px-4">Latest</th>
                    <th className="hidden px-3 py-3 text-right md:table-cell sm:px-4">Events</th>
                    <th className="hidden px-3 py-3 lg:table-cell sm:px-4">Latest event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-400/10">
                  {visible.map((team, localIndex) => {
                    const rank = (page - 1) * PAGE_SIZE + localIndex + 1;
                    const isUs = team.teamNumber === 1731;
                    return (
                      <tr key={team.teamNumber} className={isUs ? "bg-[#ffd84d]/5" : "hover:bg-[#0b5fff]/5"}>
                        <td className="px-3 py-3 text-center sm:px-4">
                          <span className={`inline-flex min-w-9 items-center justify-center gap-1 font-bold ${rank <= 3 ? "text-[#ffd84d]" : "text-slate-400"}`}>
                            {rank === 1 ? <Trophy size={14} /> : null}{rank}
                          </span>
                        </td>
                        <td className="px-3 py-3 sm:px-4">
                          <Link href={`/teams/${team.teamNumber}`} className="group block min-w-44">
                            <div className="flex items-baseline gap-2">
                              <span className="text-base font-bold text-white group-hover:text-[#ffd84d]">{team.teamNumber}</span>
                              {isUs ? <span className="rounded-full border border-[#ffd84d]/30 bg-[#ffd84d]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#ffd84d]">US</span> : null}
                            </div>
                            <div className="max-w-64 truncate text-xs text-slate-400">{team.nickname}</div>
                            <div className="max-w-64 truncate text-[11px] text-slate-600">
                              {[team.city, team.stateProv, team.country].filter(Boolean).join(", ") || "Location unavailable"}
                            </div>
                          </Link>
                        </td>
                        <MetricCell value={team.peakOpr} active={sortMetric === "peakOpr"} />
                        <MetricCell value={team.averageOpr} active={sortMetric === "averageOpr"} />
                        <MetricCell value={team.latestOpr} active={sortMetric === "latestOpr"} />
                        <td className="hidden px-3 py-3 text-right text-slate-400 md:table-cell sm:px-4">{team.eventCount}</td>
                        <td className="hidden max-w-72 px-3 py-3 lg:table-cell sm:px-4">
                          <div className="truncate text-slate-300">{team.latestEventName}</div>
                          <div className="text-[11px] text-slate-600">{team.latestEventKey} · {team.latestEventDate}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!visible.length ? <div className="px-4 py-10 text-center text-sm text-slate-500">No teams match those filters.</div> : null}
          </section>

          <div className="flex flex-col gap-3 rounded-xl border border-blue-400/10 bg-[#07111f]/45 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-slate-500">
              Showing {visible.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()} teams
            </div>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-blue-300/15 px-3 py-2 font-semibold text-slate-300 disabled:opacity-30">Previous</button>
              <span className="min-w-24 text-center text-slate-500">Page {page} of {pageCount}</span>
              <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-lg border border-blue-300/15 px-3 py-2 font-semibold text-slate-300 disabled:opacity-30">Next</button>
            </div>
          </div>

          <p className="px-1 text-xs text-slate-600">
            OPR is sourced from The Blue Alliance event OPR tables. Offseason events are excluded. Peak is the best official-event value, Average is the arithmetic mean across official events with OPR, and Latest is the value from the most recent official event with OPR data. District filters are based on official district-event participation; “No district” contains teams with no district event in that season. Missing event OPRs are excluded rather than counted as zero.
          </p>
        </>
      ) : null}
    </div>
  );
}

function MetricCell({ value, active }: { value: number; active: boolean }) {
  return <td className={`px-3 py-3 text-right font-mono text-base font-semibold sm:px-4 ${active ? "bg-[#ffd84d]/5 text-[#ffd84d]" : "text-slate-200"}`}>{formatOpr(value)}</td>;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-blue-400/15 bg-[#0d1b2e]/70 px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</div>
      <div className="mt-1 text-xl font-bold text-white">{value}</div>
    </div>
  );
}
