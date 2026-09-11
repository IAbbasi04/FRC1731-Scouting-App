"use client";

import Link from "next/link";
import { BarChart3, ClipboardList, GitCompareArrows, Home, ListChecks, LogOut, Trophy, Users, Wrench } from "lucide-react";
import { MetricPreferencesButton } from "@/components/metric-preferences-button";
import { PwaRegistration } from "@/components/pwa-registration";
import { useScouterSession } from "@/components/scouter-session";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/events", label: "Events", icon: Trophy },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/scouting", label: "Scouting", icon: ClipboardList },
  { href: "/pit-scouting", label: "Pit", icon: Wrench },
  { href: "/analysis", label: "Analysis", icon: BarChart3 },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/picklist", label: "Pick List", icon: ListChecks },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, signOut } = useScouterSession();

  return (
    <div className="min-h-screen">
      <PwaRegistration />
      <header className="sticky top-0 z-50 border-b border-blue-400/20 bg-[#07111f]/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3 font-semibold text-white">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-yellow-300/40 bg-[#0b5fff] text-[#ffd84d] shadow-lg shadow-blue-950/30"><BarChart3 size={20} /></span>
            <span className="hidden sm:inline"><span className="text-[#ffd84d]">1731</span> Scouting</span>
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <nav className="hidden gap-1 md:flex">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-300 hover:bg-[#0b5fff]/15 hover:text-[#ffd84d]">
                  <Icon size={16} /> {label}
                </Link>
              ))}
            </nav>
            <div className="hidden max-w-40 lg:block">
              <div className="truncate text-sm font-medium text-white">{session.name}</div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-300/15 px-2.5 py-2 text-xs font-medium text-slate-300 hover:border-[#ffd84d]/40 hover:text-[#ffd84d] sm:px-3"
              title={`Switch user · currently ${session.name}`}
              aria-label={`Switch user. Currently signed in as ${session.name}.`}
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Switch user</span>
            </button>
            <MetricPreferencesButton />
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}
