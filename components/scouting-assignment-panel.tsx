"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CalendarClock, PencilLine, RefreshCw, UserRoundCheck } from "lucide-react";
import type { TbaMatch } from "@/types/frc";

type Station = "red1" | "red2" | "red3" | "blue1" | "blue2" | "blue3";

type LoadedAssignment = {
  matchNumber: number;
  teamNumber: number;
  stationLabel: string;
  alliance: "red" | "blue";
  scoutName: string;
};

const PREFS_KEY = "1731.scouting-assignment-prefs.v1";
const CACHE_PREFIX = "1731.scouting-schedule.v1.";

const stations: Array<{ value: Station; label: string; alliance: "red" | "blue"; index: number }> = [
  { value: "red1", label: "Red 1", alliance: "red", index: 0 },
  { value: "red2", label: "Red 2", alliance: "red", index: 1 },
  { value: "red3", label: "Red 3", alliance: "red", index: 2 },
  { value: "blue1", label: "Blue 1", alliance: "blue", index: 0 },
  { value: "blue2", label: "Blue 2", alliance: "blue", index: 1 },
  { value: "blue3", label: "Blue 3", alliance: "blue", index: 2 },
];

function teamNumber(teamKey: string | undefined) {
  if (!teamKey) return null;
  const value = Number(teamKey.replace(/^frc/, ""));
  return Number.isFinite(value) ? value : null;
}

function scoutingForm() {
  return Array.from(document.querySelectorAll("form")).find((form) =>
    Array.from(form.querySelectorAll("label > span")).some((span) => span.textContent?.trim() === "Team"),
  );
}

function identitySection(form: HTMLFormElement) {
  return Array.from(form.querySelectorAll("section")).find((section) => {
    const labels = Array.from(section.querySelectorAll("label > span")).map((span) => span.textContent?.trim());
    return labels.includes("Event key") && labels.includes("Match") && labels.includes("Team") && labels.includes("Scout") && labels.includes("Alliance");
  });
}

function controlFor(form: HTMLFormElement, label: string) {
  const wrapper = Array.from(form.querySelectorAll("label")).find(
    (item) => item.querySelector(":scope > span")?.textContent?.trim() === label,
  );
  return wrapper?.querySelector("input, select") as HTMLInputElement | HTMLSelectElement | null;
}

function setControlValue(control: HTMLInputElement | HTMLSelectElement | null, value: string) {
  if (!control) return;
  const prototype = control instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(control, value);
  control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
}

export function ScoutingAssignmentPanel() {
  const [eventKey, setEventKey] = useState("");
  const [scoutName, setScoutName] = useState("");
  const [station, setStation] = useState<Station>("red1");
  const [matches, setMatches] = useState<TbaMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [currentAssignment, setCurrentAssignment] = useState<LoadedAssignment | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const prefs = JSON.parse(raw) as { eventKey?: string; scoutName?: string; station?: Station };
      const savedEvent = prefs.eventKey ?? "";
      setEventKey(savedEvent);
      setScoutName(prefs.scoutName ?? "");
      setStation(stations.some((item) => item.value === prefs.station) ? prefs.station! : "red1");
      if (savedEvent) {
        const cached = window.localStorage.getItem(`${CACHE_PREFIX}${savedEvent.toLowerCase()}`);
        if (cached) setMatches(JSON.parse(cached) as TbaMatch[]);
      }
    } catch {
      // Preferences are optional; a corrupt cache should not block scouting.
    }
  }, []);

  useEffect(() => {
    if (!eventKey && !scoutName) return;
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ eventKey, scoutName, station }));
  }, [eventKey, scoutName, station]);

  useEffect(() => {
    const form = scoutingForm();
    if (!form) return;

    const identity = identitySection(form);
    if (identity) identity.hidden = !manualEntry;

    const saveButton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const shouldDisable = !manualEntry && !currentAssignment;
    if (saveButton) {
      saveButton.disabled = shouldDisable;
      saveButton.classList.toggle("opacity-40", shouldDisable);
      saveButton.classList.toggle("cursor-not-allowed", shouldDisable);
    }
  }, [manualEntry, currentAssignment]);

  const qualificationMatches = useMemo(
    () => matches.filter((match) => match.comp_level === "qm").sort((a, b) => a.match_number - b.match_number),
    [matches],
  );

  const stationInfo = stations.find((item) => item.value === station) ?? stations[0];

  async function loadSchedule(event: FormEvent) {
    event.preventDefault();
    const normalized = eventKey.trim().toLowerCase();
    if (!normalized) return;
    setLoading(true);
    setMessage(null);
    setCurrentAssignment(null);

    try {
      const response = await fetch(`/api/tba/event/${encodeURIComponent(normalized)}/matches`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Could not load the event schedule.");
      const schedule = data as TbaMatch[];
      setMatches(schedule);
      window.localStorage.setItem(`${CACHE_PREFIX}${normalized}`, JSON.stringify(schedule));
      setEventKey(normalized);
      setMessage(`Loaded ${schedule.filter((match) => match.comp_level === "qm").length} qualification matches from TBA.`);
    } catch (error) {
      const cached = window.localStorage.getItem(`${CACHE_PREFIX}${normalized}`);
      if (cached) {
        setMatches(JSON.parse(cached) as TbaMatch[]);
        setMessage("Network unavailable — using the cached event schedule on this device.");
      } else {
        setMessage(error instanceof Error ? error.message : "Could not load the event schedule.");
      }
    } finally {
      setLoading(false);
    }
  }

  function loadAssignment(match: TbaMatch) {
    if (!scoutName.trim()) {
      setMessage("Enter the scout name before loading an assignment.");
      return;
    }

    const team = teamNumber(match.alliances[stationInfo.alliance].team_keys[stationInfo.index]);
    if (!team) {
      setMessage(`No team is listed for ${stationInfo.label} in Q${match.match_number}.`);
      return;
    }

    const form = scoutingForm();
    if (!form) {
      setMessage("The scouting form could not be found on this page.");
      return;
    }

    setControlValue(controlFor(form, "Event key"), eventKey.trim().toLowerCase());
    setControlValue(controlFor(form, "Match"), String(match.match_number));
    setControlValue(controlFor(form, "Team"), String(team));
    setControlValue(controlFor(form, "Scout"), scoutName.trim());
    setControlValue(controlFor(form, "Alliance"), stationInfo.alliance);

    setManualEntry(false);
    setCurrentAssignment({
      matchNumber: match.match_number,
      teamNumber: team,
      stationLabel: stationInfo.label,
      alliance: stationInfo.alliance,
      scoutName: scoutName.trim(),
    });
    setMessage(null);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleManualEntry() {
    setManualEntry((current) => {
      const next = !current;
      if (next) {
        setCurrentAssignment(null);
        setMessage("Manual entry enabled. Use this only for backfill or assignment corrections.");
      } else {
        setMessage("Manual fields hidden. Load a match assignment before saving.");
      }
      return next;
    });
  }

  return (
    <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/85 p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[#ffd84d]"><UserRoundCheck size={18} /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Scout station</span></div>
          <h2 className="mt-2 text-xl font-semibold text-white">Match assignment loader</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-500">Choose the scout and physical station once. Then tap the match you are scouting; the form is filled automatically.</p>
        </div>
        <button type="button" onClick={toggleManualEntry} className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300/20 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-[#ffd84d]/50 hover:text-white">
          <PencilLine size={14} /> {manualEntry ? "Use assignments" : "Edit manually"}
        </button>
      </div>

      <form onSubmit={loadSchedule} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_180px_auto] md:items-end">
        <label className="space-y-2 text-sm"><span className="font-medium text-slate-300">Event key</span><input value={eventKey} onChange={(event) => setEventKey(event.target.value)} placeholder="2026vaale" className={inputClass} /></label>
        <label className="space-y-2 text-sm"><span className="font-medium text-slate-300">Scout name</span><input value={scoutName} onChange={(event) => setScoutName(event.target.value)} placeholder="Name" className={inputClass} /></label>
        <label className="space-y-2 text-sm"><span className="font-medium text-slate-300">Station</span><select value={station} onChange={(event) => { setStation(event.target.value as Station); setCurrentAssignment(null); }} className={inputClass}>{stations.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <button type="submit" disabled={loading || !eventKey.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5fff] px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />{loading ? "Loading" : "Load schedule"}</button>
      </form>

      {currentAssignment && !manualEntry ? (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[#ffd84d]/30 bg-[#ffd84d]/8 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[#ffd84d]">Current assignment</div>
            <div className="mt-1 text-lg font-semibold text-white">Q{currentAssignment.matchNumber} · Team {currentAssignment.teamNumber}</div>
          </div>
          <div className="text-sm text-slate-300">{currentAssignment.stationLabel} · {currentAssignment.scoutName}</div>
        </div>
      ) : !manualEntry ? (
        <div className="mt-4 rounded-xl border border-dashed border-blue-300/15 px-4 py-3 text-sm text-slate-500">Load a match below before entering scouting data. The duplicate match/team/alliance fields are hidden during normal scouting.</div>
      ) : null}

      {message ? <div className="mt-4 rounded-xl border border-yellow-300/15 bg-yellow-300/5 px-3 py-2 text-sm text-yellow-100">{message}</div> : null}

      {qualificationMatches.length ? (
        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-medium text-slate-300"><CalendarClock size={16} /> {stationInfo.label} assignments</div><div className="text-xs text-slate-600">{qualificationMatches.length} quals</div></div>
          <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
            {qualificationMatches.map((match) => {
              const team = teamNumber(match.alliances[stationInfo.alliance].team_keys[stationInfo.index]);
              const completed = match.actual_time !== null;
              const selected = currentAssignment?.matchNumber === match.match_number && currentAssignment.teamNumber === team;
              return (
                <button key={match.key} type="button" onClick={() => loadAssignment(match)} disabled={!team} className={`flex w-full items-center justify-between gap-4 rounded-xl border px-4 py-3 text-left transition ${selected ? "border-[#ffd84d]/50 bg-[#ffd84d]/10" : completed ? "border-blue-300/10 bg-[#07111f]/35" : "border-blue-300/20 bg-[#07111f]/70 hover:border-[#ffd84d]/45 hover:bg-[#0b5fff]/10"} disabled:opacity-40`}>
                  <div><div className="font-semibold text-white">Q{match.match_number} <span className="mx-1 text-slate-700">·</span> <span className="text-[#ffd84d]">Team {team ?? "—"}</span></div><div className="mt-1 text-xs text-slate-500">{stationInfo.label} · {completed ? "match completed" : "ready to scout"}</div></div>
                  <span className="rounded-lg border border-blue-300/15 px-3 py-1.5 text-xs font-semibold text-slate-300">{selected ? "Loaded" : "Load"}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-dashed border-blue-300/15 p-4 text-sm text-slate-600">Load an event schedule to see this station&apos;s qualification assignments.</div>
      )}
    </section>
  );
}

const inputClass = "w-full rounded-xl border border-blue-300/20 bg-[#07111f] px-3 py-2.5 text-white outline-none placeholder:text-slate-700 focus:border-[#0b5fff]";
