import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import type { PitScoutingEntry } from "@/types/pit-scouting";

const upsertPitEntry = makeFunctionReference<"mutation">("pitScouting:upsertEntry");

export function isPitCloudSyncConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
}

function optionalNumber(value: number | null) {
  return value === null ? undefined : value;
}

export async function syncPitEntry(entry: PitScoutingEntry) {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("Cloud sync is not configured.");

  const client = new ConvexHttpClient(url);
  await client.mutation(upsertPitEntry, {
    clientId: entry.id,
    schemaVersion: entry.schemaVersion,
    season: entry.season,
    eventKey: entry.eventKey.toLowerCase(),
    teamNumber: entry.teamNumber,
    scoutName: entry.scoutName,
    createdAt: entry.createdAt,
    drivetrain: entry.drivetrain,
    widthIn: optionalNumber(entry.widthIn),
    lengthIn: optionalNumber(entry.lengthIn),
    heightIn: optionalNumber(entry.heightIn),
    weightLbs: optionalNumber(entry.weightLbs),
    usesTrench: entry.usesTrench,
    crossesBump: entry.crossesBump,
    floorIntake: entry.floorIntake,
    canPassFuel: entry.canPassFuel,
    shootsOnMove: entry.shootsOnMove,
    shootingRange: entry.shootingRange,
    fuelCapacity: optionalNumber(entry.fuelCapacity),
    maxTowerLevel: entry.maxTowerLevel,
    autoCount: entry.autoCount,
    autoNotes: entry.autoNotes,
    preferredRole: entry.preferredRole,
    intakeNotes: entry.intakeNotes,
    reliabilityNotes: entry.reliabilityNotes,
    notes: entry.notes,
  });
}

export async function syncPendingPitEntries(entries: PitScoutingEntry[]) {
  const results = await Promise.allSettled(entries.map((entry) => syncPitEntry(entry)));
  const syncedIds: string[] = [];
  const failedIds: string[] = [];

  results.forEach((result, index) => {
    if (result.status === "fulfilled") syncedIds.push(entries[index].id);
    else failedIds.push(entries[index].id);
  });

  return { syncedIds, failedIds };
}
