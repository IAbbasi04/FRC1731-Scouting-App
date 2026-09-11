"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Download, Save, Trash2 } from "lucide-react";
import type { DefenseLevel, EndgameResult, MatchScoutingEntry } from "@/types/scouting";

const STORAGE_KEY = "1731.match-scouting.entries.v1";

function numberOrZero(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function accuracy(scored: number, attempts: number) {
  if (attempts <= 0) return "—";
  return `${Math.round((scored / attempts) * 100)}%`;
}

export function MatchScoutingForm() {
  const [entries, setEntries] = useState<MatchScoutingEntry[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [eventKey, setEventKey] = useState("");
  const [matchNumber, setMatchNumber] = useState(1);
  const [teamNumber, setTeamNumber] = useState(1731);
  const [scoutName, setScoutName] = useState("");
  const [autoAttempts, setAutoAttempts] = useState(0);
  const [autoScored, setAutoScored] = useState(0);
  const [teleopAttempts, setTeleopAttempts] = useState(0);
  const [teleopScored, setTeleopScored] = useState(0);
  const [averageCycleSeconds, setAverageCycleSeconds] = useState("");
  const [endgame, setEndgame] = useState<EndgameResult>("none");
  const [defense, setDefense] = useState<DefenseLevel>("none");
  const [penalties, setPenalties] = useState(0);
  const [disabled, setDisabled] = useState(false);
  const [tipped, setTipped] = useState(false);
  const [mechanicalIssue, setMechanicalIssue] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setEntries(JSON.parse(stored) as MatchScoutingEntry[]);
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

  const recentEntries = useMemo(() => [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10), [entries]);

  function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);

    if (!eventKey.trim() || !scoutName.trim() || teamNumber <= 0 || matchNumber <= 0) {
      setMessage("Event, match, team, and scout name are required.");
      return;
    }
    if (autoScored > autoAttempts || teleopScored > teleopAttempts) {
      setMessage("Scored units cannot be greater than attempts.");
      return;
    }

    const entry: MatchScoutingEntry = {
      id: crypto.randomUUID(),
      schemaVersion: 1,
      eventKey: eventKey.trim().toLowerCase(),
      matchNumber,
      teamNumber,
      scoutName: scoutName.trim(),
      createdAt: new Date().toISOString(),
      auto: { attempts: autoAttempts, scored: autoScored },
      teleop: {
        attempts: teleopAttempts,
        scored: teleopScored,
        averageCycleSeconds: averageCycleSeconds.trim() ? numberOrZero(averageCycleSeconds) : null,
      },
      endgame,
      defense,
      penalties,
      disabled,
      tipped,
      mechanicalIssue,
      notes: notes.trim(),
      syncStatus: "local",
    };

    setEntries((current) => [...current, entry]);
    setMessage(`Saved Q${matchNumber} · Team ${teamNumber} locally.`);
    setMatchNumber((current) => current + 1);
    setAutoAttempts(0);
    setAutoScored(0);
    setTeleopAttempts(0);
    setTeleopScored(0);
    setAverageCycleSeconds("");
    setEndgame("none");
    setDefense("none");
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
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Event key"><input value={eventKey} onChange={(e) => setEventKey(e.target.value)} placeholder="2026vahay" className={inputClass} /></Field>
          <Field label="Match"><input type="number" min={1} value={matchNumber} onChange={(e) => setMatchNumber(numberOrZero(e.target.value))} className={inputClass} /></Field>
          <Field label="Team"><input type="number" min={1} value={teamNumber} onChange={(e) => setTeamNumber(numberOrZero(e.target.value))} className={inputClass} /></Field>
          <Field label="Scout"><input value={scoutName} onChange={(e) => setScoutName(e.target.value)} placeholder="Name" className={inputClass} /></Field>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ScoringSection title="Autonomous" attempts={autoAttempts} scored={autoScored} setAttempts={setAutoAttempts} setScored={setAutoScored} />
          <ScoringSection title="Teleop" attempts={teleopAttempts} scored={teleopScored} setAttempts={setTeleopAttempts} setScored={setTeleopScored}>
            <Field label="Avg. cycle seconds"><input inputMode="decimal" value={averageCycleSeconds} onChange={(e) => setAverageCycleSeconds(e.target.value)} placeholder="Optional" className={inputClass} /></Field>
          </ScoringSection>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <ChoiceGroup title="Endgame" value={endgame} onChange={(value) => setEndgame(value as EndgameResult)} options={["none", "attempted", "successful"]} />
          <ChoiceGroup title="Defense" value={defense} onChange={(value) => setDefense(value as DefenseLevel)} options={["none", "light", "heavy"]} />
          <Field label="Penalties"><input type="number" min={0} value={penalties} onChange={(e) => setPenalties(numberOrZero(e.target.value))} className={inputClass} /></Field>
        </section>

        <section className="grid gap-3 sm:grid-cols-3">
          <Check label="Disabled" checked={disabled} onChange={setDisabled} />
          <Check label="Tipped" checked={tipped} onChange={setTipped} />
          <Check label="Mechanical issue" checked={mechanicalIssue} onChange={setMechanicalIssue} />
        </section>

        <Field label="Notes"><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Driver quality, unusual behavior, strategy notes, failure details…" className={`${inputClass} resize-y`} /></Field>

        {message ? <div className="rounded-xl border border-yellow-300/20 bg-yellow-300/5 p-3 text-sm text-yellow-100">{message}</div> : null}

        <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd84d] px-5 py-3 font-semibold text-[#07111f] hover:bg-yellow-300 sm:w-auto"><Save size={18} /> Save scouting entry</button>
      </form>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/80 p-5">
          <div className="flex items-center justify-between gap-3">
            <div><h2 className="font-semibold text-[#ffd84d]">Offline queue</h2><p className="mt-1 text-xs text-slate-500">Stored only on this browser until cloud sync is connected.</p></div>
            <div className="text-2xl font-bold text-white">{entries.length}</div>
          </div>
          <button type="button" disabled={entries.length === 0} onClick={exportEntries} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-blue-300/20 px-4 py-2 text-sm font-medium text-slate-200 hover:border-[#ffd84d]/50 disabled:opacity-40"><Download size={16} /> Export JSON</button>
        </section>

        <section className="overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/70">
          <div className="border-b border-blue-400/10 bg-[#11243d] px-4 py-3"><h2 className="font-semibold text-white">Recent entries</h2></div>
          {recentEntries.length === 0 ? <p className="p-4 text-sm text-slate-500">No scouting entries saved yet.</p> : <div className="divide-y divide-blue-400/10">{recentEntries.map((entry) => (
            <div key={entry.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div><div className="font-semibold text-[#ffd84d]">Q{entry.matchNumber} · {entry.teamNumber}</div><div className="mt-1 text-xs text-slate-500">{entry.eventKey} · {entry.scoutName}</div></div>
                <button type="button" onClick={() => removeEntry(entry.id)} className="rounded-lg p-2 text-slate-500 hover:bg-red-950/30 hover:text-red-300" aria-label="Delete entry"><Trash2 size={16} /></button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400"><span>Auto {entry.auto.scored}/{entry.auto.attempts} ({accuracy(entry.auto.scored, entry.auto.attempts)})</span><span>Teleop {entry.teleop.scored}/{entry.teleop.attempts} ({accuracy(entry.teleop.scored, entry.teleop.attempts)})</span></div>
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

function ScoringSection({ title, attempts, scored, setAttempts, setScored, children }: { title: string; attempts: number; scored: number; setAttempts: (value: number) => void; setScored: (value: number) => void; children?: React.ReactNode }) {
  return <div className="rounded-2xl border border-blue-300/10 bg-[#07111f]/55 p-4"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold text-[#ffd84d]">{title}</h2><span className="text-sm text-slate-500">Accuracy {accuracy(scored, attempts)}</span></div><div className="grid gap-3 sm:grid-cols-2"><Counter label="Attempts" value={attempts} setValue={setAttempts} /><Counter label="Scored" value={scored} setValue={setScored} />{children}</div></div>;
}

function Counter({ label, value, setValue }: { label: string; value: number; setValue: (value: number) => void }) {
  return <div className="space-y-2"><div className="text-sm text-slate-400">{label}</div><div className="grid grid-cols-[44px_1fr_44px] overflow-hidden rounded-xl border border-blue-300/20 bg-[#07111f]"><button type="button" onClick={() => setValue(Math.max(0, value - 1))} className="text-xl text-slate-300 hover:bg-[#0b5fff]/20">−</button><input type="number" min={0} value={value} onChange={(e) => setValue(numberOrZero(e.target.value))} className="min-w-0 bg-transparent py-2 text-center font-mono text-lg font-semibold text-white outline-none" /><button type="button" onClick={() => setValue(value + 1)} className="text-xl text-[#ffd84d] hover:bg-[#0b5fff]/20">+</button></div></div>;
}

function ChoiceGroup({ title, value, onChange, options }: { title: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <div className="space-y-2"><div className="text-sm font-medium text-slate-300">{title}</div><div className="grid gap-2">{options.map((option) => <button key={option} type="button" onClick={() => onChange(option)} className={`rounded-xl border px-3 py-2 text-sm capitalize ${value === option ? "border-[#ffd84d]/60 bg-[#ffd84d]/10 text-[#ffd84d]" : "border-blue-300/15 bg-[#07111f] text-slate-400"}`}>{option}</button>)}</div></div>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${checked ? "border-red-400/40 bg-red-950/20 text-red-100" : "border-blue-300/15 bg-[#07111f]/60 text-slate-300"}`}><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[#ffd84d]" />{label}</label>;
}
