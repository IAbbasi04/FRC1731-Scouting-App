"use client";

import { ConvexHttpClient } from "convex/browser";
import { anyApi } from "convex/server";
import type { MatchScoutingEntry } from "@/types/scouting";

let client: ConvexHttpClient | null = null;

export function isCloudSyncConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CONVEX_URL);
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
  if (!client) client = new ConvexHttpClient(url);
  return client;
}

export async function syncScoutingEntry(entry: MatchScoutingEntry) {
  const convex = getClient();
  await convex.mutation(anyApi.scouting.upsertEntry, {
    clientId: entry.id,
    schemaVersion: entry.schemaVersion,
    season: entry.season,
    gameKey: entry.gameKey,
    eventKey: entry.eventKey,
    matchNumber: entry.matchNumber,
    teamNumber: entry.teamNumber,
    scoutName: entry.scoutName,
    createdAt: entry.createdAt,
    alliance: entry.alliance,
    autoStart: entry.autoStart,
    gameData: entry.gameData,
    defense: entry.defense,
    penalties: entry.penalties,
    disabled: entry.disabled,
    tipped: entry.tipped,
    mechanicalIssue: entry.mechanicalIssue,
    notes: entry.notes,
    source: entry.source,
  });
}

export async function syncPendingEntries(entries: MatchScoutingEntry[]) {
  const results = await Promise.allSettled(entries.map(syncScoutingEntry));
  const syncedIds: string[] = [];
  const failedIds: string[] = [];

  results.forEach((result, index) => {
    const id = entries[index]?.id;
    if (!id) return;
    if (result.status === "fulfilled") syncedIds.push(id);
    else failedIds.push(id);
  });

  return { syncedIds, failedIds };
}
