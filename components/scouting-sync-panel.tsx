"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { isCloudSyncConfigured, syncPendingEntries } from "@/lib/scouting-sync";
import type { MatchScoutingEntry, StoredScoutingEntry } from "@/types/scouting";

const STORAGE_KEY = "1731.match-scouting.entries.v1";

function loadEntries(): StoredScoutingEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredScoutingEntry[]) : [];
  } catch {
    return [];
  }
}

export function ScoutingSyncPanel() {
  const [entries, setEntries] = useState<StoredScoutingEntry[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const configured = isCloudSyncConfigured();

  const refresh = useCallback(() => {
    setEntries(loadEntries());
  }, []);

  const modernEntries = useMemo(
    () => entries.filter((entry): entry is MatchScoutingEntry => entry.schemaVersion === 2),
    [entries],
  );
  const pending = modernEntries.filter((entry) => entry.syncStatus !== "synced");
  const synced = modernEntries.length - pending.length;

  const syncNow = useCallback(async (automatic = false) => {
    const latest = loadEntries();
    const pendingLatest = latest.filter(
      (entry): entry is MatchScoutingEntry => entry.schemaVersion === 2 && entry.syncStatus !== "synced",
    );

    if (!automatic) setMessage(null);

    if (!configured) {
      if (!automatic) setMessage("Cloud sync is not configured yet. Initialize Convex, then add NEXT_PUBLIC_CONVEX_URL.");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      if (!automatic) setMessage("You are offline. Entries remain safely queued on this device and will retry when connectivity returns.");
      return;
    }
    if (pendingLatest.length === 0) {
      setEntries(latest);
      if (!automatic) setMessage("Everything in the current queue is already synced.");
      return;
    }

    setSyncing(true);
    try {
      const { syncedIds, failedIds } = await syncPendingEntries(pendingLatest);
      const syncedSet = new Set(syncedIds);
      const updated = latest.map((entry) => {
        if (entry.schemaVersion !== 2 || !syncedSet.has(entry.id)) return entry;
        return { ...entry, syncStatus: "synced" as const };
      });
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setEntries(updated);
      setMessage(
        failedIds.length === 0
          ? `${automatic ? "Connection restored — " : ""}synced ${syncedIds.length} entr${syncedIds.length === 1 ? "y" : "ies"}.`
          : `Synced ${syncedIds.length}; ${failedIds.length} remain queued for retry.`,
      );
    } catch (error) {
      if (!automatic) setMessage(error instanceof Error ? error.message : "Cloud sync failed. Entries remain saved locally.");
    } finally {
      setSyncing(false);
    }
  }, [configured]);

  useEffect(() => {
    refresh();
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      refresh();
      void syncNow(true);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setMessage("Offline mode active. New scouting entries will stay on this device until connectivity returns.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) void syncNow(true);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refresh, syncNow]);

  return (
    <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {configured && isOnline ? <Cloud size={19} className="text-[#ffd84d]" /> : <CloudOff size={19} className="text-slate-500" />}
            <h2 className="font-semibold text-white">Scouting cloud sync</h2>
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${isOnline ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200" : "border-yellow-300/20 bg-yellow-300/10 text-yellow-100"}`}>
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Entries are always saved locally first. When the device reconnects, pending entries automatically retry cloud sync.
          </p>
        </div>
        <div className="flex gap-5 text-sm">
          <div><span className="text-slate-500">Pending</span><div className="text-xl font-bold text-[#ffd84d]">{pending.length}</div></div>
          <div><span className="text-slate-500">Synced</span><div className="text-xl font-bold text-white">{synced}</div></div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void syncNow(false)}
          disabled={syncing || !isOnline}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0b5fff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
        >
          <RefreshCw size={16} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Syncing…" : isOnline ? "Sync pending" : "Waiting for connection"}
        </button>
        <button type="button" onClick={refresh} className="rounded-xl border border-blue-300/20 px-4 py-2.5 text-sm text-slate-300 hover:border-[#ffd84d]/50">
          Refresh queue
        </button>
      </div>

      {message ? <div className="mt-4 rounded-xl border border-blue-300/15 bg-[#07111f]/70 p-3 text-sm text-slate-300">{message}</div> : null}
      {!configured ? <p className="mt-3 text-xs text-slate-600">Cloud sync requires NEXT_PUBLIC_CONVEX_URL for this deployment.</p> : null}
    </section>
  );
}
