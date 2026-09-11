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

type TeamObserved = {
  teamNumber: number;
  entries: CloudEntry[];
};

const listEventEntries = makeFunctionReference<"query">("analysis:listEventEntries");

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function formatNumber(value: number | null) {
  if (value === null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function percent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
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
  if (!strings.length) return "—";
  const counts = new Map<string, number>();
  for (const value of strings) counts.set(value, (counts.get(value) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const label = field.options?.find((option) => option.value === top[0])?.label ?? top[0];
  return `${label} (${top[1]}/${strings.length})`;
}

function averageOptional(entries: CloudEntry[], select: (entry: CloudEntry) => number | undefined) {
  const values = entries.map(select).filter((value): value is number => typeof value === "number");
  return average(values);
}

function booleanRate(entries: CloudEntry[], select: (entry: CloudEntry) => boolean | undefined) {
  const values = entries.map(select).filter((value): value is boolean => typeof value === "boolean");
  return values.length ? values.filter(Boolean).length / values.length : null;
}

export function ScoutingCompareTable({ eventKey, teamNumbers }: { eventKey: string; teamNumbers: number[] }) {
  const [entries, setEntries] = useState<CloudEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!url) throw new Error("Cloud scouting is not configured.");
        const client = new ConvexHttpClient(url);
        const result = await client.query(listEventEntries, { eventKey: eventKey.toLowerCase() }) as CloudEntry[];
        if (!cancelled) setEntries(result.filter((entry) => teamNumbers.includes(entry.teamNumber)));
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load observed scouting data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [eventKey, teamNumbers]);

  const season = inferSeasonFromEventKey(eventKey) ?? 2026;
  const config = getScoutingSeason(season);

  const teams = useMemo<TeamObserved[]>(() => teamNumbers.map((teamNumber) => ({
    teamNumber,
    entries: entries.filter((entry) => entry.teamNumber === teamNumber).sort((a, b) => a.matchNumber - b.matchNumber),
  })), [entries, teamNumbers]);

  if (loading) return <div className="rounded-2xl border border-yellow-300/15 bg-[#0d1b2e]/70 p-5 text-sm text-slate-500">Loading observed scouting comparison…</div>;
  if (error) return <div className="rounded-2xl border border-red-400/20 bg-red-950/20 p-5 text-sm text-red-200">{error}</div>;

  return (
    <section className="space-y-4">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ffd84d]">Observed data</div>
        <h2 className="mt-1 text-xl font-semibold text-white">1731 scouting comparison</h2>
        <p className="mt-1 text-sm text-slate-500">Direct comparison of cloud-synced observations. Numeric fields are averages, toggles are yes-rates, and select fields show the most common outcome.</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-yellow-300/15 bg-[#0d1b2e]/75">
        <table className="min-w-full text-sm">
          <thead className="bg-[#11243d]">
            <tr>
              <th className="sticky left-0 z-10 bg-[#11243d] px-4 py-3 text-left font-semibold text-slate-300">Observed metric</th>
              {teams.map((team) => <th key={team.teamNumber} className="min-w-[140px] px-4 py-3 text-right text-lg font-bold text-[#ffd84d]">{team.teamNumber}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-blue-400/10">
            <Row label="Matches scouted" values={teams.map((team) => String(team.entries.length))} />
            <Row label="Reliability issues" values={teams.map((team) => percent(team.entries.length ? team.entries.filter((entry) => entry.disabled || entry.tipped || entry.mechanicalIssue).length / team.entries.length : null))} />
            <Row label="Heavily guarded" values={teams.map((team) => percent(team.entries.length ? team.entries.filter((entry) => entry.defense === "heavy").length / team.entries.length : null))} />
            <Row label="Avg driver rating" values={teams.map((team) => formatNumber(averageOptional(team.entries, (entry) => entry.driverRating)))} />
            <Row label="Played defense" values={teams.map((team) => percent(booleanRate(team.entries, (entry) => entry.playedDefense)))} />
            <Row label="Avg defense quality" values={teams.map((team) => formatNumber(averageOptional(team.entries, (entry) => entry.defenseRating)))} />
            <Row label="Average penalties" values={teams.map((team) => formatNumber(average(team.entries.map((entry) => entry.penalties))))} />

            {(["auto", "teleop", "endgame"] as const).flatMap((phase) => {
              const fields = config.fields.filter((field) => field.phase === phase);
              if (!fields.length) return [];
              return [
                <tr key={`${phase}-heading`} className="bg-[#07111f]/70">
                  <td colSpan={teams.length + 1} className="px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{phase}</td>
                </tr>,
                ...fields.map((field) => <Row key={field.key} label={field.label} values={teams.map((team) => summarizeField(field, team.entries))} />),
              ];
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-blue-400/15 bg-[#07111f]/45 p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Derived 1731 metrics</div>
        <p className="mt-1 text-sm text-slate-500">Reserved for custom ratings that combine observed scouting with public data. We can add weighted pick-list scores here once the 2026 scouting fields are finalized.</p>
      </div>
    </section>
  );
}

function Row({ label, values }: { label: string; values: string[] }) {
  return (
    <tr className="hover:bg-[#0b5fff]/5">
      <td className="sticky left-0 bg-[#0d1b2e] px-4 py-3 font-medium text-slate-300">{label}</td>
      {values.map((value, index) => <td key={`${label}-${index}`} className="px-4 py-3 text-right font-mono text-white">{value}</td>)}
    </tr>
  );
}
