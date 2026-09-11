"use client";

import { FormEvent, useMemo, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { AlertTriangle, CheckCircle2, Search } from "lucide-react";
import { getScoutingSeason, inferSeasonFromEventKey, type GameField } from "@/config/scouting/seasons";

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

type ConfidenceLevel = "high" | "medium" | "low";

type QualityAssessment = {
  level: ConfidenceLevel;
  uniqueMatches: number;
  uniqueScouts: number;
  missingFields: string[];
  conflictingMatches: number;
  outlierFields: string[];
  reasons: string[];
};

const listEventEntries = makeFunctionReference<"query">("analysis:listEventEntries");

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function percent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function formatNumber(value: number | null) {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function averageOptional(entries: CloudEntry[], select: (entry: CloudEntry) => number | undefined) {
  const values = entries.map(select).filter((value): value is number => typeof value === "number");
  return average(values);
}

function booleanRate(entries: CloudEntry[], select: (entry: CloudEntry) => boolean | undefined) {
  const values = entries.map(select).filter((value): value is boolean => typeof value === "boolean");
  return values.length ? values.filter(Boolean).length / values.length : null;
}

function hasReportConflict(entries: CloudEntry[]) {
  if (entries.length < 2) return false;

  const categoricalChecks: unknown[][] = [
    entries.map((entry) => entry.disabled),
    entries.map((entry) => entry.tipped),
    entries.map((entry) => entry.mechanicalIssue),
    entries.map((entry) => entry.playedDefense),
    entries.map((entry) => entry.defense),
  ];
  if (categoricalChecks.some((values) => new Set(values).size > 1)) return true;

  const driverRatings = entries.map((entry) => entry.driverRating).filter((value): value is number => typeof value === "number");
  if (driverRatings.length > 1 && Math.max(...driverRatings) - Math.min(...driverRatings) >= 3) return true;

  const penalties = entries.map((entry) => entry.penalties);
  if (penalties.length > 1 && Math.max(...penalties) - Math.min(...penalties) >= 3) return true;

  return false;
}

function findPotentialOutlierFields(entries: CloudEntry[], fields: GameField[]) {
  return fields
    .filter((field) => field.type === "counter" || field.type === "number")
    .filter((field) => {
      const values = entries
        .map((entry) => entry.gameData[field.key])
        .filter((value): value is number => typeof value === "number")
        .sort((a, b) => a - b);
      if (values.length < 5) return false;

      const q1 = values[Math.floor((values.length - 1) * 0.25)];
      const q3 = values[Math.floor((values.length - 1) * 0.75)];
      const iqr = q3 - q1;
      if (iqr <= 0) return false;

      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      return values.some((value) => value < lower || value > upper);
    })
    .map((field) => field.label);
}

function assessQuality(entries: CloudEntry[], fields: GameField[]): QualityAssessment {
  const uniqueMatches = new Set(entries.map((entry) => entry.matchNumber)).size;
  const uniqueScouts = new Set(entries.map((entry) => entry.scoutName.trim().toLowerCase()).filter(Boolean)).size;
  const missingFields = fields
    .filter((field) => entries.some((entry) => entry.gameData[field.key] === undefined || entry.gameData[field.key] === null))
    .map((field) => field.label);

  const byMatch = new Map<number, CloudEntry[]>();
  for (const entry of entries) {
    const reports = byMatch.get(entry.matchNumber) ?? [];
    reports.push(entry);
    byMatch.set(entry.matchNumber, reports);
  }
  const conflictingMatches = [...byMatch.values()].filter(hasReportConflict).length;
  const outlierFields = findPotentialOutlierFields(entries, fields);

  const reasons: string[] = [];
  if (uniqueMatches <= 1) reasons.push("Only one unique match observed");
  else if (uniqueMatches < 4) reasons.push(`Small sample: ${uniqueMatches} unique matches`);
  if (uniqueScouts <= 1) reasons.push("All observations come from one scout");
  if (missingFields.length) reasons.push(`Missing observations in ${missingFields.length} configured field${missingFields.length === 1 ? "" : "s"}`);
  if (conflictingMatches) reasons.push(`Conflicting reports in ${conflictingMatches} match${conflictingMatches === 1 ? "" : "es"}`);
  if (outlierFields.length) reasons.push(`Potential numeric outlier${outlierFields.length === 1 ? "" : "s"} in ${outlierFields.slice(0, 2).join(", ")}${outlierFields.length > 2 ? "…" : ""}`);

  const manyMissingFields = missingFields.length >= Math.max(2, Math.ceil(fields.length * 0.25));
  let level: ConfidenceLevel = "high";
  if (uniqueMatches <= 1 || conflictingMatches >= 2 || manyMissingFields) level = "low";
  else if (uniqueMatches < 4 || uniqueScouts < 2 || conflictingMatches > 0 || missingFields.length > 0 || outlierFields.length > 0) level = "medium";

  return { level, uniqueMatches, uniqueScouts, missingFields, conflictingMatches, outlierFields, reasons };
}

export function ScoutingAnalysis() {
  const [eventKey, setEventKey] = useState("2026vaale");
  const [loadedEvent, setLoadedEvent] = useState("");
  const [entries, setEntries] = useState<CloudEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const season = inferSeasonFromEventKey(loadedEvent || eventKey) ?? 2026;
  const config = getScoutingSeason(season);

  const teams = useMemo<TeamSummary[]>(() => {
    const map = new Map<number, CloudEntry[]>();
    for (const entry of entries) {
      const current = map.get(entry.teamNumber) ?? [];
      current.push(entry);
      map.set(entry.teamNumber, current);
    }
    return [...map.entries()]
      .map(([teamNumber, teamEntries]) => ({ teamNumber, entries: teamEntries.sort((a, b) => a.matchNumber - b.matchNumber) }))
      .sort((a, b) => a.teamNumber - b.teamNumber);
  }, [entries]);

  const qualityAssessments = useMemo(
    () => teams.map((team) => assessQuality(team.entries, config.fields)),
    [teams, config.fields],
  );

  async function load(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const url = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
      const client = new ConvexHttpClient(url);
      const normalized = eventKey.trim().toLowerCase();
      const result = await client.query(listEventEntries, { eventKey: normalized }) as CloudEntry[];
      setEntries(result);
      setLoadedEvent(normalized);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load scouting data.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={load} className="flex flex-col gap-3 rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-4 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-2 text-sm">
          <span className="font-medium text-slate-300">Event key</span>
          <input value={eventKey} onChange={(e) => setEventKey(e.target.value)} className="w-full rounded-xl border border-blue-300/20 bg-[#07111f] px-3 py-2.5 text-white outline-none focus:border-[#0b5fff]" />
        </label>
        <button type="submit" disabled={loading || !eventKey.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ffd84d] px-5 py-2.5 font-semibold text-[#07111f] disabled:opacity-50">
          <Search size={17} /> {loading ? "Loading…" : "Analyze event"}
        </button>
      </form>

      {error ? <div className="rounded-xl border border-red-400/20 bg-red-950/20 p-4 text-sm text-red-200">{error}</div> : null}

      {loadedEvent ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard label="Event" value={loadedEvent} />
            <SummaryCard label="Season" value={`${config.year} · ${config.gameName}`} />
            <SummaryCard label="Cloud entries" value={String(entries.length)} />
            <SummaryCard label="Teams scouted" value={String(teams.length)} />
          </section>

          {qualityAssessments.length ? <DataQualitySummary assessments={qualityAssessments} /> : null}

          {teams.length === 0 ? (
            <div className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70 p-6 text-slate-400">No synced scouting entries found for this event.</div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-2">
              {teams.map((team) => <TeamAnalysisCard key={team.teamNumber} team={team} fields={config.fields} />)}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-blue-400/15 bg-[#0d1b2e]/75 p-4"><div className="text-xs uppercase tracking-[0.16em] text-slate-500">{label}</div><div className="mt-2 text-xl font-bold text-white">{value}</div></div>;
}

function DataQualitySummary({ assessments }: { assessments: QualityAssessment[] }) {
  const high = assessments.filter((assessment) => assessment.level === "high").length;
  const medium = assessments.filter((assessment) => assessment.level === "medium").length;
  const low = assessments.filter((assessment) => assessment.level === "low").length;
  const needsAttention = medium + low;

  return (
    <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {low > 0 ? <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-300" /> : <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-300" />}
          <div>
            <h2 className="font-semibold text-white">Data confidence</h2>
            <p className="mt-1 text-sm text-slate-400">
              {needsAttention === 0 ? "All scouted teams currently have strong coverage." : `${needsAttention} team${needsAttention === 1 ? "" : "s"} need more coverage or a data review.`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-200">High {high}</span>
          <span className="rounded-full border border-yellow-300/20 bg-yellow-300/10 px-3 py-1 text-yellow-100">Medium {medium}</span>
          <span className="rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1 text-red-200">Low {low}</span>
        </div>
      </div>
    </section>
  );
}

function TeamAnalysisCard({ team, fields }: { team: TeamSummary; fields: GameField[] }) {
  const entries = team.entries;
  const quality = assessQuality(entries, fields);
  const issueCount = entries.filter((entry) => entry.disabled || entry.tipped || entry.mechanicalIssue).length;
  const heavilyGuarded = entries.filter((entry) => entry.defense === "heavy").length;
  const avgDriverRating = averageOptional(entries, (entry) => entry.driverRating);
  const playedDefenseRate = booleanRate(entries, (entry) => entry.playedDefense);
  const avgDefenseRating = averageOptional(entries, (entry) => entry.defenseRating);
  const avgPenalties = average(entries.map((entry) => entry.penalties));
  const notes = entries.filter((entry) => entry.notes.trim()).slice(-3).reverse();

  return (
    <article className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80">
      <header className="flex items-center justify-between gap-4 border-b border-blue-400/10 bg-[#11243d] px-5 py-4">
        <div><div className="text-xs uppercase tracking-[0.16em] text-slate-500">Team</div><h2 className="text-2xl font-bold text-[#ffd84d]">{team.teamNumber}</h2></div>
        <div className="flex items-center gap-4">
          <ConfidenceBadge level={quality.level} />
          <div className="text-right"><div className="text-2xl font-bold text-white">{entries.length}</div><div className="text-xs text-slate-500">reports</div></div>
        </div>
      </header>

      <div className="border-b border-blue-400/10 bg-[#0a1728] px-5 py-3 text-xs text-slate-400">
        <span className="font-medium text-slate-300">{quality.uniqueMatches} unique matches · {quality.uniqueScouts} scout{quality.uniqueScouts === 1 ? "" : "s"}</span>
        <span className="mx-2 text-slate-700">•</span>
        {quality.reasons.length ? quality.reasons.join(" · ") : "No missing fields, report conflicts, or statistical outliers detected."}
      </div>

      <div className="grid grid-cols-2 gap-px bg-blue-400/10 sm:grid-cols-3">
        <SmallStat label="Reliability issues" value={percent(issueCount / entries.length)} />
        <SmallStat label="Heavily guarded" value={percent(heavilyGuarded / entries.length)} />
        <SmallStat label="Avg driver rating" value={formatNumber(avgDriverRating)} />
        <SmallStat label="Played defense" value={percent(playedDefenseRate)} />
        <SmallStat label="Avg defense quality" value={formatNumber(avgDefenseRating)} />
        <SmallStat label="Avg penalties" value={formatNumber(avgPenalties)} />
      </div>

      <div className="space-y-5 p-5">
        {(["auto", "teleop", "endgame"] as const).map((phase) => {
          const phaseFields = fields.filter((field) => field.phase === phase);
          if (!phaseFields.length) return null;
          return <div key={phase}><h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">{phase}</h3><div className="grid gap-3 sm:grid-cols-2">{phaseFields.map((field) => <FieldMetric key={field.key} field={field} entries={entries} />)}</div></div>;
        })}

        <div>
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Recent notes</h3>
          {notes.length ? <div className="space-y-2">{notes.map((entry) => <div key={entry.clientId} className="rounded-xl border border-blue-300/10 bg-[#07111f]/60 p-3 text-sm text-slate-300"><div className="mb-1 text-xs text-slate-600">Q{entry.matchNumber} · {entry.scoutName}</div>{entry.notes}</div>)}</div> : <div className="text-sm text-slate-600">No notes recorded.</div>}
        </div>
      </div>
    </article>
  );
}

function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const styles = {
    high: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    medium: "border-yellow-300/25 bg-yellow-300/10 text-yellow-100",
    low: "border-red-400/25 bg-red-400/10 text-red-200",
  } satisfies Record<ConfidenceLevel, string>;

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${styles[level]}`}>{level} confidence</span>;
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return <div className="bg-[#07111f]/70 p-3 text-center"><div className="text-lg font-bold text-white">{value}</div><div className="text-[11px] text-slate-500">{label}</div></div>;
}

function FieldMetric({ field, entries }: { field: GameField; entries: CloudEntry[] }) {
  const values = entries.map((entry) => entry.gameData[field.key]).filter((value) => value !== undefined && value !== null);

  if (field.type === "counter" || field.type === "number") {
    const nums = values.filter((value): value is number => typeof value === "number");
    return <MetricBox label={field.label} value={formatNumber(average(nums))} detail={`${nums.length}/${entries.length} reports · average`} />;
  }

  if (field.type === "toggle") {
    const bools = values.filter((value): value is boolean => typeof value === "boolean");
    const rate = bools.length ? bools.filter(Boolean).length / bools.length : null;
    return <MetricBox label={field.label} value={percent(rate)} detail={`${bools.length}/${entries.length} reports · yes rate`} />;
  }

  const strings = values.filter((value): value is string => typeof value === "string");
  const counts = new Map<string, number>();
  for (const value of strings) counts.set(value, (counts.get(value) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const optionLabel = field.options?.find((option) => option.value === top?.[0])?.label ?? top?.[0];
  return <MetricBox label={field.label} value={optionLabel ?? "—"} detail={top ? `${top[1]}/${strings.length} matching · ${strings.length}/${entries.length} reports` : "no data"} />;
}

function MetricBox({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-blue-300/10 bg-[#07111f]/55 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-lg font-semibold text-white">{value}</div><div className="text-[11px] text-slate-600">{detail}</div></div>;
}
