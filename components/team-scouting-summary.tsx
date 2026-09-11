"use client";

import { useEffect, useMemo, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { getScoutingSeason, inferSeasonFromEventKey, type GameField } from "@/config/scouting/seasons";

type CloudEntry = {
  clientId: string;
  eventKey: string;
  matchNumber: number;
  teamNumber: number;
  scoutName: string;
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

function summarizeField(field: GameField, entries: CloudEntry[]) {
  const values = entries.map((entry) => entry.gameData[field.key]).filter((value) => value !== undefined && value !== null);
  if (field.type === "counter" || field.type === "number") {
    const nums = values.filter((value): value is number => typeof value === "number");
    return formatNumber(average(nums));
  }
  if (field.type === "toggle") {
    const bools = values.filter((value): value is boolean => typeof value === "boolean");
    return percent(bools.length ? bools.filter(Boolean).length / bools.length : null);
  }
  const strings = values.filter((value): value is string => typeof value === "string");
  const counts = new Map<string, number>();
  for (const value of strings) counts.set(value, (counts.get(value) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return field.options?.find((option) => option.value === top?.[0])?.label ?? top?.[0] ?? "—";
}

function averageOptional(entries: CloudEntry[], select: (entry: CloudEntry) => number | undefined) {
  const values = entries.map(select).filter((value): value is number => typeof value === "number");
  return average(values);
}

function booleanRate(entries: CloudEntry[], select: (entry: CloudEntry) => boolean | undefined) {
  const values = entries.map(select).filter((value): value is boolean => typeof value === "boolean");
  return values.length ? values.filter(Boolean).length / values.length : null;
}

export function TeamScoutingSummary({ eventKey, teamNumber, compact = false }: { eventKey: string; teamNumber: number; compact?: boolean }) {
  const [entries, setEntries] = useState<CloudEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const url = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!url) throw new Error("Cloud scouting is not configured.");
        const client = new ConvexHttpClient(url);
        const result = await client.query(listEventEntries, { eventKey: eventKey.toLowerCase() }) as CloudEntry[];
        if (!cancelled) setEntries(result.filter((entry) => entry.teamNumber === teamNumber));
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load scouting data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [eventKey, teamNumber]);

  const season = inferSeasonFromEventKey(eventKey) ?? 2026;
  const config = getScoutingSeason(season);
  const keyFields = useMemo(() => config.fields.slice(0, compact ? 4 : 8), [config.fields, compact]);

  if (loading) return <div className="rounded-2xl border border-blue-400/15 bg-[#0d1b2e]/70 p-4 text-sm text-slate-500">Loading 1731 scouting…</div>;
  if (error) return <div className="rounded-2xl border border-red-400/20 bg-red-950/20 p-4 text-sm text-red-200">{error}</div>;
  if (!entries.length) return <div className="rounded-2xl border border-blue-400/15 bg-[#0d1b2e]/70 p-4 text-sm text-slate-500">No synced 1731 scouting entries for Team {teamNumber} at {eventKey}.</div>;

  const issueRate = entries.filter((entry) => entry.disabled || entry.tipped || entry.mechanicalIssue).length / entries.length;
  const heavilyGuardedRate = entries.filter((entry) => entry.defense === "heavy").length / entries.length;
  const avgDriverRating = averageOptional(entries, (entry) => entry.driverRating);
  const playedDefenseRate = booleanRate(entries, (entry) => entry.playedDefense);
  const avgDefenseRating = averageOptional(entries, (entry) => entry.defenseRating);
  const avgPenalties = average(entries.map((entry) => entry.penalties));
  const notes = entries.filter((entry) => entry.notes.trim()).slice(-3).reverse();

  return (
    <section className="rounded-2xl border border-yellow-300/20 bg-[#0d1b2e]/85 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ffd84d]">1731 scouting</div>
          <h2 className="mt-1 text-xl font-semibold text-white">Observed performance</h2>
        </div>
        <div className="text-right"><div className="text-2xl font-bold text-white">{entries.length}</div><div className="text-xs text-slate-500">matches scouted</div></div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Reliability issues" value={percent(issueRate)} />
        <Stat label="Heavily guarded" value={percent(heavilyGuardedRate)} />
        <Stat label="Avg driver rating" value={formatNumber(avgDriverRating)} />
        <Stat label="Played defense" value={percent(playedDefenseRate)} />
        <Stat label="Avg defense quality" value={formatNumber(avgDefenseRating)} />
        <Stat label="Avg penalties" value={formatNumber(avgPenalties)} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {keyFields.map((field) => <Stat key={field.key} label={field.label} value={summarizeField(field, entries)} />)}
      </div>

      {!compact && notes.length ? (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Recent notes</h3>
          <div className="space-y-2">{notes.map((entry) => <div key={entry.clientId} className="rounded-xl border border-blue-300/10 bg-[#07111f]/55 p-3 text-sm text-slate-300"><div className="mb-1 text-xs text-slate-600">Q{entry.matchNumber} · {entry.scoutName}</div>{entry.notes}</div>)}</div>
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-blue-300/10 bg-[#07111f]/60 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-lg font-semibold text-white">{value}</div></div>;
}

export function ScoutingCompareStrip({ eventKey, teamNumbers }: { eventKey: string; teamNumbers: number[] }) {
  return (
    <section className="space-y-4">
      <div><h2 className="text-xl font-semibold text-white">1731 scouting comparison</h2><p className="text-sm text-slate-500">Cloud-synced observations, shown separately from public metrics.</p></div>
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {teamNumbers.map((teamNumber) => <TeamScoutingSummary key={teamNumber} eventKey={eventKey} teamNumber={teamNumber} compact />)}
      </div>
    </section>
  );
}
