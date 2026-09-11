"use client";

import { FormEvent, useState } from "react";
import type { TbaTeam } from "@/types/frc";

export function EventLookup() {
  const [eventKey, setEventKey] = useState("");
  const [teams, setTeams] = useState<TbaTeam[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!eventKey.trim()) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/tba/event/${eventKey.trim()}/teams`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load event teams.");
      setTeams(data);
    } catch (err) {
      setTeams([]);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally { setLoading(false); }
  }

  return <div className="space-y-6">
    <form onSubmit={submit} className="flex max-w-2xl flex-col gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 sm:flex-row">
      <input value={eventKey} onChange={(event) => setEventKey(event.target.value)} aria-label="TBA event key" className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 outline-none focus:border-zinc-500" placeholder="e.g. 2026vahay" />
      <button disabled={loading || !eventKey.trim()} className="rounded-xl bg-white px-5 py-3 font-medium text-zinc-950 disabled:opacity-50">{loading ? "Loading…" : "Load event"}</button>
    </form>
    {error ? <p className="rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-200">{error}</p> : null}
    {teams.length > 0 ? <div className="overflow-hidden rounded-2xl border border-zinc-800"><div className="border-b border-zinc-800 bg-zinc-900 px-5 py-3 text-sm text-zinc-400">{teams.length} teams</div><div className="divide-y divide-zinc-800">{teams.map((team) => <div key={team.key} className="grid gap-1 px-5 py-4 sm:grid-cols-[110px_1fr_auto] sm:items-center"><div className="font-mono text-zinc-400">{team.team_number}</div><div><div className="font-medium">{team.nickname ?? team.name}</div><div className="text-sm text-zinc-500">{[team.city, team.state_prov, team.country].filter(Boolean).join(", ")}</div></div><div className="text-xs uppercase tracking-wide text-zinc-600">{team.key}</div></div>)}</div></div> : null}
  </div>;
}
