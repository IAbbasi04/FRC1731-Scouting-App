"use client";

import {
  FormEvent,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { BarChart3, KeyRound, LogIn } from "lucide-react";

export const SCOUTER_SESSION_STORAGE_KEY = "1731.scouter-session.v2";

const ACCESS_PASSWORD_SHA256 = "2c54d3192c51913aec8904f33c0747e8aa8472dc917e5d79adce970116785f5b";

export interface ScouterSession {
  name: string;
}

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
    if (!parsed.name?.trim()) return null;
    return { name: parsed.name.trim() };
  } catch {
    return null;
  }
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function ScouterSessionProvider({ children }: { children: React.ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<ScouterSession | null>(null);

  useEffect(() => {
    setSession(readStoredSession());
    setHydrated(true);
  }, []);

  function signIn(nextSession: ScouterSession) {
    const normalized = { name: nextSession.name.trim() };
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
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !password) return;

    setChecking(true);
    setMessage(null);
    try {
      const passwordHash = await sha256(password);
      if (passwordHash !== ACCESS_PASSWORD_SHA256) {
        setMessage("Incorrect team access password.");
        setPassword("");
        return;
      }
      onSignIn({ name });
    } catch {
      setMessage("This browser could not verify the access password.");
    } finally {
      setChecking(false);
    }
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
            <h1 className="text-2xl font-semibold text-white">Team access</h1>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-400">
          Enter your name and the shared team password. Your signed-in name stays saved on this device so the app remains usable offline after access is granted.
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
          <span className="font-medium text-slate-200">Team password</span>
          <div className="relative">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={17} />
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Shared access password"
              className="w-full rounded-xl border border-blue-300/20 bg-[#07111f] py-3 pl-10 pr-4 text-base text-white outline-none placeholder:text-slate-600 focus:border-[#0b5fff]"
            />
          </div>
        </label>

        {message ? <div className="mt-4 rounded-xl border border-red-400/20 bg-red-950/20 p-3 text-sm text-red-200">{message}</div> : null}

        <button
          type="submit"
          disabled={!name.trim() || !password || checking}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#ffd84d] px-5 py-3 font-semibold text-[#07111f] hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <LogIn size={18} /> {checking ? "Checking…" : "Enter scouting app"}
        </button>

        <p className="mt-4 text-center text-xs leading-5 text-slate-600">
          Team-use access gate only. Do not share scouting data or the access password outside Team 1731.
        </p>
      </form>
    </main>
  );
}
