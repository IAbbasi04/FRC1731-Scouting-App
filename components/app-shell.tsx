import Link from "next/link";
import { BarChart3, ClipboardList, GitCompareArrows, Home, ListChecks, Trophy, Users } from "lucide-react";

const nav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/events", label: "Events", icon: Trophy },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/scouting", label: "Scouting", icon: ClipboardList },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/picklist", label: "Pick List", icon: ListChecks },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-semibold"><span className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-700 bg-zinc-900"><BarChart3 size={19} /></span><span>1731 Scouting</span></Link>
          <nav className="hidden gap-1 md:flex">
            {nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"><Icon size={16} /> {label}</Link>)}
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}
