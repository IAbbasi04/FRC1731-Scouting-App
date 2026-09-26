"use client";

import { useEffect, useMemo, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { Camera, ClipboardList, Clock3, Gauge, NotebookPen, Wrench } from "lucide-react";
import { getScoutingSeason, type GameField } from "@/config/scouting/seasons";
import type { EventDashboardTeam } from "@/types/frc";

const listEventEntries = makeFunctionReference<"query">("analysis:listEventEntries");
const listPitEntries = makeFunctionReference<"query">("pitScouting:listTeamEntries");

type ScoutingEntry = {
  _id?: string;
  clientId: string;
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
  source?: "manual" | "ai-video";
};

type PitEntry = {
  clientId: string;
  createdAt: string;
  scoutName: string;
  robotPhotoDataUrl?: string;
  drivetrain: string;
  widthIn?: number;
  lengthIn?: number;
  heightIn?: number;
  weightLbs?: number;
  usesTrench: boolean;
  crossesBump: boolean;
  floorIntake: boolean;
  canPassFuel: boolean;
  shootsOnMove: boolean;
  shootingRange: string;
  fuelCapacity?: number;
  maxTowerLevel: string;
  autoCount: number;
  autoNotes: string;
  preferredRole: string;
  intakeNotes: string;
  reliabilityNotes: string;
  notes: string;
};

const pitLabels: Record<string, string> = {
  unknown: "Unknown",
  swerve: "Swerve",
  tank: "Tank / differential",
  mecanum: "Mecanum",
  other: "Other",
  close: "Close",
  mid: "Mid-range",
  far: "Far",
  multiple: "Multiple ranges",
  none: "None",
  level1: "Level 1",
  level2: "Level 2",
  level3: "Level 3",
  scorer: "Primary scorer",
  feeder: "Feeder / passer",
  defender: "Defense",
  flexible: "Flexible",
};

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function numericValues(entries: ScoutingEntry[], select: (entry: ScoutingEntry) => unknown) {
  return entries
    .map(select)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function avg(entries: ScoutingEntry[], select: (entry: ScoutingEntry) => unknown) {
  return average(numericValues(entries, select));
}

function formatNumber(value: number | null | undefined, digits = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(digits);
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function rate(entries: ScoutingEntry[], select: (entry: ScoutingEntry) => boolean | undefined) {
  const values = entries.map(select).filter((value): value is boolean => typeof value === "boolean");
  return values.length ? values.filter(Boolean).length / values.length : null;
}

function towerPoints(value: unknown): number | null {
  if (value === "level1") return 10;
  if (value === "level2") return 20;
  if (value === "level3") return 30;
  if (value === "none") return 0;
  return null;
}

function fieldValue(field: GameField, entries: ScoutingEntry[]) {
  const values = entries.map((entry) => entry.gameData[field.key]).filter((value) => value !== null && value !== undefined);
  if (field.type === "counter" || field.type === "number") {
    const nums = values.filter((value): value is number => typeof value === "number");
    return formatNumber(average(nums));
  }
  if (field.type === "toggle") {
    const bools = values.filter((value): value is boolean => typeof value === "boolean");
    return bools.length ? `${Math.round((bools.filter(Boolean).length / bools.length) * 100)}%` : "—";
  }
  const strings = values.filter((value): value is string => typeof value === "string");
  if (!strings.length) return "—";
  const counts = new Map<string, number>();
  for (const value of strings) counts.set(value, (counts.get(value) ?? 0) + 1);
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return field.options?.find((option) => option.value === top)?.label ?? top ?? "—";
}

function singleFieldValue(field: GameField, value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined) return "—";
  if (field.type === "toggle") return value ? "Yes" : "No";
  if (field.type === "select") return field.options?.find((option) => option.value === value)?.label ?? String(value);
  return String(value);
}

function createdLabel(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function dimension(entry: PitEntry) {
  const values = [entry.widthIn, entry.lengthIn, entry.heightIn];
  return values.some((value) => typeof value === "number")
    ? `${entry.widthIn ?? "?"} × ${entry.lengthIn ?? "?"} × ${entry.heightIn ?? "?"} in`
    : "—";
}

export function TeamTradingCard({
  eventKey,
  team,
  matchCount,
}: {
  eventKey: string;
  team: EventDashboardTeam;
  matchCount: number;
}) {
  const [scoutingEntries, setScoutingEntries] = useState<ScoutingEntry[]>([]);
  const [pitEntries, setPitEntries] = useState<PitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const config = getScoutingSeason(2026);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setMessage(null);
      try {
        const url = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!url) throw new Error("Cloud scouting is not configured.");
        const client = new ConvexHttpClient(url);
        const [allScouting, pits] = await Promise.all([
          client.query(listEventEntries, { eventKey: eventKey.toLowerCase() }) as Promise<ScoutingEntry[]>,
          client.query(listPitEntries, { eventKey: eventKey.toLowerCase(), teamNumber: team.teamNumber }) as Promise<PitEntry[]>,
        ]);
        if (cancelled) return;
        setScoutingEntries(
          allScouting
            .filter((entry) => entry.teamNumber === team.teamNumber)
            .sort((a, b) => a.matchNumber - b.matchNumber || a.createdAt.localeCompare(b.createdAt)),
        );
        setPitEntries([...pits].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      } catch (error) {
        if (!cancelled) setMessage(error instanceof Error ? error.message : "Could not load team scouting data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [eventKey, team.teamNumber]);

  const latestPit = pitEntries[0] ?? null;
  const robotPhoto = pitEntries.find((entry) => entry.robotPhotoDataUrl)?.robotPhotoDataUrl ?? null;

  const summary = useMemo(() => {
    const autoFuel = avg(scoutingEntries, (entry) => entry.gameData.autoFuelScoredEstimate);
    const teleopFuel = avg(scoutingEntries, (entry) => entry.gameData.teleopFuelScoredEstimate);
    const totalFuelValues = scoutingEntries
      .map((entry) => {
        const auto = entry.gameData.autoFuelScoredEstimate;
        const teleop = entry.gameData.teleopFuelScoredEstimate;
        if (typeof auto !== "number" && typeof teleop !== "number") return null;
        return (typeof auto === "number" ? auto : 0) + (typeof teleop === "number" ? teleop : 0);
      })
      .filter((value): value is number => value !== null);
    const climbValues = scoutingEntries
      .map((entry) => towerPoints(entry.gameData.towerLevel))
      .filter((value): value is number => value !== null);
    const issueRate = scoutingEntries.length
      ? scoutingEntries.filter((entry) => entry.disabled || entry.tipped || entry.mechanicalIssue).length / scoutingEntries.length
      : null;

    return {
      autoFuel,
      teleopFuel,
      totalFuel: average(totalFuelValues),
      climbPoints: average(climbValues),
      driverRating: avg(scoutingEntries, (entry) => entry.driverRating),
      defenseRating: avg(scoutingEntries, (entry) => entry.defenseRating),
      penalties: avg(scoutingEntries, (entry) => entry.penalties),
      playedDefense: rate(scoutingEntries, (entry) => entry.playedDefense),
      issueRate,
      uniqueMatches: new Set(scoutingEntries.map((entry) => entry.matchNumber)).size,
      scoutCount: new Set(scoutingEntries.map((entry) => entry.scoutName.trim().toLowerCase()).filter(Boolean)).size,
    };
  }, [scoutingEntries]);

  const notes = useMemo(() => {
    const rows: Array<{ key: string; label: string; text: string }> = [];
    if (latestPit?.autoNotes.trim()) rows.push({ key: "pit-auto", label: "Pit · Auto", text: latestPit.autoNotes.trim() });
    if (latestPit?.intakeNotes.trim()) rows.push({ key: "pit-intake", label: "Pit · Intake", text: latestPit.intakeNotes.trim() });
    if (latestPit?.reliabilityNotes.trim()) rows.push({ key: "pit-reliability", label: "Pit · Reliability", text: latestPit.reliabilityNotes.trim() });
    if (latestPit?.notes.trim()) rows.push({ key: "pit-general", label: "Pit · General", text: latestPit.notes.trim() });
    for (const entry of scoutingEntries.filter((entry) => entry.notes.trim()).slice().reverse()) {
      rows.push({
        key: entry.clientId,
        label: `Q${entry.matchNumber} · ${entry.scoutName} · ${createdLabel(entry.createdAt)}`,
        text: entry.notes.trim(),
      });
    }
    return rows;
  }, [latestPit, scoutingEntries]);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-blue-400/20 bg-[#0d1b2e] shadow-2xl shadow-black/25">
        <div className="grid lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)]">
          <div className="relative min-h-[300px] border-b border-blue-400/15 bg-[#07111f] lg:min-h-[480px] lg:border-b-0 lg:border-r">
            {robotPhoto ? (
              <img src={robotPhoto} alt={`Team ${team.teamNumber} robot`} className="absolute inset-0 h-full w-full object-contain p-3" />
            ) : (
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center text-slate-700">
                  <Camera size={52} className="mx-auto mb-3" />
                  <div className="text-sm font-semibold uppercase tracking-[0.16em]">No robot photo yet</div>
                </div>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07111f] via-[#07111f]/80 to-transparent px-5 pb-5 pt-20">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffd84d]">Team 1731 scouting card</div>
              <div className="mt-1 text-5xl font-black tracking-tight text-white">{team.teamNumber}</div>
              <div className="mt-1 text-xl font-semibold text-slate-200">{team.nickname}</div>
              <div className="mt-1 text-sm text-slate-500">{[team.city, team.stateProv].filter(Boolean).join(", ")}</div>
            </div>
          </div>

          <div className="p-5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">{eventKey}</div>
                <h1 className="mt-1 text-2xl font-bold text-white">Event snapshot</h1>
                <p className="mt-1 text-sm text-slate-500">
                  {summary.uniqueMatches} scouted matches · {scoutingEntries.length} reports · {summary.scoutCount} scouts
                </p>
              </div>
              {loading ? <div className="text-xs text-slate-500">Refreshing scouting data…</div> : null}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <HeroStat label="Rank" value={team.rank?.toString() ?? "—"} />
              <HeroStat label="OPR" value={formatNumber(team.opr)} />
              <HeroStat label="EPA" value={formatNumber(team.epa)} />
              <HeroStat label="Record" value={team.record ? `${team.record.wins}-${team.record.losses}-${team.record.ties}` : "—"} />
              <HeroStat label="Auto fuel" value={formatNumber(summary.autoFuel)} />
              <HeroStat label="Teleop fuel" value={formatNumber(summary.teleopFuel)} />
              <HeroStat label="Total fuel" value={formatNumber(summary.totalFuel)} />
              <HeroStat label="Climb pts" value={formatNumber(summary.climbPoints)} />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Auto EPA" value={formatNumber(team.epaAuto)} />
              <MiniStat label="Teleop EPA" value={formatNumber(team.epaTeleop)} />
              <MiniStat label="Endgame EPA" value={formatNumber(team.epaEndgame)} />
              <MiniStat label="Driver rating" value={formatNumber(summary.driverRating)} />
              <MiniStat label="Defense rating" value={formatNumber(summary.defenseRating)} />
              <MiniStat label="Reliability issues" value={formatPercent(summary.issueRate)} />
            </div>

            <div className="mt-5 rounded-xl border border-blue-300/10 bg-[#07111f]/60 px-4 py-3 text-xs text-slate-500">
              {matchCount} matches on the official event schedule. Public metrics are event context; 1731 scouting averages come only from synced team observations.
            </div>
          </div>
        </div>
      </section>

      {message ? <div className="rounded-xl border border-yellow-300/20 bg-yellow-300/5 p-4 text-sm text-yellow-100">{message}</div> : null}

      <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-5">
        <div className="flex items-center gap-2">
          <Gauge size={19} className="text-[#ffd84d]" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-[#ffd84d]">1731 observations</div>
            <h2 className="mt-1 text-xl font-bold text-white">Scouting averages</h2>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {config.fields.map((field) => (
            <Stat key={field.key} label={`${field.phase === "auto" ? "Auto" : field.phase === "teleop" ? "Teleop" : "Endgame"} · ${field.label}`} value={fieldValue(field, scoutingEntries)} />
          ))}
          <Stat label="Driver rating avg" value={formatNumber(summary.driverRating)} />
          <Stat label="Played defense" value={formatPercent(summary.playedDefense)} />
          <Stat label="Defense rating avg" value={formatNumber(summary.defenseRating)} />
          <Stat label="Penalties avg" value={formatNumber(summary.penalties)} />
          <Stat label="Any reliability issue" value={formatPercent(summary.issueRate)} />
        </div>
      </section>

      <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-5">
        <div className="flex items-center gap-2">
          <Wrench size={19} className="text-blue-300" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-300">Pit scouting</div>
            <h2 className="mt-1 text-xl font-bold text-white">Robot capability card</h2>
          </div>
        </div>

        {latestPit ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Drivetrain" value={pitLabels[latestPit.drivetrain] ?? latestPit.drivetrain} />
              <Stat label="Dimensions W × L × H" value={dimension(latestPit)} />
              <Stat label="Weight" value={latestPit.weightLbs === undefined ? "—" : `${latestPit.weightLbs} lb`} />
              <Stat label="Preferred role" value={pitLabels[latestPit.preferredRole] ?? latestPit.preferredRole} />
              <Stat label="Uses trench" value={yesNo(latestPit.usesTrench)} />
              <Stat label="Crosses bump" value={yesNo(latestPit.crossesBump)} />
              <Stat label="Floor intake" value={yesNo(latestPit.floorIntake)} />
              <Stat label="Can pass fuel" value={yesNo(latestPit.canPassFuel)} />
              <Stat label="Shoots while moving" value={yesNo(latestPit.shootsOnMove)} />
              <Stat label="Shooting range" value={pitLabels[latestPit.shootingRange] ?? latestPit.shootingRange} />
              <Stat label="Fuel capacity" value={latestPit.fuelCapacity === undefined ? "—" : String(latestPit.fuelCapacity)} />
              <Stat label="Max tower" value={pitLabels[latestPit.maxTowerLevel] ?? latestPit.maxTowerLevel} />
              <Stat label="Claimed autos" value={String(latestPit.autoCount)} />
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <Clock3 size={14} /> Pit report by <span className="font-semibold text-slate-300">{latestPit.scoutName}</span> · {createdLabel(latestPit.createdAt)}
            </div>
          </>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-blue-300/15 px-4 py-8 text-center text-sm text-slate-500">No synced pit report for this team yet.</div>
        )}
      </section>

      <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-5">
        <div className="flex items-center gap-2">
          <NotebookPen size={19} className="text-[#ffd84d]" />
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.15em] text-[#ffd84d]">Scout notes</div>
            <h2 className="mt-1 text-xl font-bold text-white">Notes & observations</h2>
          </div>
        </div>

        {notes.length ? (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {notes.map((note) => (
              <article key={note.key} className="rounded-xl border border-blue-300/10 bg-[#07111f]/60 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-600">{note.label}</div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{note.text}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-blue-300/15 px-4 py-8 text-center text-sm text-slate-500">No written notes for this team yet.</div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80">
        <div className="flex items-center justify-between gap-4 border-b border-blue-400/10 bg-[#11243d] px-5 py-4">
          <div className="flex items-center gap-2">
            <ClipboardList size={19} className="text-[#ffd84d]" />
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.15em] text-[#ffd84d]">Audit trail</div>
              <h2 className="mt-1 text-xl font-bold text-white">Individual match reports</h2>
            </div>
          </div>
          <div className="text-sm font-semibold text-slate-400">{scoutingEntries.length} reports</div>
        </div>

        {scoutingEntries.length ? (
          <div className="divide-y divide-blue-400/10">
            {scoutingEntries.map((entry) => (
              <details key={entry.clientId} className="group">
                <summary className="grid cursor-pointer list-none gap-2 px-5 py-4 hover:bg-[#0b5fff]/5 sm:grid-cols-[90px_minmax(0,1fr)_auto] sm:items-center">
                  <div className="text-lg font-bold text-[#ffd84d]">Q{entry.matchNumber}</div>
                  <div>
                    <div className="font-semibold text-white">{entry.scoutName}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{createdLabel(entry.createdAt)} · {entry.alliance?.toUpperCase() ?? "—"} alliance{entry.source ? ` · ${entry.source}` : ""}</div>
                  </div>
                  <div className="text-xs font-semibold text-slate-500 group-open:text-[#ffd84d]">View report</div>
                </summary>

                <div className="border-t border-blue-400/10 bg-[#07111f]/45 px-5 py-5">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {config.fields.map((field) => (
                      <Stat key={field.key} label={field.label} value={singleFieldValue(field, entry.gameData[field.key])} />
                    ))}
                    <Stat label="Driver rating" value={formatNumber(entry.driverRating)} />
                    <Stat label="Defense faced" value={entry.defense} />
                    <Stat label="Played defense" value={entry.playedDefense === undefined ? "—" : yesNo(entry.playedDefense)} />
                    <Stat label="Defense rating" value={formatNumber(entry.defenseRating)} />
                    <Stat label="Penalties" value={String(entry.penalties)} />
                    <Stat label="Disabled" value={yesNo(entry.disabled)} />
                    <Stat label="Tipped" value={yesNo(entry.tipped)} />
                    <Stat label="Mechanical issue" value={yesNo(entry.mechanicalIssue)} />
                  </div>
                  {entry.notes.trim() ? (
                    <div className="mt-4 rounded-xl border border-blue-300/10 bg-[#0d1b2e]/70 p-4">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">Match notes</div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">{entry.notes}</p>
                    </div>
                  ) : null}
                </div>
              </details>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-slate-500">No individual match reports have synced for this team yet.</div>
        )}
      </section>
    </div>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-blue-300/10 bg-[#07111f]/75 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">{label}</div>
      <div className="mt-1 font-mono text-2xl font-black text-white">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-blue-300/10 bg-[#07111f]/55 px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.08em] text-slate-600">{label}</div>
      <div className="mt-1 font-mono font-bold text-slate-200">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-blue-300/10 bg-[#07111f]/60 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-base font-semibold text-white">{value}</div>
    </div>
  );
}
