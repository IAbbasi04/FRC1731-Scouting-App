"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { Search, Users } from "lucide-react";
import type { EventDashboardTeam } from "@/types/frc";

const EVENT_KEY = "2026vaale1";
const listPitEntries = makeFunctionReference<"query">("pitScouting:listEventEntries");

type PitEntry = {
  teamNumber: number;
  createdAt: string;
  robotPhotoDataUrl?: string;
};

export function IcebreakerTeamsDirectory({ teams }: { teams: EventDashboardTeam[] }) {
  const [search, setSearch] = useState("");
  const [photos, setPhotos] = useState<Map<number, string>>(new Map());

  useEffect(() => {
    let cancelled = false;
    async function loadPhotos() {
      try {
        const url = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!url) return;
        const client = new ConvexHttpClient(url);
        const entries = await client.query(listPitEntries, { eventKey: EVENT_KEY }) as PitEntry[];
        if (cancelled) return;

        const sorted = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const next = new Map<number, string>();
        for (const entry of sorted) {
          if (!next.has(entry.teamNumber) && entry.robotPhotoDataUrl) {
            next.set(entry.teamNumber, entry.robotPhotoDataUrl);
          }
        }
        setPhotos(next);
      } catch {
        // Team directory still works without pit photos.
      }
    }
    void loadPhotos();
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return teams;
    return teams.filter((team) =>
      String(team.teamNumber).includes(query)
      || team.nickname.toLowerCase().includes(query)
      || (team.city ?? "").toLowerCase().includes(query)
      || (team.stateProv ?? "").toLowerCase().includes(query),
    );
  }, [search, teams]);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-4">
        <label className="block max-w-xl space-y-2 text-sm">
          <span className="font-medium text-slate-300">Find a team</span>
          <div className="relative">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Team number, name, city…"
              className="min-h-11 w-full rounded-xl border border-blue-300/20 bg-[#07111f] py-2.5 pl-10 pr-3 text-white outline-none placeholder:text-slate-700 focus:border-[#0b5fff]"
            />
          </div>
        </label>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((team) => {
          const photo = photos.get(team.teamNumber);
          return (
            <Link
              key={team.teamNumber}
              href={`/teams/${team.teamNumber}?event=${EVENT_KEY}`}
              className="group overflow-hidden rounded-2xl border border-blue-400/15 bg-[#0d1b2e]/85 transition hover:-translate-y-0.5 hover:border-[#ffd84d]/45 hover:shadow-xl hover:shadow-black/20"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-[#07111f]">
                {photo ? (
                  <img src={photo} alt={`Team ${team.teamNumber} robot`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                ) : (
                  <div className="grid h-full place-items-center">
                    <div className="text-center text-slate-700">
                      <Users size={34} className="mx-auto mb-2" />
                      <div className="text-xs font-semibold uppercase tracking-[0.16em]">No pit photo</div>
                    </div>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#07111f] via-[#07111f]/80 to-transparent px-4 pb-3 pt-10">
                  <div className="text-3xl font-black text-[#ffd84d]">{team.teamNumber}</div>
                  <div className="truncate text-sm font-semibold text-white">{team.nickname}</div>
                </div>
              </div>

              <div className="grid grid-cols-3 divide-x divide-blue-400/10 border-t border-blue-400/10">
                <Metric label="Rank" value={team.rank?.toString() ?? "—"} />
                <Metric label="OPR" value={team.opr === null ? "—" : team.opr.toFixed(1)} />
                <Metric label="EPA" value={team.epa === null ? "—" : team.epa.toFixed(1)} />
              </div>
              <div className="px-4 py-3 text-xs text-slate-500">
                {[team.city, team.stateProv].filter(Boolean).join(", ") || "Location unavailable"}
              </div>
            </Link>
          );
        })}
      </section>

      {!filtered.length ? (
        <div className="rounded-2xl border border-dashed border-blue-300/15 px-4 py-10 text-center text-sm text-slate-500">
          No Icebreaker team matches that search.
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">{label}</div>
      <div className="mt-1 font-mono text-base font-bold text-white">{value}</div>
    </div>
  );
}
