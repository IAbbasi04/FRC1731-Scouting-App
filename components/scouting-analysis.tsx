"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { BarChart3, Eye, EyeOff, RefreshCw } from "lucide-react";
import { getScoutingSeason, type GameField } from "@/config/scouting/seasons";

type CloudEntry = {
  _id: string;
  clientId: string;
  season: number;
  gameKey: string;
  eventKey: string;
  matchNumber: number;
  teamNumber: number;
  scoutName: string;
  createdAt: string;
  alliance?: "red" | "blue";
  autoStart?: { x: number; y: number };
  gameData: Record<string, string | number | boolean | null>;
  defense: "none" | "light" | "heavy";
  driverRating?: number;
  playedDefense?: boolean;
  defenseRating?: number;
  penalties: number;
  disabled: boolean;
  tipped: boolean;
  mechanicalIssue: boolean;
  notes: string;
  source: "manual" | "ai-video";
};

type TeamSummary = {
  teamNumber: number;
  entries: CloudEntry[];
};

type MetricKind = "number" | "percent" | "category";

type MetricResult = {
  value: number | null;
  display: string;
  detail?: string;
};

type MetricDefinition = {
  key: string;
  label: string;
  kind: MetricKind;
  result: (entries: CloudEntry[]) => MetricResult;
};

const EVENT_KEY = "2026vaale1";
const listEventEntries = makeFunctionReference<"query">("analysis:listEventEntries");

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function formatNumber(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function numericValues(entries: CloudEntry[], select: (entry: CloudEntry) => unknown) {
  return entries
    .map(select)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function numberMetric(entries: CloudEntry[], select: (entry: CloudEntry) => unknown): MetricResult {
  const values = numericValues(entries, select);
  const value = average(values);
  return { value, display: formatNumber(value), detail: `${values.length}/${entries.length} reports` };
}

function percentMetric(entries: CloudEntry[], select: (entry: CloudEntry) => unknown): MetricResult {
  const values = entries.map(select).filter((value): value is boolean => typeof value === "boolean");
  const value = values.length ? (values.filter(Boolean).length / values.length) * 100 : null;
  return {
    value,
    display: value === null ? "—" : `${Math.round(value)}%`,
    detail: `${values.length}/${entries.length} reports`,
  };
}

function categoryMetric(
  entries: CloudEntry[],
  select: (entry: CloudEntry) => unknown,
  labelForValue?: (value: string) => string,
): MetricResult {
  const values = entries.map(select).filter((value): value is string => typeof value === "string" && value.length > 0);
  if (!values.length) return { value: null, display: "—", detail: "no reports" };

  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const share = (top[1] / values.length) * 100;
  return {
    value: share,
    display: labelForValue ? labelForValue(top[0]) : top[0],
    detail: `${Math.round(share)}% of ${values.length} reports`,
  };
}

function towerPoints(value: unknown) {
  if (value === "level1") return 10;
  if (value === "level2") return 20;
  if (value === "level3") return 30;
  if (value === "none") return 0;
  return null;
}

function optionLabel(field: GameField, value: string) {
  return field.options?.find((option) => option.value === value)?.label ?? value;
}

function phaseLabel(field: GameField) {
  const prefix = field.phase === "auto" ? "Auto" : field.phase === "teleop" ? "Teleop" : "Endgame";
  return `${prefix} ${field.label}`;
}

function confidence(entries: CloudEntry[]) {
  const matches = new Set(entries.map((entry) => entry.matchNumber)).size;
  const scouts = new Set(entries.map((entry) => entry.scoutName.trim().toLowerCase()).filter(Boolean)).size;
  if (matches >= 4 && scouts >= 2) return "High";
  if (matches >= 2) return "Medium";
  return "Low";
}

function confidenceClass(level: string) {
  if (level === "High") return "text-emerald-300";
  if (level === "Medium") return "text-yellow-200";
  return "text-orange-300";
}

export function ScoutingAnalysis() {
  const [entries, setEntries] = useState<CloudEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [showGraphs, setShowGraphs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const config = getScoutingSeason(2026);

  const teams = useMemo<TeamSummary[]>(() => {
    const map = new Map<number, CloudEntry[]>();
    for (const entry of entries) {
      const current = map.get(entry.teamNumber) ?? [];
      current.push(entry);
      map.set(entry.teamNumber, current);
    }
    return [...map.entries()]
      .map(([teamNumber, teamEntries]) => ({
        teamNumber,
        entries: teamEntries.sort((a, b) => a.matchNumber - b.matchNumber),
      }))
      .sort((a, b) => a.teamNumber - b.teamNumber);
  }, [entries]);

  const metrics = useMemo<MetricDefinition[]>(() => {
    const derived: MetricDefinition[] = [
      {
        key: "autoFuel",
        label: "Auto fuel avg",
        kind: "number",
        result: (teamEntries) => numberMetric(teamEntries, (entry) => entry.gameData.autoFuelScoredEstimate),
      },
      {
        key: "teleopFuel",
        label: "Teleop fuel avg",
        kind: "number",
        result: (teamEntries) => numberMetric(teamEntries, (entry) => entry.gameData.teleopFuelScoredEstimate),
      },
      {
        key: "totalFuel",
        label: "Total fuel avg",
        kind: "number",
        result: (teamEntries) => {
          const values = teamEntries
            .map((entry) => {
              const auto = entry.gameData.autoFuelScoredEstimate;
              const teleop = entry.gameData.teleopFuelScoredEstimate;
              if (typeof auto !== "number" && typeof teleop !== "number") return null;
              return (typeof auto === "number" ? auto : 0) + (typeof teleop === "number" ? teleop : 0);
            })
            .filter((value): value is number => typeof value === "number");
          const value = average(values);
          return { value, display: formatNumber(value), detail: `${values.length}/${teamEntries.length} reports` };
        },
      },
      {
        key: "climbPoints",
        label: "Climb pts avg",
        kind: "number",
        result: (teamEntries) => {
          const values = teamEntries
            .map((entry) => towerPoints(entry.gameData.towerLevel))
            .filter((value): value is number => value !== null);
          const value = average(values);
          return { value, display: formatNumber(value), detail: "L1 10 · L2 20 · L3 30" };
        },
      },
    ];

    const gameFields = config.fields
      .filter((field) => !["autoFuelScoredEstimate", "teleopFuelScoredEstimate"].includes(field.key))
      .map<MetricDefinition>((field) => {
        if (field.type === "counter" || field.type === "number") {
          return {
            key: field.key,
            label: phaseLabel(field),
            kind: "number",
            result: (teamEntries) => numberMetric(teamEntries, (entry) => entry.gameData[field.key]),
          };
        }
        if (field.type === "toggle") {
          return {
            key: field.key,
            label: phaseLabel(field),
            kind: "percent",
            result: (teamEntries) => percentMetric(teamEntries, (entry) => entry.gameData[field.key]),
          };
        }
        return {
          key: field.key,
          label: phaseLabel(field),
          kind: "category",
          result: (teamEntries) => categoryMetric(teamEntries, (entry) => entry.gameData[field.key], (value) => optionLabel(field, value)),
        };
      });

    const standard: MetricDefinition[] = [
      {
        key: "autoStartX",
        label: "Auto start X avg",
        kind: "number",
        result: (teamEntries) => numberMetric(teamEntries, (entry) => entry.autoStart?.x),
      },
      {
        key: "autoStartY",
        label: "Auto start Y avg",
        kind: "number",
        result: (teamEntries) => numberMetric(teamEntries, (entry) => entry.autoStart?.y),
      },
      {
        key: "driverRating",
        label: "Driver rating avg",
        kind: "number",
        result: (teamEntries) => numberMetric(teamEntries, (entry) => entry.driverRating),
      },
      {
        key: "playedDefense",
        label: "Played defense",
        kind: "percent",
        result: (teamEntries) => percentMetric(teamEntries, (entry) => entry.playedDefense),
      },
      {
        key: "defenseRating",
        label: "Defense rating avg",
        kind: "number",
        result: (teamEntries) => numberMetric(teamEntries, (entry) => entry.defenseRating),
      },
      {
        key: "defenseLevel",
        label: "Defense faced",
        kind: "category",
        result: (teamEntries) => categoryMetric(teamEntries, (entry) => entry.defense, (value) => value[0].toUpperCase() + value.slice(1)),
      },
      {
        key: "heavyDefense",
        label: "Heavily guarded",
        kind: "percent",
        result: (teamEntries) => percentMetric(teamEntries, (entry) => entry.defense === "heavy"),
      },
      {
        key: "penalties",
        label: "Penalties avg",
        kind: "number",
        result: (teamEntries) => numberMetric(teamEntries, (entry) => entry.penalties),
      },
      {
        key: "disabled",
        label: "Disabled rate",
        kind: "percent",
        result: (teamEntries) => percentMetric(teamEntries, (entry) => entry.disabled),
      },
      {
        key: "tipped",
        label: "Tipped rate",
        kind: "percent",
        result: (teamEntries) => percentMetric(teamEntries, (entry) => entry.tipped),
      },
      {
        key: "mechanicalIssue",
        label: "Mechanical issue rate",
        kind: "percent",
        result: (teamEntries) => percentMetric(teamEntries, (entry) => entry.mechanicalIssue),
      },
      {
        key: "reliabilityIssue",
        label: "Any reliability issue",
        kind: "percent",
        result: (teamEntries) => percentMetric(teamEntries, (entry) => entry.disabled || entry.tipped || entry.mechanicalIssue),
      },
    ];

    return [...derived, ...gameFields, ...standard];
  }, [config.fields]);

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const url = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
      const client = new ConvexHttpClient(url);
      const result = await client.query(listEventEntries, { eventKey: EVENT_KEY }) as CloudEntry[];
      setEntries(result);
      setLoaded(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load scouting data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ffd84d]">{EVENT_KEY} · {config.gameName}</div>
          <div className="mt-1 text-sm text-slate-400">
            {loaded ? `${teams.length} teams · ${entries.length} scouting reports` : "Loading event scouting data…"}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowGraphs((current) => !current)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-300/20 px-4 text-sm font-semibold text-slate-200 hover:border-[#ffd84d]/40"
          >
            {showGraphs ? <EyeOff size={16} /> : <Eye size={16} />}
            {showGraphs ? "Hide graphs" : "Show graphs"}
          </button>
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#ffd84d] px-4 text-sm font-semibold text-[#07111f] hover:bg-yellow-300 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "Refreshing…" : "Refresh data"}
          </button>
        </div>
      </section>

      {error ? <div className="rounded-xl border border-red-400/20 bg-red-950/20 p-4 text-sm text-red-200">{error}</div> : null}

      {loaded && teams.length === 0 ? (
        <div className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70 p-6 text-slate-400">No synced scouting entries found for Icebreaker yet.</div>
      ) : null}

      {teams.length ? (
        <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/75">
          <div className="border-b border-blue-400/10 bg-[#11243d] px-4 py-3">
            <h2 className="font-semibold text-white">Per-game team averages</h2>
            <p className="mt-1 text-xs text-slate-500">Scroll horizontally for every scouted metric. Percent columns are the share of observed matches where the condition was true; category columns show the most common response.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-max border-collapse text-sm">
              <thead className="bg-[#091524] text-left text-[11px] uppercase tracking-[0.08em] text-slate-500">
                <tr>
                  <th className="sticky left-0 z-20 min-w-24 border-b border-r border-blue-400/10 bg-[#091524] px-3 py-3">Team</th>
                  <th className="sticky left-24 z-20 min-w-20 border-b border-r border-blue-400/10 bg-[#091524] px-3 py-3 text-center">Matches</th>
                  <th className="min-w-24 border-b border-r border-blue-400/10 px-3 py-3">Confidence</th>
                  {metrics.map((metric) => (
                    <th key={metric.key} className="min-w-32 border-b border-r border-blue-400/10 px-3 py-3">{metric.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-blue-400/10">
                {teams.map((team) => {
                  const uniqueMatches = new Set(team.entries.map((entry) => entry.matchNumber)).size;
                  const confidenceLevel = confidence(team.entries);
                  return (
                    <tr key={team.teamNumber} className="hover:bg-[#0b5fff]/5">
                      <td className="sticky left-0 z-10 border-r border-blue-400/10 bg-[#0d1b2e] px-3 py-3 text-lg font-bold text-[#ffd84d]">{team.teamNumber}</td>
                      <td className="sticky left-24 z-10 border-r border-blue-400/10 bg-[#0d1b2e] px-3 py-3 text-center font-mono font-semibold text-white">{uniqueMatches}</td>
                      <td className={`border-r border-blue-400/10 px-3 py-3 font-semibold ${confidenceClass(confidenceLevel)}`}>{confidenceLevel}</td>
                      {metrics.map((metric) => {
                        const result = metric.result(team.entries);
                        return (
                          <td key={metric.key} className="border-r border-blue-400/10 px-3 py-3 align-top">
                            <div className="font-semibold text-slate-100">{result.display}</div>
                            {result.detail ? <div className="mt-0.5 text-[10px] text-slate-600">{result.detail}</div> : null}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-blue-400/10 px-4 py-3 text-xs text-slate-600">
            Climb points use the 2026 endgame tower values: Level 1 = 10, Level 2 = 20, Level 3 = 30.
          </div>
        </section>
      ) : null}

      {showGraphs && teams.length ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={19} className="text-[#ffd84d]" />
            <div>
              <h2 className="font-semibold text-white">Metric graphs</h2>
              <p className="text-xs text-slate-500">One team comparison graph for every table metric. For categorical metrics, the bar shows how consistently scouts agreed on the displayed most-common category.</p>
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {metrics.map((metric) => <MetricChart key={metric.key} metric={metric} teams={teams} />)}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MetricChart({ metric, teams }: { metric: MetricDefinition; teams: TeamSummary[] }) {
  const rows = teams.map((team) => ({ teamNumber: team.teamNumber, result: metric.result(team.entries) }));
  const finiteValues = rows.map((row) => row.result.value).filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const max = metric.kind === "percent" || metric.kind === "category"
    ? 100
    : Math.max(1, ...finiteValues);

  return (
    <article className="rounded-2xl border border-blue-400/15 bg-[#0d1b2e]/70 p-4">
      <h3 className="font-semibold text-white">{metric.label}</h3>
      <p className="mt-1 text-[11px] text-slate-600">
        {metric.kind === "category" ? "Bar length = agreement with the most common reported category." : metric.kind === "percent" ? "Percentage of observed reports." : "Average per observed match."}
      </p>
      <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
        {rows.map((row) => {
          const value = row.result.value;
          const width = value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
          return (
            <div key={row.teamNumber} className="grid grid-cols-[58px_minmax(0,1fr)_90px] items-center gap-2">
              <div className="font-mono text-xs font-semibold text-[#ffd84d]">{row.teamNumber}</div>
              <div className="h-3 overflow-hidden rounded-full bg-[#07111f]">
                <div className="h-full rounded-full bg-[#0b5fff]" style={{ width: `${width}%` }} />
              </div>
              <div className="truncate text-right text-xs font-semibold text-slate-300" title={row.result.display}>{row.result.display}</div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
