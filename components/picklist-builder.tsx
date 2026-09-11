"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Ban,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  RefreshCw,
  RotateCcw,
  Tag,
  Undo2,
} from "lucide-react";

const OUR_TEAM_NUMBER = 1731;
const DEFAULT_TAGS = ["Scorer", "Defender", "Passer", "Auto", "Climber", "Flexible", "Reliability risk"];

type PickListTeam = {
  teamNumber: number;
  teamKey: string;
  nickname: string;
  city: string | null;
  stateProv: string | null;
  rank: number | null;
  opr: number | null;
  tags: string[];
};

type PickListResponse = {
  event: {
    key: string;
    name: string;
    year: number;
    city: string | null;
    stateProv: string | null;
  };
  teams: Array<Omit<PickListTeam, "tags">>;
};

type SavedPickList = {
  order: number[];
  dnpOrder?: number[];
  tags: Record<string, string[]>;
  customTags: string[];
  manualOrder: boolean;
};

function storageKey(eventKey: string) {
  return `1731.picklist.v1.${eventKey.toLowerCase()}`;
}

function sortByOpr(a: PickListTeam, b: PickListTeam) {
  if (a.opr === null && b.opr === null) return a.teamNumber - b.teamNumber;
  if (a.opr === null) return 1;
  if (b.opr === null) return -1;
  return b.opr - a.opr || a.teamNumber - b.teamNumber;
}

function tagClass(tag: string) {
  switch (tag) {
    case "Scorer": return "border-yellow-300/30 bg-yellow-300/10 text-yellow-100";
    case "Defender": return "border-red-300/25 bg-red-400/10 text-red-200";
    case "Passer": return "border-blue-300/30 bg-blue-400/10 text-blue-200";
    case "Auto": return "border-violet-300/30 bg-violet-400/10 text-violet-200";
    case "Climber": return "border-emerald-300/30 bg-emerald-400/10 text-emerald-200";
    case "Flexible": return "border-cyan-300/30 bg-cyan-400/10 text-cyan-200";
    case "Reliability risk": return "border-orange-300/30 bg-orange-400/10 text-orange-200";
    default: return "border-slate-300/20 bg-slate-300/10 text-slate-200";
  }
}

export function PickListBuilder() {
  const [eventCode, setEventCode] = useState("");
  const [eventInfo, setEventInfo] = useState<PickListResponse["event"] | null>(null);
  const [teams, setTeams] = useState<PickListTeam[]>([]);
  const [dnpTeams, setDnpTeams] = useState<PickListTeam[]>([]);
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [expandedTeam, setExpandedTeam] = useState<number | null>(null);
  const [draggingTeam, setDraggingTeam] = useState<number | null>(null);
  const [manualOrder, setManualOrder] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const availableTags = useMemo(() => [...DEFAULT_TAGS, ...customTags], [customTags]);

  useEffect(() => {
    if (!eventInfo || (teams.length === 0 && dnpTeams.length === 0)) return;
    const all = [...teams, ...dnpTeams];
    const saved: SavedPickList = {
      order: teams.map((team) => team.teamNumber),
      dnpOrder: dnpTeams.map((team) => team.teamNumber),
      tags: Object.fromEntries(all.map((team) => [String(team.teamNumber), team.tags])),
      customTags,
      manualOrder,
    };
    window.localStorage.setItem(storageKey(eventInfo.key), JSON.stringify(saved));
  }, [customTags, dnpTeams, eventInfo, manualOrder, teams]);

  async function loadEvent(event: FormEvent) {
    event.preventDefault();
    const normalized = eventCode.trim().toLowerCase();
    if (!normalized) return;

    setLoading(true);
    setMessage(null);
    setEventInfo(null);
    setTeams([]);
    setDnpTeams([]);
    setExpandedTeam(null);

    try {
      const response = await fetch(`/api/picklist/${encodeURIComponent(normalized)}`);
      const data = (await response.json()) as PickListResponse | { error?: string };
      if (!response.ok || !("event" in data)) {
        throw new Error("error" in data && data.error ? data.error : "Could not load this event.");
      }

      const baseTeams: PickListTeam[] = data.teams
        .filter((team) => team.teamNumber !== OUR_TEAM_NUMBER)
        .map((team) => ({ ...team, tags: [] }));

      let nextTeams = [...baseTeams].sort(sortByOpr);
      let nextDnpTeams: PickListTeam[] = [];
      let nextCustomTags: string[] = [];
      let restored = false;
      let restoredManualOrder = false;

      try {
        const raw = window.localStorage.getItem(storageKey(data.event.key));
        if (raw) {
          const saved = JSON.parse(raw) as SavedPickList;
          const byTeam = new Map(baseTeams.map((team) => [team.teamNumber, team]));
          const used = new Set<number>();
          const withSavedTags = (team: PickListTeam) => ({
            ...team,
            tags: Array.isArray(saved.tags?.[String(team.teamNumber)])
              ? saved.tags[String(team.teamNumber)].filter((tag): tag is string => typeof tag === "string")
              : [],
          });

          const ordered: PickListTeam[] = [];
          for (const teamNumber of saved.order ?? []) {
            const team = byTeam.get(teamNumber);
            if (!team || used.has(teamNumber)) continue;
            used.add(teamNumber);
            ordered.push(withSavedTags(team));
          }

          const dnp: PickListTeam[] = [];
          for (const teamNumber of saved.dnpOrder ?? []) {
            const team = byTeam.get(teamNumber);
            if (!team || used.has(teamNumber)) continue;
            used.add(teamNumber);
            dnp.push(withSavedTags(team));
          }

          for (const team of baseTeams) {
            if (used.has(team.teamNumber)) continue;
            ordered.push(withSavedTags(team));
          }

          nextTeams = ordered;
          nextDnpTeams = dnp;
          nextCustomTags = Array.isArray(saved.customTags)
            ? saved.customTags.filter((tag): tag is string => typeof tag === "string")
            : [];
          restoredManualOrder = Boolean(saved.manualOrder);
          restored = true;
        }
      } catch {
        // Ignore a corrupt local draft and start with fresh event data.
      }

      setEventInfo(data.event);
      setEventCode(data.event.key);
      setTeams(nextTeams);
      setDnpTeams(nextDnpTeams);
      setCustomTags(nextCustomTags);
      setManualOrder(restoredManualOrder);
      setMessage(restored ? "Loaded your saved ranking, tags, and DNP list." : "Loaded all eligible event teams, initially sorted by OPR.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load this event.");
    } finally {
      setLoading(false);
    }
  }

  function moveTeam(sourceTeam: number, targetTeam: number) {
    if (sourceTeam === targetTeam) return;
    setTeams((current) => {
      const sourceIndex = current.findIndex((team) => team.teamNumber === sourceTeam);
      const targetIndex = current.findIndex((team) => team.teamNumber === targetTeam);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setManualOrder(true);
  }

  function moveBy(teamNumber: number, offset: number) {
    setTeams((current) => {
      const index = current.findIndex((team) => team.teamNumber === teamNumber);
      const target = index + offset;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setManualOrder(true);
  }

  function toggleTag(teamNumber: number, tag: string) {
    const apply = (current: PickListTeam[]) => current.map((team) => {
      if (team.teamNumber !== teamNumber) return team;
      return {
        ...team,
        tags: team.tags.includes(tag) ? team.tags.filter((item) => item !== tag) : [...team.tags, tag],
      };
    });
    setTeams(apply);
    setDnpTeams(apply);
  }

  function markDnp(teamNumber: number) {
    setTeams((current) => {
      const team = current.find((item) => item.teamNumber === teamNumber);
      if (!team) return current;
      setDnpTeams((dnp) => [...dnp.filter((item) => item.teamNumber !== teamNumber), team]);
      return current.filter((item) => item.teamNumber !== teamNumber);
    });
    if (expandedTeam === teamNumber) setExpandedTeam(null);
    setMessage(`Team ${teamNumber} moved to Do Not Pick.`);
  }

  function restoreFromDnp(teamNumber: number) {
    setDnpTeams((current) => {
      const team = current.find((item) => item.teamNumber === teamNumber);
      if (!team) return current;
      setTeams((ranked) => [...ranked, team].sort(sortByOpr));
      return current.filter((item) => item.teamNumber !== teamNumber);
    });
    setManualOrder(false);
    setMessage(`Team ${teamNumber} restored to the pick list and placed by OPR.`);
  }

  function addCustomTag(event: FormEvent) {
    event.preventDefault();
    const tag = customTag.trim().slice(0, 28);
    if (!tag) return;
    const duplicate = availableTags.some((item) => item.toLowerCase() === tag.toLowerCase());
    if (!duplicate) setCustomTags((current) => [...current, tag]);
    setCustomTag("");
  }

  function resetToOpr() {
    setTeams((current) => [...current].sort(sortByOpr));
    setManualOrder(false);
    setMessage("Reset the active pick list to OPR order. DNP teams and tags were kept.");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/85 p-4 sm:p-6">
        <form onSubmit={loadEvent} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 space-y-2 text-sm">
            <span className="font-medium text-slate-300">Event code</span>
            <input value={eventCode} onChange={(event) => setEventCode(event.target.value)} placeholder="2026vahay" autoCapitalize="none" className={inputClass} />
          </label>
          <button type="submit" disabled={loading || !eventCode.trim()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#0b5fff] px-5 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-50">
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            {loading ? "Loading event…" : "Generate pick list"}
          </button>
        </form>
        <p className="mt-3 text-xs text-slate-500">Initial order uses TBA OPR. Team 1731 is automatically excluded. Ranking, tags, and DNP status save locally per event.</p>
        {message ? <div className="mt-4 rounded-xl border border-blue-300/15 bg-[#07111f]/70 px-3 py-2 text-sm text-slate-300">{message}</div> : null}
      </section>

      {eventInfo ? (
        <>
          <section className="rounded-2xl border border-yellow-300/20 bg-yellow-300/5 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#ffd84d]">{eventInfo.key}</div>
                <h2 className="mt-1 text-xl font-semibold text-white sm:text-2xl">{eventInfo.name}</h2>
                <p className="mt-1 text-sm text-slate-400">{teams.length} eligible teams · {dnpTeams.length} DNP{eventInfo.city ? ` · ${eventInfo.city}${eventInfo.stateProv ? `, ${eventInfo.stateProv}` : ""}` : ""}{manualOrder ? " · Manual order" : " · OPR order"}</p>
              </div>
              <button type="button" onClick={resetToOpr} className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-300/30 px-4 py-2.5 text-sm font-semibold text-yellow-100 hover:bg-yellow-300/10">
                <RotateCcw size={16} /> Reset to OPR
              </button>
            </div>

            <form onSubmit={addCustomTag} className="mt-4 flex flex-col gap-2 border-t border-yellow-300/10 pt-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-300"><Tag size={15} /> Custom tag</div>
              <input value={customTag} onChange={(event) => setCustomTag(event.target.value)} placeholder="e.g. elite auto" className={`${inputClass} sm:max-w-xs`} />
              <button type="submit" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-[#ffd84d]/40"><Plus size={15} /> Add tag</button>
            </form>
          </section>

          <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70">
            <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2 border-b border-blue-400/10 bg-[#11243d] px-3 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 sm:grid-cols-[60px_64px_minmax(0,1fr)_120px_110px_auto] sm:px-4">
              <span>Pick</span><span className="hidden sm:block">Move</span><span>Team</span><span className="hidden sm:block">OPR</span><span className="hidden sm:block">Rank</span><span>Actions</span>
            </div>

            <div className="divide-y divide-blue-400/10">
              {teams.map((team, index) => {
                const expanded = expandedTeam === team.teamNumber;
                const isDragging = draggingTeam === team.teamNumber;
                return (
                  <article key={team.teamNumber} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (draggingTeam !== null) moveTeam(draggingTeam, team.teamNumber); setDraggingTeam(null); }} className={isDragging ? "bg-[#0b5fff]/10 opacity-60" : "bg-transparent"}>
                    <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2 px-3 py-3 sm:grid-cols-[60px_64px_minmax(0,1fr)_120px_110px_auto] sm:px-4">
                      <div className="text-center text-xl font-bold text-[#ffd84d]">{index + 1}</div>
                      <div className="hidden items-center sm:flex">
                        <button type="button" draggable onDragStart={(event) => { setDraggingTeam(team.teamNumber); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(team.teamNumber)); }} onDragEnd={() => setDraggingTeam(null)} className="cursor-grab rounded-lg p-2 text-slate-500 hover:bg-[#0b5fff]/15 hover:text-slate-200 active:cursor-grabbing" aria-label={`Drag Team ${team.teamNumber}`} title="Drag to reorder"><GripVertical size={20} /></button>
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-baseline gap-x-2"><span className="text-lg font-bold text-white">{team.teamNumber}</span><span className="truncate text-sm text-slate-300">{team.nickname}</span></div>
                        <div className="mt-1 flex flex-wrap gap-1.5 sm:hidden"><span className="text-xs text-slate-500">OPR {team.opr === null ? "—" : team.opr.toFixed(1)}</span><span className="text-xs text-slate-600">· TBA rank {team.rank ?? "—"}</span></div>
                        {team.tags.length ? <div className="mt-2 flex flex-wrap gap-1.5">{team.tags.map((tag) => <span key={tag} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tagClass(tag)}`}>{tag}</span>)}</div> : null}
                      </div>
                      <div className="hidden font-mono text-lg font-semibold text-white sm:block">{team.opr === null ? "—" : team.opr.toFixed(1)}</div>
                      <div className="hidden text-sm text-slate-300 sm:block">{team.rank ?? "—"}</div>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button type="button" onClick={() => moveBy(team.teamNumber, -1)} disabled={index === 0} className="rounded-lg border border-blue-300/15 p-2 text-slate-400 hover:text-white disabled:opacity-25" aria-label={`Move Team ${team.teamNumber} up`}><ChevronUp size={17} /></button>
                        <button type="button" onClick={() => moveBy(team.teamNumber, 1)} disabled={index === teams.length - 1} className="rounded-lg border border-blue-300/15 p-2 text-slate-400 hover:text-white disabled:opacity-25" aria-label={`Move Team ${team.teamNumber} down`}><ChevronDown size={17} /></button>
                        <button type="button" onClick={() => setExpandedTeam(expanded ? null : team.teamNumber)} className={`rounded-lg border px-2.5 py-2 text-xs font-semibold ${expanded ? "border-[#ffd84d]/40 bg-[#ffd84d]/10 text-[#ffd84d]" : "border-blue-300/15 text-slate-300 hover:border-[#ffd84d]/35"}`}>Tags</button>
                        <button type="button" onClick={() => markDnp(team.teamNumber)} className="inline-flex items-center gap-1 rounded-lg border border-red-300/25 bg-red-400/5 px-2.5 py-2 text-xs font-semibold text-red-200 hover:bg-red-400/10" title="Move to Do Not Pick"><Ban size={14} /> DNP</button>
                      </div>
                    </div>

                    {expanded ? (
                      <div className="border-t border-blue-400/10 bg-[#07111f]/55 px-3 py-3 sm:px-4">
                        <div className="flex flex-wrap gap-2">{availableTags.map((tag) => { const selected = team.tags.includes(tag); return <button key={tag} type="button" onClick={() => toggleTag(team.teamNumber, tag)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${selected ? tagClass(tag) : "border-blue-300/15 bg-[#07111f] text-slate-400 hover:border-blue-300/30 hover:text-slate-200"}`}>{selected ? "✓ " : "+ "}{tag}</button>; })}</div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          {dnpTeams.length > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-red-400/25 bg-red-950/15">
              <div className="flex items-center justify-between border-b border-red-400/15 bg-red-950/30 px-4 py-3">
                <div><div className="text-xs font-semibold uppercase tracking-[0.16em] text-red-300">Do Not Pick</div><p className="mt-1 text-xs text-slate-500">These teams are removed from the active ranking.</p></div>
                <div className="rounded-full border border-red-300/20 px-2.5 py-1 text-xs font-semibold text-red-200">{dnpTeams.length}</div>
              </div>
              <div className="divide-y divide-red-400/10">
                {dnpTeams.map((team) => (
                  <div key={team.teamNumber} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 opacity-60">
                      <div className="flex flex-wrap items-baseline gap-2 line-through decoration-red-400/80 decoration-2"><span className="text-lg font-bold text-slate-300">{team.teamNumber}</span><span className="truncate text-sm text-slate-400">{team.nickname}</span><span className="text-xs text-slate-500">OPR {team.opr === null ? "—" : team.opr.toFixed(1)}</span></div>
                      {team.tags.length ? <div className="mt-2 flex flex-wrap gap-1.5 no-underline">{team.tags.map((tag) => <span key={tag} className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tagClass(tag)}`}>{tag}</span>)}</div> : null}
                    </div>
                    <button type="button" onClick={() => restoreFromDnp(team.teamNumber)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300/20 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-yellow-300/35 hover:text-yellow-100"><Undo2 size={14} /> Restore</button>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <p className="px-1 text-xs text-slate-600">Drag the grip handle on desktop, use arrows on any device, or tap DNP to move a team into the crossed-out Do Not Pick section. Changes save automatically.</p>
        </>
      ) : null}
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-blue-300/20 bg-[#07111f] px-3 py-2.5 text-white outline-none placeholder:text-slate-700 focus:border-[#0b5fff]";
