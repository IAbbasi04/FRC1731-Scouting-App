"use client";

import {
  FormEvent,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { BarChart3, LogIn } from "lucide-react";

export const SCOUTER_SESSION_STORAGE_KEY = "1731.scouter-session.v1";

export type ScouterRole = "scout" | "strategy" | "drive-team" | "mentor-parent";

export interface ScouterSession {
  name: string;
  role: ScouterRole;
}

export const scouterRoles: Array<{ value: ScouterRole; label: string; description: string }> = [
  { value: "scout", label: "Scout", description: "Match or pit scouting" },
  { value: "strategy", label: "Strategy", description: "Analysis, planning, and pick lists" },
  { value: "drive-team", label: "Drive team", description: "Pre-match and field-side strategy" },
  { value: "mentor-parent", label: "Mentor / parent", description: "General team support" },
];

interface ScouterSessionContextValue {
  session: ScouterSession;
  signOut: () => void;
}

const ScouterSessionContext = createContext<ScouterSessionContextValue | null>(null);

function readStoredSession(): ScouterSession | null {
  try {
    const raw = window.localStorage.getItem(SCOUTER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ScouterSession>;
    const roleIsValid = scouterRoles.some((role) => role.value === parsed.role);
    if (!parsed.name?.trim() || !roleIsValid) return null;
    return { name: parsed.name.trim(), role: parsed.role as ScouterRole };
  } catch {
    return null;
  }
}

export function ScouterSessionProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<ScouterSession | null>(null);

  useEffect(() => {
    setSession(readStoredSession());
    setHydrated(true);
  }, []);

  function signIn(nextSession: ScouterSession) {
    const normalized = { ...nextSession, name: nextSession.name.trim() };
    window.localStorage.setItem(SCOUTER_SESSION_STORAGE_KEY, JSON.stringify(normalized));
    setSession(normalized);
  }

  function signOut() {
    window.localStorage.removeItem(SCOUTER_SESSION_STORAGE_KEY);
    setSession(null);
  }

  if (!hydrated) {
    return <div className="min-h-screen bg-[#07111f]" aria-hidden="true" />;
  }

  if (!session) return <ScouterSignIn onSignIn={signIn} />;

  return (
    <ScouterSessionContext.Provider value={{ session, signOut }}>
      {children}
    </ScouterSessionContext.Provider>
  );
}

export function useScouterSession() {
  const context = useContext(ScouterSessionContext);
  if (!context) throw new Error("useScouterSession must be used inside ScouterSessionProvider");
  return context;
}

function ScouterSignIn({ onSignIn }: { onSignIn: (session: ScouterSession) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<ScouterRole>("scout");
  const selectedRole = useMemo(() => scouterRoles.find((item) => item.value === role), [role]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    onSignIn({ name, role });
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#07111f] px-4 py-8">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-blue-400/20 bg-[#0d1b2e]/95 p-6 shadow-2xl shadow-black/25 sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl border border-yellow-300/40 bg-[#0b5fff] text-[#ffd84d]">
            <BarChart3 size={24} />
          </span>
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[#ffd84d]">1731 Scouting</div>
            <h1 className="text-2xl font-semibold text-white">Sign in on this device</h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-400">
          No account or internet connection required. Your name and role stay saved on this device until you switch users.
        </p>

        <label className="mt-6 block space-y-2 text-sm">
          <span className="font-medium text-slate-200">Name</span>
          <input
            autoFocus
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-blue-300/20 bg-[#07111f] px-4 py-3 text-base text-white outline-none placeholder:text-slate-600 focus:border-[#0b5fff]"
          />
        </label>

        <label className="mt-4 block space-y-2 text-sm">
          <span className="font-medium text-slate-200">Role</span>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as ScouterRole)}
            className="w-full rounded-xl border border-blue-300/20 bg-[#07111f] px-4 py-3 text-base text-white outline-none focus:border-[#0b5fff]"
          >
            {scouterRoles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <p className="text-xs text-slate-500">{selectedRole?.description}</p>
        </label>

        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd84d] px-5 py-3 font-semibold text-[#07111f] hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <LogIn size={18} /> Enter scouting app
        </button>

        <p className="mt-4 text-center text-xs text-slate-600">
          This is a lightweight team identity check, not password-based security.
        </p>
      </form>
    </main>
  );
}
