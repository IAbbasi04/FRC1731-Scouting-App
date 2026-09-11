"use client";

import { useEffect, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

type CloudPitEntry = {
  clientId: string;
  createdAt: string;
  scoutName: string;
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

const listTeamEntries = makeFunctionReference<"query">("pitScouting:listTeamEntries");

const labels: Record<string, string> = {
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

function yesNo(value: boolean) {
  return value ? "Yes" : "No";
}

function dimension(entry: CloudPitEntry) {
  const values = [entry.widthIn, entry.lengthIn, entry.heightIn];
  return values.some((value) => typeof value === "number")
    ? `${entry.widthIn ?? "?"} × ${entry.lengthIn ?? "?"} × ${entry.heightIn ?? "?"} in`
    : "—";
}

export function TeamPitSummary({ eventKey, teamNumber }: { eventKey: string; teamNumber: number }) {
  const [entry, setEntry] = useState<CloudPitEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const url = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!url) throw new Error("Cloud pit scouting is not configured.");
        const client = new ConvexHttpClient(url);
        const result = await client.query(listTeamEntries, { eventKey: eventKey.toLowerCase(), teamNumber }) as CloudPitEntry[];
        const latest = [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
        if (!cancelled) setEntry(latest);
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load pit scouting.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [eventKey, teamNumber]);

  if (loading) return <div className="rounded-2xl border border-blue-400/15 bg-[#0d1b2e]/70 p-4 text-sm text-slate-500">Loading pit scouting…</div>;
  if (error) return <div className="rounded-2xl border border-red-400/20 bg-red-950/20 p-4 text-sm text-red-200">{error}</div>;
  if (!entry) return <div className="rounded-2xl border border-blue-400/15 bg-[#0d1b2e]/70 p-4 text-sm text-slate-500">No synced pit scouting for Team {teamNumber} at {eventKey}.</div>;

  return (
    <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/85 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Pit-reported capability</div>
          <h2 className="mt-1 text-xl font-semibold text-white">Robot profile</h2>
          <p className="mt-1 text-xs text-slate-500">Team/pit claims should be validated against match observations before pick-list decisions.</p>
        </div>
        <div className="text-right text-xs text-slate-500">Scouted by {entry.scoutName}</div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Drivetrain" value={labels[entry.drivetrain] ?? entry.drivetrain} />
        <Stat label="Dimensions W × L × H" value={dimension(entry)} />
        <Stat label="Weight" value={entry.weightLbs === undefined ? "—" : `${entry.weightLbs} lb`} />
        <Stat label="Preferred role" value={labels[entry.preferredRole] ?? entry.preferredRole} />
        <Stat label="Uses trench" value={yesNo(entry.usesTrench)} />
        <Stat label="Crosses bump" value={yesNo(entry.crossesBump)} />
        <Stat label="Floor intake" value={yesNo(entry.floorIntake)} />
        <Stat label="Can pass fuel" value={yesNo(entry.canPassFuel)} />
        <Stat label="Shoots while moving" value={yesNo(entry.shootsOnMove)} />
        <Stat label="Claimed shooting range" value={labels[entry.shootingRange] ?? entry.shootingRange} />
        <Stat label="Fuel capacity" value={entry.fuelCapacity === undefined ? "—" : String(entry.fuelCapacity)} />
        <Stat label="Max tower level" value={labels[entry.maxTowerLevel] ?? entry.maxTowerLevel} />
        <Stat label="Autos available" value={String(entry.autoCount)} />
      </div>

      {(entry.autoNotes || entry.intakeNotes || entry.reliabilityNotes || entry.notes) ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {entry.autoNotes ? <Note title="Auto notes" body={entry.autoNotes} /> : null}
          {entry.intakeNotes ? <Note title="Intake notes" body={entry.intakeNotes} /> : null}
          {entry.reliabilityNotes ? <Note title="Reliability notes" body={entry.reliabilityNotes} /> : null}
          {entry.notes ? <Note title="General pit notes" body={entry.notes} /> : null}
        </div>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-blue-300/10 bg-[#07111f]/60 p-3"><div className="text-xs text-slate-500">{label}</div><div className="mt-1 text-base font-semibold text-white">{value}</div></div>;
}

function Note({ title, body }: { title: string; body: string }) {
  return <div className="rounded-xl border border-blue-300/10 bg-[#07111f]/60 p-3"><div className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{title}</div><p className="mt-2 text-sm text-slate-300">{body}</p></div>;
}
