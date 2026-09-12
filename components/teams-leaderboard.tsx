"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCw, Search, Trophy, X } from "lucide-react";

type SortMetric = "peakOpr" | "averageOpr" | "latestOpr" | "filteredOpr";
type DistrictFilter = "all" | "none" | string;

type DistrictOption = {
  key: string;
  abbreviation: string;
  displayName: string;
};

type OprPoint = {
  value: number;
  eventKey: string;
  eventName: string;
  date: string;
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
  filteredOpr: number | null;
  filteredEventCount: number;
  latestEventKey: string;
  latestEventName: string;
  latestEventDate: string;
  eventCount: number;
  districtKeys: string[];
  oprValues: OprPoint[];
};

type LeaderboardResponse = {
  year: number;
  generatedAt: string;
  eventCount: number;
  excludedOffseasonEventCount: number;
  eventsWithOpr: number;
  eventsWithFilteredOpr: number;
  qualificationMatches: number;
  removedOutlierMatches: number;
  teamCount: number;
  districts: DistrictOption[];
  teams: TeamRow[];
};

const PAGE_SIZE = 100;
const MAX_PLOT_TEAMS = 6;

const METRICS: Array<{ key: SortMetric; label: string; description: string }> = [
  { key: "peakOpr", label: "Peak OPR", description: "Best official-event OPR" },
  { key: "averageOpr", label: "Average OPR", description: "Mean official-event OPR" },
  { key: "latestOpr", label: "Latest OPR", description: "Most recent official-event OPR" },
  { key: "filteredOpr", label: "Filtered OPR", description: "Mean recomputed OPR after match outlier removal" },
];

function formatOpr(value: number | null) {
  return value !== null && Number.isFinite(value) ? value.toFixed(1) : "—";
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * q;
  const base = Math.floor(position);
  const rest = position - base;
  const next = sorted[base + 1];
  return next === undefined ? sorted[base] : sorted[base] + rest * (next - sorted[base]);
}

function boxStats(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    q1: quantile(sorted, 0.25),
    median: quantile(sorted, 0.5),
    q3: quantile(sorted, 0.75),
    max: sorted[sorted.length - 1],
  };
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
  const [plotTeams, setPlotTeams] = useState<number[]>([]);

  async function loadLeaderboard(selectedYear: number, force = false) {
    setLoading(true);
    setMessage(null);
    setPage(1);
    setPlotTeams([]);
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
    return [...rows].sort((a, b) => {
      const aValue = a[sortMetric];
      const bValue = b[sortMetric];
      if (aValue === null && bValue === null) return a.teamNumber - b.teamNumber;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      return bValue - aValue || a.teamNumber - b.teamNumber;
    });
  }, [data, districtFilter, search, sortMetric]);

  useEffect(() => {
    setPage(1);
  }, [search, sortMetric, districtFilter]);

  const selectedTeams = useMemo(() => {
    if (!data) return [];
    const selected = new Set(plotTeams);
    return data.teams.filter((team) => selected.has(team.teamNumber));
  }, [data, plotTeams]);

  function togglePlotTeam(teamNumber: number) {
    setPlotTeams((current) => {
      if (current.includes(teamNumber)) return current.filter((value) => value !== teamNumber);
      if (current.length >= MAX_PLOT_TEAMS) return current;
      return [...current, teamNumber];
    });
  }

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
              <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="min-h-11 w-full rounded-xl border border-blue-300/20 bg-[#07111f] px-3 py-2.5 text-white outline-none focus:border-[#0b5fff]">
                {years.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-300">District</span>
              <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)} disabled={!data} className="min-h-11 w-full rounded-xl border border-blue-300/20 bg-[#07111f] px-3 py-2.5 text-white outline-none focus:border-[#0b5fff] disabled:opacity-50">
                <option value="all">All districts</option>
                {data?.districts.map((district) => <option key={district.key} value={district.key}>{district.displayName} ({district.abbreviation.toUpperCase()})</option>)}
                <option value="none">No district</option>
              </select>
            </label>

            <label className="min-w-0 space-y-2 text-sm">
              <span className="font-medium text-slate-300">Search teams</span>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Team number, name, city, country…" className="min-h-11 w-full rounded-xl border border-blue-300/20 bg-[#07111f] py-2.5 pl-9 pr-3 text-white outline-none placeholder:text-slate-700 focus:border-[#0b5fff]" />
              </div>
            </label>
          </div>

          <button type="button" onClick={() => void loadLeaderboard(year, true)} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-[#ffd84d]/40 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh data
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {METRICS.map((metric) => {
            const active = sortMetric === metric.key;
            return (
              <button key={metric.key} type="button" onClick={() => setSortMetric(metric.key)} className={`rounded-xl border p-3 text-left transition ${active ? "border-[#ffd84d]/45 bg-[#ffd84d]/10" : "border-blue-300/15 bg-[#07111f]/55 hover:border-blue-300/30"}`}>
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
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Teams with OPR" value={data.teamCount.toLocaleString()} />
            <StatCard label="Official events with OPR" value={`${data.eventsWithOpr}/${data.eventCount}`} />
            <StatCard label="Outlier matches removed" value={`${data.removedOutlierMatches}/${data.qualificationMatches}`} />
            <StatCard label="Current view" value={`${filtered.length.toLocaleString()} teams`} />
          </section>

          <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-white"><BarChart3 size={18} /><h2 className="font-bold">OPR spread comparison</h2></div>
                <p className="mt-1 text-sm text-slate-500">Select up to {MAX_PLOT_TEAMS} teams from the table. Each box shows that team’s event-by-event OPR distribution for the season.</p>
              </div>
              {plotTeams.length ? <button type="button" onClick={() => setPlotTeams([])} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-blue-300/15 px-3 text-sm font-semibold text-slate-300"><X size={15} /> Clear</button> : null}
            </div>
            {selectedTeams.length ? <BoxWhiskerPlot teams={selectedTeams} /> : <div className="mt-4 rounded-xl border border-dashed border-blue-300/15 px-4 py-8 text-center text-sm text-slate-600">Use the Plot buttons in the leaderboard to compare team consistency.</div>}
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
                    <th className="px-3 py-3 text-right sm:px-4">Filtered</th>
                    <th className="hidden px-3 py-3 text-right md:table-cell sm:px-4">Events</th>
                    <th className="px-3 py-3 text-center sm:px-4">Plot</th>
                    <th className="hidden px-3 py-3 lg:table-cell sm:px-4">Latest event</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-400/10">
                  {visible.map((team, localIndex) => {
                    const rank = (page - 1) * PAGE_SIZE + localIndex + 1;
                    const isUs = team.teamNumber === 1731;
                    const selected = plotTeams.includes(team.teamNumber);
                    return (
                      <tr key={team.teamNumber} className={isUs ? "bg-[#ffd84d]/5" : "hover:bg-[#0b5fff]/5"}>
                        <td className="px-3 py-3 text-center sm:px-4"><span className={`inline-flex min-w-9 items-center justify-center gap-1 font-bold ${rank <= 3 ? "text-[#ffd84d]" : "text-slate-400"}`}>{rank === 1 ? <Trophy size={14} /> : null}{rank}</span></td>
                        <td className="px-3 py-3 sm:px-4">
                          <Link href={`/teams/${team.teamNumber}`} className="group block min-w-44">
                            <div className="flex items-baseline gap-2"><span className="text-base font-bold text-white group-hover:text-[#ffd84d]">{team.teamNumber}</span>{isUs ? <span className="rounded-full border border-[#ffd84d]/30 bg-[#ffd84d]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#ffd84d]">US</span> : null}</div>
                            <div className="max-w-64 truncate text-xs text-slate-400">{team.nickname}</div>
                            <div className="max-w-64 truncate text-[11px] text-slate-600">{[team.city, team.stateProv, team.country].filter(Boolean).join(", ") || "Location unavailable"}</div>
                          </Link>
                        </td>
                        <MetricCell value={team.peakOpr} active={sortMetric === "peakOpr"} />
                        <MetricCell value={team.averageOpr} active={sortMetric === "averageOpr"} />
                        <MetricCell value={team.latestOpr} active={sortMetric === "latestOpr"} />
                        <MetricCell value={team.filteredOpr} active={sortMetric === "filteredOpr"} />
                        <td className="hidden px-3 py-3 text-right text-slate-400 md:table-cell sm:px-4">{team.eventCount}</td>
                        <td className="px-3 py-3 text-center sm:px-4"><button type="button" onClick={() => togglePlotTeam(team.teamNumber)} disabled={!selected && plotTeams.length >= MAX_PLOT_TEAMS} className={`min-h-9 rounded-lg border px-3 text-xs font-bold ${selected ? "border-[#ffd84d]/40 bg-[#ffd84d]/10 text-[#ffd84d]" : "border-blue-300/15 text-slate-400 hover:border-blue-300/30 disabled:opacity-30"}`}>{selected ? "Plotted" : "Plot"}</button></td>
                        <td className="hidden max-w-72 px-3 py-3 lg:table-cell sm:px-4"><div className="truncate text-slate-300">{team.latestEventName}</div><div className="text-[11px] text-slate-600">{team.latestEventKey} · {team.latestEventDate}</div></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {!visible.length ? <div className="px-4 py-10 text-center text-sm text-slate-500">No teams match those filters.</div> : null}
          </section>

          <div className="flex flex-col gap-3 rounded-xl border border-blue-400/10 bg-[#07111f]/45 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="text-slate-500">Showing {visible.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()} teams</div>
            <div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-blue-300/15 px-3 py-2 font-semibold text-slate-300 disabled:opacity-30">Previous</button><span className="min-w-24 text-center text-slate-500">Page {page} of {pageCount}</span><button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="rounded-lg border border-blue-300/15 px-3 py-2 font-semibold text-slate-300 disabled:opacity-30">Next</button></div>
          </div>

          <p className="px-1 text-xs leading-5 text-slate-600">Standard OPR comes from The Blue Alliance and excludes offseason events. Filtered OPR is recomputed from qualification matches after removing an entire match when either alliance score lies outside that event’s 1.5×IQR score fences, then averaging those filtered event OPRs across the season. The box plot uses the standard event OPR values: whiskers are min/max, the box is Q1–Q3, and the center line is the median.</p>
        </>
      ) : null}
    </div>
  );
}

function MetricCell({ value, active }: { value: number | null; active: boolean }) {
  return <td className={`px-3 py-3 text-right font-mono text-base font-semibold sm:px-4 ${active ? "bg-[#ffd84d]/5 text-[#ffd84d]" : "text-slate-200"}`}>{formatOpr(value)}</td>;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-blue-400/15 bg-[#0d1b2e]/70 px-4 py-3"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">{label}</div><div className="mt-1 text-xl font-bold text-white">{value}</div></div>;
}

function BoxWhiskerPlot({ teams }: { teams: TeamRow[] }) {
  const rows = teams.filter((team) => team.oprValues.length > 0).map((team) => ({ team, stats: boxStats(team.oprValues.map((item) => item.value)) }));
  if (!rows.length) return null;
  const minValue = Math.min(...rows.map((row) => row.stats.min));
  const maxValue = Math.max(...rows.map((row) => row.stats.max));
  const padding = Math.max(5, (maxValue - minValue) * 0.08);
  const domainMin = minValue - padding;
  const domainMax = maxValue + padding;
  const width = 920;
  const left = 105;
  const right = 30;
  const rowHeight = 62;
  const height = rows.length * rowHeight + 45;
  const scale = (value: number) => left + ((value - domainMin) / Math.max(1, domainMax - domainMin)) * (width - left - right);

  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-blue-300/10 bg-[#07111f]/55 p-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] w-full" role="img" aria-label="Box and whisker plot of selected teams' event OPR values">
        {rows.map(({ team, stats }, index) => {
          const y = 28 + index * rowHeight;
          return (
            <g key={team.teamNumber}>
              <text x={left - 14} y={y + 5} textAnchor="end" fontSize="14" fill="currentColor" className="text-slate-300">{team.teamNumber}</text>
              <line x1={scale(stats.min)} x2={scale(stats.max)} y1={y} y2={y} stroke="currentColor" className="text-slate-500" strokeWidth="2" />
              <line x1={scale(stats.min)} x2={scale(stats.min)} y1={y - 9} y2={y + 9} stroke="currentColor" className="text-slate-500" strokeWidth="2" />
              <line x1={scale(stats.max)} x2={scale(stats.max)} y1={y - 9} y2={y + 9} stroke="currentColor" className="text-slate-500" strokeWidth="2" />
              <rect x={scale(stats.q1)} y={y - 14} width={Math.max(2, scale(stats.q3) - scale(stats.q1))} height="28" rx="5" fill="currentColor" fillOpacity="0.16" stroke="currentColor" className="text-[#ffd84d]" strokeWidth="2" />
              <line x1={scale(stats.median)} x2={scale(stats.median)} y1={y - 14} y2={y + 14} stroke="currentColor" className="text-[#ffd84d]" strokeWidth="3" />
              <text x={width - right} y={y + 5} textAnchor="end" fontSize="12" fill="currentColor" className="text-slate-600">n={team.oprValues.length}</text>
            </g>
          );
        })}
        <line x1={left} x2={width - right} y1={height - 28} y2={height - 28} stroke="currentColor" className="text-slate-700" />
        <text x={left} y={height - 8} fontSize="11" fill="currentColor" className="text-slate-600">{domainMin.toFixed(0)}</text>
        <text x={width - right} y={height - 8} textAnchor="end" fontSize="11" fill="currentColor" className="text-slate-600">{domainMax.toFixed(0)} OPR</text>
      </svg>
    </div>
  );
}
