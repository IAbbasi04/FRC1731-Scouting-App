"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";

const EVENT_KEY = "2026vaale1";

type EventTeam = {
  teamNumber: number;
  teamKey: string;
  nickname: string;
  city: string | null;
  stateProv: string | null;
  rank: number | null;
  opr: number | null;
};

type EventResponse = {
  event: {
    key: string;
    name: string;
    year: number;
    city: string | null;
    stateProv: string | null;
  };
  teams: EventTeam[];
};

function formatOpr(value: number | null) {
  return value === null || !Number.isFinite(value) ? "—" : value.toFixed(1);
}

export function IcebreakerOpr() {
  const [data, setData] = useState<EventResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/picklist/${EVENT_KEY}`, { cache: "no-store" });
      const payload = await response.json() as EventResponse | { error?: string };
      if (!response.ok || !("teams" in payload)) {
        throw new Error("error" in payload && payload.error ? payload.error : "Could not load Icebreaker OPR.");
      }
      setData(payload);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load Icebreaker OPR.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const teams = useMemo(
    () => data ? [...data.teams].sort((a, b) => {
      if (a.opr === null && b.opr === null) return a.teamNumber - b.teamNumber;
      if (a.opr === null) return 1;
      if (b.opr === null) return -1;
      return b.opr - a.opr || a.teamNumber - b.teamNumber;
    }) : [],
    [data],
  );

  const maxOpr = Math.max(1, ...teams.map((team) => team.opr ?? 0));

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-white"><BarChart3 size={18} /><h3 className="font-bold">Icebreaker OPR</h3></div>
            <p className="mt-1 text-sm text-slate-400">Event-only OPR for teams attending {EVENT_KEY}. Use it as external context beside 1731 scouting observations, not as a replacement for them.</p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-blue-300/20 px-4 text-sm font-semibold text-slate-200 hover:border-[#ffd84d]/40 disabled:opacity-50">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
        {data ? <p className="mt-3 text-xs text-slate-600">{data.event.name} · {teams.length} teams</p> : null}
        {message ? <div className="mt-3 rounded-xl border border-red-400/20 bg-red-950/20 p-3 text-sm text-red-200">{message}</div> : null}
      </section>

      {loading && !data ? <div className="rounded-2xl border border-blue-400/15 bg-[#0d1b2e]/70 p-8 text-center text-sm text-slate-400">Loading Icebreaker OPR…</div> : null}

      {data ? (
        <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70">
          <div className="grid grid-cols-[48px_80px_minmax(0,1fr)_64px] gap-3 border-b border-blue-400/10 bg-[#11243d] px-3 py-3 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 sm:grid-cols-[56px_90px_minmax(0,1fr)_80px_80px] sm:px-4">
            <span>#</span><span>Team</span><span>OPR</span><span className="text-right">Value</span><span className="hidden text-right sm:block">TBA rank</span>
          </div>
          <div className="divide-y divide-blue-400/10">
            {teams.map((team, index) => (
              <div key={team.teamNumber} className="grid grid-cols-[48px_80px_minmax(0,1fr)_64px] items-center gap-3 px-3 py-3 sm:grid-cols-[56px_90px_minmax(0,1fr)_80px_80px] sm:px-4">
                <span className={`font-bold ${index < 3 ? "text-[#ffd84d]" : "text-slate-500"}`}>{index + 1}</span>
                <span className="font-bold text-white">{team.teamNumber}</span>
                <div className="h-3 overflow-hidden rounded-full bg-[#07111f]">
                  <div className="h-full rounded-full bg-[#0b5fff]" style={{ width: `${Math.max(0, ((team.opr ?? 0) / maxOpr) * 100)}%` }} />
                </div>
                <span className="text-right font-mono font-semibold text-slate-200">{formatOpr(team.opr)}</span>
                <span className="hidden text-right text-sm text-slate-500 sm:block">{team.rank ?? "—"}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
