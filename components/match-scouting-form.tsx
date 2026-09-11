"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, Save, Trash2 } from "lucide-react";
import { useScouterSession } from "@/components/scouter-session";
import {
  getScoutingSeason,
  inferSeasonFromEventKey,
  scoutingSeasons,
  type GameField,
} from "@/config/scouting/seasons";
import type {
  AllianceColor,
  DefenseLevel,
  MatchScoutingEntry,
  ScoutingValue,
  StoredScoutingEntry,
} from "@/types/scouting";

const STORAGE_KEY = "1731.match-scouting.entries.v1";

function numberOrZero(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function numberWithinRange(value: string, min = 0, max = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

function defaultGameData(fields: GameField[]) {
  return Object.fromEntries(fields.map((field) => {
    if (field.type === "toggle") return [field.key, false];
    if (field.type === "select") return [field.key, field.options?.[0]?.value ?? ""];
    return [field.key, field.min ?? 0];
  })) as Record<string, ScoutingValue>;
}

export function MatchScoutingForm() {
  const { session } = useScouterSession();
  const [hydrated, setHydrated] = useState(false);
  const [entries, setEntries] = useState<StoredScoutingEntry[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [season, setSeason] = useState(2026);
  const config = getScoutingSeason(season);
  const [eventKey, setEventKey] = useState("");
  const [matchNumber, setMatchNumber] = useState<number | "">(1);
  const [teamNumber, setTeamNumber] = useState<number | "">(1731);
  const [alliance, setAlliance] = useState<AllianceColor>("red");
  const [gameData, setGameData] = useState<Record<string, ScoutingValue>>(() => defaultGameData(config.fields));
  const [defense, setDefense] = useState<DefenseLevel>("none");
  const [driverRating, setDriverRating] = useState(5);
  const [playedDefense, setPlayedDefense] = useState(false);
  const [defenseRating, setDefenseRating] = useState(5);
  const [penalties, setPenalties] = useState<number | "">(0);
  const [disabled, setDisabled] = useState(false);
  const [tipped, setTipped] = useState(false);
  const [mechanicalIssue, setMechanicalIssue] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setEntries(JSON.parse(stored) as StoredScoutingEntry[]);
    } catch {
      setMessage("Saved scouting data could not be read on this device.");
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, hydrated]);

  useEffect(() => {
    setGameData(defaultGameData(config.fields));
  }, [config]);

  const recentEntries = useMemo(
    () => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10),
    [entries],
  );

  function handleEventKey(value: string) {
    setEventKey(value);
    const inferred = inferSeasonFromEventKey(value);
    if (inferred && scoutingSeasons.some((item) => item.year === inferred)) setSeason(inferred);
  }

  function setFieldValue(key: string, value: ScoutingValue) {
    setGameData((current) => ({ ...current, [key]: value }));
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    const resolvedMatchNumber = matchNumber === "" ? 0 : matchNumber;
    const resolvedTeamNumber = teamNumber === "" ? 0 : teamNumber;
    const resolvedPenalties = penalties === "" ? 0 : penalties;

    if (!eventKey.trim() || resolvedTeamNumber <= 0 || resolvedMatchNumber <= 0) {
      setMessage("Event, match, and team are required.");
      return;
    }

    const normalizedGameData = Object.fromEntries(
      config.fields.map((field) => {
        const value = gameData[field.key];
        if ((field.type === "counter" || field.type === "number") && value === "") {
          return [field.key, field.min ?? 0];
        }
        return [field.key, value];
      }),
    ) as Record<string, ScoutingValue>;

    const entry: MatchScoutingEntry = {
      id: crypto.randomUUID(),
      schemaVersion: 2,
      season: config.year,
      gameKey: config.gameKey,
      eventKey: eventKey.trim().toLowerCase(),
      matchNumber: resolvedMatchNumber,
      teamNumber: resolvedTeamNumber,
      scoutName: session.name,
      createdAt: new Date().toISOString(),
      alliance,
      gameData: normalizedGameData,
      defense,
      driverRating,
      playedDefense,
      defenseRating: playedDefense ? defenseRating : undefined,
      penalties: resolvedPenalties,
      disabled,
      tipped,
      mechanicalIssue,
      notes: notes.trim(),
      syncStatus: "local",
      source: "manual",
    };

    setEntries((current) => [...current, entry]);
    setMessage(`Saved ${config.year} Q${resolvedMatchNumber} · Team ${resolvedTeamNumber} locally.`);
    setMatchNumber(resolvedMatchNumber + 1);
    setGameData(defaultGameData(config.fields));
    setDefense("none");
    setDriverRating(5);
    setPlayedDefense(false);
    setDefenseRating(5);
    setPenalties(0);
    setDisabled(false);
    setTipped(false);
    setMechanicalIssue(false);
    setNotes("");
  }

  function removeEntry(id: string) {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }

  function exportEntries() {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${eventKey.trim() || "1731"}-scouting-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
      <form onSubmit={submit} className="space-y-6 rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/85 p-5 sm:p-6">
        <section className="rounded-2xl border border-yellow-300/20 bg-yellow-300/5 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ffd84d]">Season profile</div>
              <h2 className="mt-1 text-2xl font-semibold text-white">{config.year} · {config.gameName}</h2>
              <p className="mt-1 text-sm text-slate-400">{config.description}</p>
            </div>
            <select value={season} onChange={(event) => setSeason(Number(event.target.value))} className={`${inputClass} max-w-xs`}>
              {scoutingSeasons.map((item) => <option key={item.year} value={item.year}>{item.year} · {item.gameName}</option>)}
            </select>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Event key"><input value={eventKey} onChange={(event) => handleEventKey(event.target.value)} placeholder="2026vahay" className={inputClass} /></Field>
          <Field label="Match"><input type="number" min={1} value={matchNumber} onChange={(event) => setMatchNumber(event.target.value === "" ? "" : numberOrZero(event.target.value))} className={inputClass} /></Field>
          <Field label="Team"><input type="number" min={1} value={teamNumber} onChange={(event) => setTeamNumber(event.target.value === "" ? "" : numberOrZero(event.target.value))} className={inputClass} /></Field>
          <Field label="Alliance"><select value={alliance} onChange={(event) => setAlliance(event.target.value as AllianceColor)} className={inputClass}><option value="red">Red</option><option value="blue">Blue</option></select></Field>
        </section>
        <p className="-mt-3 text-xs text-slate-500">Scouting as <span className="font-medium text-slate-300">{session.name}</span>. Use Switch user in the header to change scouters.</p>

        {(["auto", "teleop", "endgame"] as const).map((phase) => {
          const fields = config.fields.filter((field) => field.phase === phase);
          if (fields.length === 0) return null;
          return (
            <section key={phase} className="rounded-2xl border border-blue-300/10 bg-[#07111f]/55 p-4">
              <h2 className="mb-4 text-lg font-semibold capitalize text-[#ffd84d]">{phase}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fields.map((field) => (
                  <GameFieldControl
                    key={field.key}
                    field={field}
                    value={gameData[field.key]}
                    onChange={(value) => setFieldValue(field.key, value)}
                  />
                ))}
              </div>
            </section>
          );
        })}

        <section className="rounded-2xl border border-blue-300/10 bg-[#07111f]/55 p-4">
          <h2 className="mb-4 text-lg font-semibold text-[#ffd84d]">Driver & defense</h2>
          <div className="grid gap-5 lg:grid-cols-3">
            <RatingSlider label="Driver rating" value={driverRating} onChange={setDriverRating} />
            <ChoiceGroup
              title="How guarded was this team?"
              value={defense}
              onChange={(value) => setDefense(value as DefenseLevel)}
              options={[
                { value: "none", label: "Not guarded" },
                { value: "light", label: "Lightly guarded" },
                { value: "heavy", label: "Heavily guarded" },
              ]}
            />
            <div className="space-y-3">
              <Check label="Played defense" checked={playedDefense} onChange={setPlayedDefense} />
              {playedDefense ? <RatingSlider label="Defense quality" value={defenseRating} onChange={setDefenseRating} /> : <p className="px-1 text-xs text-slate-600">Enable this when the team spent meaningful time defending an opponent.</p>}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Penalties"><input type="number" min={0} value={penalties} onChange={(event) => setPenalties(event.target.value === "" ? "" : numberOrZero(event.target.value))} className={inputClass} /></Field>
          <div className="grid gap-2 sm:grid-cols-3">
            <Check label="Disabled" checked={disabled} onChange={setDisabled} />
            <Check label="Tipped" checked={tipped} onChange={setTipped} />
            <Check label="Mechanical issue" checked={mechanicalIssue} onChange={setMechanicalIssue} />
          </div>
        </section>

        <Field label="Notes"><textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} placeholder="Strategy notes, unusual behavior, failure details…" className={`${inputClass} resize-y`} /></Field>

        {message ? <div className="rounded-xl border border-yellow-300/20 bg-yellow-300/5 p-3 text-sm text-yellow-100">{message}</div> : null}

        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd84d] px-5 py-3 font-semibold text-[#07111f] hover:bg-yellow-300 sm:w-auto"><Save size={18} /> Save scouting entry</button>
      </form>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-semibold text-[#ffd84d]">Offline queue</h2><p className="mt-1 text-xs text-slate-500">Multiple seasons can coexist in the same local queue.</p></div>
            <div className="text-2xl font-bold text-white">{entries.length}</div>
          </div>
          <button type="button" disabled={entries.length === 0} onClick={exportEntries} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300/20 px-4 py-2 text-sm font-medium text-slate-200 hover:border-[#ffd84d]/50 disabled:opacity-40"><Download size={16} /> Export JSON</button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70">
          <div className="border-b border-blue-400/10 bg-[#11243d] px-4 py-3"><h2 className="font-semibold text-white">Recent entries</h2></div>
          {recentEntries.length === 0 ? <p className="p-4 text-sm text-slate-500">No scouting entries saved yet.</p> : <div className="divide-y divide-blue-400/10">{recentEntries.map((entry) => (
            <div key={entry.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[#ffd84d]">Q{entry.matchNumber} · {entry.teamNumber}</div>
                  <div className="mt-1 text-xs text-slate-500">{entry.schemaVersion === 2 ? `${entry.season} · ${entry.gameKey}` : "Legacy entry"} · {entry.scoutName}</div>
                </div>
                <button type="button" onClick={() => removeEntry(entry.id)} className="rounded-lg p-2 text-slate-500 hover:bg-red-950/30 hover:text-red-300" aria-label="Delete entry"><Trash2 size={16} /></button>
              </div>
              <p className="mt-2 text-xs text-slate-500">{entry.eventKey}{entry.schemaVersion === 2 && entry.alliance ? ` · ${entry.alliance.toUpperCase()} alliance` : ""}</p>
            </div>
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

function GameFieldControl({ field, value, onChange }: { field: GameField; value: ScoutingValue; onChange: (value: ScoutingValue) => void }) {
  if (field.type === "toggle") {
    return <Check label={field.label} checked={Boolean(value)} onChange={(checked) => onChange(checked)} />;
  }

  if (field.type === "select") {
    return <Field label={field.label}><select value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} className={inputClass}>{field.options?.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{field.help ? <p className="text-xs text-slate-600">{field.help}</p> : null}</Field>;
  }

  if (field.type === "number") {
    const min = field.min ?? 0;
    const max = field.max;
    return <Field label={field.label}><input type="number" min={min} max={max} step={field.step ?? 0.1} value={value === "" ? "" : Number(value ?? min)} onChange={(event) => onChange(event.target.value === "" ? "" : numberWithinRange(event.target.value, min, max ?? Number.POSITIVE_INFINITY))} className={inputClass} />{field.help ? <p className="text-xs text-slate-600">{field.help}</p> : null}</Field>;
  }

  return <div className="space-y-2"><div className="text-sm font-medium text-slate-300">{field.label}</div><Counter value={value === "" ? "" : Number(value ?? 0)} setValue={(next) => onChange(next)} />{field.help ? <p className="text-xs text-slate-600">{field.help}</p> : null}</div>;
}

function Counter({ value, setValue }: { value: number | ""; setValue: (value: number | "") => void }) {
  const numericValue = value === "" ? 0 : value;
  return <div className="grid grid-cols-[44px_1fr_44px] overflow-hidden rounded-xl border border-blue-300/20 bg-[#07111f]"><button type="button" onClick={() => setValue(Math.max(0, numericValue - 1))} className="text-xl text-slate-300 hover:bg-[#0b5fff]/20">−</button><input type="number" min={0} value={value} onChange={(event) => setValue(event.target.value === "" ? "" : numberOrZero(event.target.value))} className="min-w-0 bg-transparent py-2 text-center font-mono text-lg font-semibold text-white outline-none" /><button type="button" onClick={() => setValue(numericValue + 1)} className="text-xl text-[#ffd84d] hover:bg-[#0b5fff]/20">+</button></div>;
}

function RatingSlider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-3 rounded-xl border border-blue-300/15 bg-[#07111f]/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <span className="min-w-10 rounded-lg bg-[#11243d] px-2 py-1 text-center font-mono text-lg font-bold text-[#ffd84d]">{value}</span>
      </div>
      <input type="range" min={0} max={10} step={1} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-[#ffd84d]" />
      <div className="flex justify-between text-[11px] text-slate-600"><span>0</span><span>10</span></div>
    </div>
  );
}

function ChoiceGroup({ title, value, onChange, options }: { title: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  return <div className="space-y-2"><div className="text-sm font-medium text-slate-300">{title}</div><div className="grid gap-2">{options.map((option) => <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`rounded-xl border px-3 py-2 text-sm ${value === option.value ? "border-[#ffd84d]/60 bg-[#ffd84d]/10 text-[#ffd84d]" : "border-blue-300/15 bg-[#07111f] text-slate-400"}`}>{option.label}</button>)}</div></div>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${checked ? "border-[#ffd84d]/50 bg-[#ffd84d]/10 text-yellow-100" : "border-blue-300/15 bg-[#07111f]/60 text-slate-300"}`}><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-[#ffd84d]" />{label}</label>;
}
