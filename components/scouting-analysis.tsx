"use client";

import { FormEvent, useMemo, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { Search } from "lucide-react";
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

const listEventEntries = makeFunctionReference<"query">("analysis:listEventEntries");

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
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

function TeamAnalysisCard({ team, fields }: { team: TeamSummary; fields: GameField[] }) {
  const entries = team.entries;
  const issueCount = entries.filter((entry) => entry.disabled || entry.tipped || entry.mechanicalIssue).length;
  const heavyDefense = entries.filter((entry) => entry.defense === "heavy").length;
  const avgPenalties = average(entries.map((entry) => entry.penalties));
  const notes = entries.filter((entry) => entry.notes.trim()).slice(-3).reverse();

  return (
    <article className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80">
      <header className="flex items-center justify-between gap-4 border-b border-blue-400/10 bg-[#11243d] px-5 py-4">
        <div><div className="text-xs uppercase tracking-[0.16em] text-slate-500">Team</div><h2 className="text-2xl font-bold text-[#ffd84d]">{team.teamNumber}</h2></div>
        <div className="text-right"><div className="text-2xl font-bold text-white">{entries.length}</div><div className="text-xs text-slate-500">matches scouted</div></div>
      </header>

      <div className="grid grid-cols-3 gap-px bg-blue-400/10">
        <SmallStat label="Reliability issues" value={percent(issueCount / entries.length)} />
        <SmallStat label="Heavy defense" value={percent(heavyDefense / entries.length)} />
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

function SmallStat({ label, value }: { label: string; value: string }) {
  return <div className="bg-[#07111f]/70 p-3 text-center"><div className="text-lg font-bold text-white">{value}</div><div className="text-[11px] text-slate-500">{label}</div></div>;
}

function FieldMetric({ field, entries }: { field: GameField; entries: CloudEntry[] }) {
  const values = entries.map((entry) => entry.gameData[field.key]).filter((value) => value !== undefined && value !== null);

  if (field.type === "counter" || field.type === "number") {
    const nums = values.filter((value): value is number => typeof value === "number");
    return <MetricBox label={field.label} value={nums.length ? formatNumber(average(nums)) : "—"} detail="average" />;
  }

  if (field.type === "toggle") {
    const bools = values.filter((value): value is boolean => typeof value === "boolean");
    const rate = bools.length ? bools.filter(Boolean).length / bools.length : 0;
    return <MetricBox label={field.label} value={bools.length ? percent(rate) : "—"} detail="yes rate" />;
  }

  const strings = values.filter((value): value is string => typeof value === "string");
  const counts = new Map<string, number>();
  for (const value of strings) counts.set(value, (counts.get(value) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const optionLabel = field.options?.find((option) => option.value === top?.[0])?.label ?? top?.[0];
  return <MetricBox label={field.label} value={optionLabel ?? "—"} detail={top ? `${top[1]}/${strings.length} matches` : "no data"} />;
}

function MetricBox({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-blue-300/10 bg-[#07111f]/55 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-lg font-semibold text-white">{value}</div><div className="text-[11px] text-slate-600">{detail}</div></div>;
}
