"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Cloud, CloudOff, RefreshCw, Save, Users } from "lucide-react";
import { syncPendingPitEntries, syncPitEntry } from "@/lib/pit-scouting-sync";
import type { TbaTeam } from "@/types/frc";
import type {
  PitDrivetrain,
  PitPreferredRole,
  PitScoutingEntry,
  PitShootingRange,
  PitTowerLevel,
} from "@/types/pit-scouting";

const STORAGE_KEY = "1731.pit-scouting.entries.v1";
const PREFS_KEY = "1731.pit-scouting.prefs.v1";
const TEAM_CACHE_PREFIX = "1731.pit-scouting.teams.v1.";

function loadEntries() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PitScoutingEntry[]) : [];
  } catch {
    return [];
  }
}

function numericOrNull(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function numericOrZero(value: string) {
  return numericOrNull(value) ?? 0;
}

export function PitScoutingForm() {
  const [hydrated, setHydrated] = useState(false);
  const [online, setOnline] = useState(true);
  const [entries, setEntries] = useState<PitScoutingEntry[]>([]);
  const [teams, setTeams] = useState<TbaTeam[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [eventKey, setEventKey] = useState("");
  const [teamNumber, setTeamNumber] = useState("");
  const [scoutName, setScoutName] = useState("");
  const [drivetrain, setDrivetrain] = useState<PitDrivetrain>("unknown");
  const [widthIn, setWidthIn] = useState("");
  const [lengthIn, setLengthIn] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [usesTrench, setUsesTrench] = useState(false);
  const [crossesBump, setCrossesBump] = useState(false);
  const [floorIntake, setFloorIntake] = useState(false);
  const [canPassFuel, setCanPassFuel] = useState(false);
  const [shootsOnMove, setShootsOnMove] = useState(false);
  const [shootingRange, setShootingRange] = useState<PitShootingRange>("unknown");
  const [fuelCapacity, setFuelCapacity] = useState("");
  const [maxTowerLevel, setMaxTowerLevel] = useState<PitTowerLevel>("none");
  const [autoCount, setAutoCount] = useState("0");
  const [autoNotes, setAutoNotes] = useState("");
  const [preferredRole, setPreferredRole] = useState<PitPreferredRole>("unknown");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [reliabilityNotes, setReliabilityNotes] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setEntries(loadEntries());
    setOnline(navigator.onLine);
    try {
      const rawPrefs = window.localStorage.getItem(PREFS_KEY);
      if (rawPrefs) {
        const prefs = JSON.parse(rawPrefs) as { eventKey?: string; scoutName?: string };
        const savedEvent = prefs.eventKey ?? "";
        setEventKey(savedEvent);
        setScoutName(prefs.scoutName ?? "");
        if (savedEvent) {
          const cachedTeams = window.localStorage.getItem(`${TEAM_CACHE_PREFIX}${savedEvent.toLowerCase()}`);
          if (cachedTeams) setTeams(JSON.parse(cachedTeams) as TbaTeam[]);
        }
      }
    } catch {
      // Preferences are optional.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      void syncPending();
    };
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  });

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ eventKey, scoutName }));
  }, [eventKey, scoutName, hydrated]);

  function persist(next: PitScoutingEntry[]) {
    setEntries(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async function loadTeams() {
    const normalized = eventKey.trim().toLowerCase();
    if (!normalized) {
      setMessage("Enter an event key first.");
      return;
    }

    setLoadingTeams(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/tba/event/${encodeURIComponent(normalized)}/teams`);
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Could not load event teams.");
      const sorted = (data as TbaTeam[]).sort((a, b) => a.team_number - b.team_number);
      setTeams(sorted);
      window.localStorage.setItem(`${TEAM_CACHE_PREFIX}${normalized}`, JSON.stringify(sorted));
      setEventKey(normalized);
      if (!teamNumber && sorted[0]) setTeamNumber(String(sorted[0].team_number));
      setMessage(`Loaded ${sorted.length} teams from TBA.`);
    } catch (error) {
      const cached = window.localStorage.getItem(`${TEAM_CACHE_PREFIX}${normalized}`);
      if (cached) {
        const sorted = JSON.parse(cached) as TbaTeam[];
        setTeams(sorted);
        if (!teamNumber && sorted[0]) setTeamNumber(String(sorted[0].team_number));
        setMessage("Network unavailable — using the cached event team list.");
      } else {
        setMessage(error instanceof Error ? error.message : "Could not load event teams.");
      }
    } finally {
      setLoadingTeams(false);
    }
  }

  async function syncPending() {
    if (syncing || !navigator.onLine) return;
    const current = loadEntries();
    const pending = current.filter((entry) => entry.syncStatus !== "synced");
    if (!pending.length) return;

    setSyncing(true);
    try {
      const { syncedIds, failedIds } = await syncPendingPitEntries(pending);
      const syncedSet = new Set(syncedIds);
      const updated = current.map((entry) => syncedSet.has(entry.id) ? { ...entry, syncStatus: "synced" as const } : entry);
      persist(updated);
      setMessage(failedIds.length ? `Synced ${syncedIds.length}; ${failedIds.length} pit entr${failedIds.length === 1 ? "y" : "ies"} remain queued.` : `Synced ${syncedIds.length} pit entr${syncedIds.length === 1 ? "y" : "ies"}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Pit scouting sync failed; entries remain saved locally.");
    } finally {
      setSyncing(false);
    }
  }

  function resetRobotFields() {
    setDrivetrain("unknown");
    setWidthIn("");
    setLengthIn("");
    setHeightIn("");
    setWeightLbs("");
    setUsesTrench(false);
    setCrossesBump(false);
    setFloorIntake(false);
    setCanPassFuel(false);
    setShootsOnMove(false);
    setShootingRange("unknown");
    setFuelCapacity("");
    setMaxTowerLevel("none");
    setAutoCount("0");
    setAutoNotes("");
    setPreferredRole("unknown");
    setIntakeNotes("");
    setReliabilityNotes("");
    setNotes("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    const normalizedEvent = eventKey.trim().toLowerCase();
    const parsedTeam = Number(teamNumber);
    if (!normalizedEvent || !scoutName.trim() || !Number.isFinite(parsedTeam) || parsedTeam <= 0) {
      setMessage("Event, team, and scout name are required.");
      return;
    }

    const entry: PitScoutingEntry = {
      id: crypto.randomUUID(),
      schemaVersion: 1,
      season: Number(normalizedEvent.slice(0, 4)) || new Date().getFullYear(),
      eventKey: normalizedEvent,
      teamNumber: parsedTeam,
      scoutName: scoutName.trim(),
      createdAt: new Date().toISOString(),
      drivetrain,
      widthIn: numericOrNull(widthIn),
      lengthIn: numericOrNull(lengthIn),
      heightIn: numericOrNull(heightIn),
      weightLbs: numericOrNull(weightLbs),
      usesTrench,
      crossesBump,
      floorIntake,
      canPassFuel,
      shootsOnMove,
      shootingRange,
      fuelCapacity: numericOrNull(fuelCapacity),
      maxTowerLevel,
      autoCount: numericOrZero(autoCount),
      autoNotes: autoNotes.trim(),
      preferredRole,
      intakeNotes: intakeNotes.trim(),
      reliabilityNotes: reliabilityNotes.trim(),
      notes: notes.trim(),
      syncStatus: "local",
    };

    const localEntries = [...loadEntries(), entry];
    persist(localEntries);
    setMessage(`Saved pit scouting for Team ${parsedTeam} locally.`);

    if (navigator.onLine) {
      try {
        await syncPitEntry(entry);
        const updated = loadEntries().map((item) => item.id === entry.id ? { ...item, syncStatus: "synced" as const } : item);
        persist(updated);
        setMessage(`Saved and synced pit scouting for Team ${parsedTeam}.`);
      } catch {
        setMessage(`Saved Team ${parsedTeam} locally; cloud sync will retry when connectivity is available.`);
      }
    }

    resetRobotFields();
    const currentIndex = teams.findIndex((team) => team.team_number === parsedTeam);
    if (currentIndex >= 0 && teams[currentIndex + 1]) setTeamNumber(String(teams[currentIndex + 1].team_number));
  }

  const normalizedEvent = eventKey.trim().toLowerCase();
  const eventEntries = useMemo(
    () => entries.filter((entry) => entry.eventKey === normalizedEvent).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [entries, normalizedEvent],
  );
  const pendingCount = entries.filter((entry) => entry.syncStatus !== "synced").length;
  const selectedTeam = teams.find((team) => String(team.team_number) === teamNumber);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
      <form onSubmit={submit} className="space-y-6 rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/85 p-5 sm:p-6">
        <section className="rounded-2xl border border-yellow-300/20 bg-yellow-300/5 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <Field label="Event key"><input value={eventKey} onChange={(event) => setEventKey(event.target.value)} placeholder="2026vaale" className={inputClass} /></Field>
            <Field label="Scout name"><input value={scoutName} onChange={(event) => setScoutName(event.target.value)} placeholder="Name" className={inputClass} /></Field>
            <button type="button" onClick={loadTeams} disabled={loadingTeams || !eventKey.trim()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b5fff] px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:opacity-50"><Users size={16} />{loadingTeams ? "Loading…" : "Load teams"}</button>
          </div>
          <div className="mt-4">
            <Field label="Team">
              {teams.length ? (
                <select value={teamNumber} onChange={(event) => setTeamNumber(event.target.value)} className={inputClass}>
                  <option value="">Select team</option>
                  {teams.map((team) => <option key={team.key} value={team.team_number}>{team.team_number} · {team.nickname ?? team.name}</option>)}
                </select>
              ) : (
                <input inputMode="numeric" value={teamNumber} onChange={(event) => setTeamNumber(event.target.value)} placeholder="1731" className={inputClass} />
              )}
            </Field>
            {selectedTeam ? <p className="mt-2 text-xs text-slate-500">{selectedTeam.nickname ?? selectedTeam.name} · {[selectedTeam.city, selectedTeam.state_prov].filter(Boolean).join(", ")}</p> : null}
          </div>
        </section>

        <Section title="Robot basics">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Drivetrain"><select value={drivetrain} onChange={(event) => setDrivetrain(event.target.value as PitDrivetrain)} className={inputClass}><option value="unknown">Unknown</option><option value="swerve">Swerve</option><option value="tank">Tank / differential</option><option value="mecanum">Mecanum</option><option value="other">Other</option></select></Field>
            <NumberField label="Width (in)" value={widthIn} onChange={setWidthIn} />
            <NumberField label="Length (in)" value={lengthIn} onChange={setLengthIn} />
            <NumberField label="Height (in)" value={heightIn} onChange={setHeightIn} />
            <NumberField label="Weight (lb)" value={weightLbs} onChange={setWeightLbs} />
            <Field label="Preferred role"><select value={preferredRole} onChange={(event) => setPreferredRole(event.target.value as PitPreferredRole)} className={inputClass}><option value="unknown">Unknown</option><option value="scorer">Primary scorer</option><option value="feeder">Feeder / passer</option><option value="defender">Defense</option><option value="flexible">Flexible</option></select></Field>
          </div>
        </Section>

        <Section title="Mobility & intake">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Check label="Uses trench" checked={usesTrench} onChange={setUsesTrench} />
            <Check label="Crosses bump" checked={crossesBump} onChange={setCrossesBump} />
            <Check label="Floor intake" checked={floorIntake} onChange={setFloorIntake} />
            <Check label="Can pass fuel" checked={canPassFuel} onChange={setCanPassFuel} />
          </div>
          <div className="mt-4"><Field label="Intake notes"><textarea rows={2} value={intakeNotes} onChange={(event) => setIntakeNotes(event.target.value)} placeholder="Intake side, speed, limitations, human-player loading…" className={`${inputClass} resize-y`} /></Field></div>
        </Section>

        <Section title="Shooting & scoring">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Check label="Shoots while moving" checked={shootsOnMove} onChange={setShootsOnMove} />
            <Field label="Claimed shooting range"><select value={shootingRange} onChange={(event) => setShootingRange(event.target.value as PitShootingRange)} className={inputClass}><option value="unknown">Unknown</option><option value="close">Close</option><option value="mid">Mid-range</option><option value="far">Far</option><option value="multiple">Multiple ranges</option></select></Field>
            <NumberField label="Fuel capacity" value={fuelCapacity} onChange={setFuelCapacity} />
          </div>
        </Section>

        <Section title="Auto & tower">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Number of autos" value={autoCount} onChange={setAutoCount} />
            <Field label="Maximum tower level"><select value={maxTowerLevel} onChange={(event) => setMaxTowerLevel(event.target.value as PitTowerLevel)} className={inputClass}><option value="none">None</option><option value="level1">Level 1</option><option value="level2">Level 2</option><option value="level3">Level 3</option></select></Field>
          </div>
          <div className="mt-4"><Field label="Auto notes"><textarea rows={3} value={autoNotes} onChange={(event) => setAutoNotes(event.target.value)} placeholder="Starting locations, routines, expected fuel, mobility, consistency…" className={`${inputClass} resize-y`} /></Field></div>
        </Section>

        <Section title="Reliability & notes">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Reliability / maintenance notes"><textarea rows={4} value={reliabilityNotes} onChange={(event) => setReliabilityNotes(event.target.value)} placeholder="Known failures, repairs, spare mechanisms, recurring issues…" className={`${inputClass} resize-y`} /></Field>
            <Field label="General pit notes"><textarea rows={4} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Strategy, special capabilities, team claims worth verifying…" className={`${inputClass} resize-y`} /></Field>
          </div>
        </Section>

        {message ? <div className="rounded-xl border border-yellow-300/20 bg-yellow-300/5 p-3 text-sm text-yellow-100">{message}</div> : null}
        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd84d] px-5 py-3 font-semibold text-[#07111f] hover:bg-yellow-300 sm:w-auto"><Save size={18} /> Save pit scouting</button>
      </form>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">{online ? <Cloud size={18} className="text-[#ffd84d]" /> : <CloudOff size={18} className="text-slate-500" />}<h2 className="font-semibold text-white">Pit sync</h2></div>
              <p className="mt-1 text-xs text-slate-500">{online ? "Online" : "Offline — entries stay on this device"}</p>
            </div>
            <div className="text-right"><div className="text-2xl font-bold text-[#ffd84d]">{pendingCount}</div><div className="text-xs text-slate-500">pending</div></div>
          </div>
          <button type="button" disabled={syncing || !online || pendingCount === 0} onClick={() => void syncPending()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b5fff] px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-40"><RefreshCw size={16} className={syncing ? "animate-spin" : ""} />{syncing ? "Syncing…" : "Sync pending"}</button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70">
          <div className="border-b border-blue-400/10 bg-[#11243d] px-4 py-3"><h2 className="font-semibold text-[#ffd84d]">Scouted at this event</h2></div>
          {eventEntries.length === 0 ? <p className="p-4 text-sm text-slate-500">No pit entries saved for this event yet.</p> : <div className="max-h-[520px] divide-y divide-blue-400/10 overflow-y-auto">{eventEntries.map((entry) => (
            <button key={entry.id} type="button" onClick={() => setTeamNumber(String(entry.teamNumber))} className="w-full p-4 text-left hover:bg-[#0b5fff]/5">
              <div className="flex items-center justify-between gap-3"><span className="font-semibold text-white">Team {entry.teamNumber}</span><span className={`text-xs ${entry.syncStatus === "synced" ? "text-emerald-300" : "text-[#ffd84d]"}`}>{entry.syncStatus}</span></div>
              <div className="mt-1 text-xs text-slate-500">{entry.scoutName} · {new Date(entry.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</div>
            </button>
          ))}</div>}
        </section>
      </aside>
    </div>
  );
}

const inputClass = "w-full rounded-xl border border-blue-300/20 bg-[#07111f] px-3 py-2.5 text-white outline-none placeholder:text-slate-700 focus:border-[#0b5fff]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-sm"><span className="font-medium text-slate-300">{label}</span>{children}</label>;
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <Field label={label}><input type="number" min={0} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass} /></Field>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-blue-300/10 bg-[#07111f]/55 p-4"><h2 className="mb-4 text-lg font-semibold text-[#ffd84d]">{title}</h2>{children}</section>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${checked ? "border-[#ffd84d]/50 bg-[#ffd84d]/10 text-yellow-100" : "border-blue-300/15 bg-[#07111f]/60 text-slate-300"}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#ffd84d]" />{label}</label>;
}
