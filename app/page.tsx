import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardList, GitCompareArrows, ListChecks, Trophy } from "lucide-react";

const sections = [
  { href: "/events", label: "Events", description: "Browse event rosters, rankings, matches, and team metrics.", icon: Trophy },
  { href: "/teams", label: "Teams", description: "Open team profiles with external and scouted performance data.", icon: BarChart3 },
  { href: "/scouting", label: "Scouting", description: "Collect structured match and pit scouting observations.", icon: ClipboardList },
  { href: "/compare", label: "Compare", description: "Compare teams across EPA, OPR, scouting, reliability, and custom metrics.", icon: GitCompareArrows },
  { href: "/picklist", label: "Pick List", description: "Build event-specific alliance selection rankings and notes.", icon: ListChecks },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-zinc-400">Team 1731</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Scouting & analytics platform</h1>
        <p className="mt-4 max-w-3xl text-lg text-zinc-400">One place for FRC event data, external metrics, match scouting, statistical analysis, team comparisons, and alliance-selection decisions.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/events" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-medium text-zinc-950 hover:bg-zinc-200">Browse events <ArrowRight size={18} /></Link>
          <Link href="/scouting" className="rounded-xl border border-zinc-700 px-4 py-2.5 font-medium hover:bg-zinc-800">Open scouting</Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 hover:bg-zinc-900">
            <Icon className="mb-4 text-zinc-400 group-hover:text-zinc-100" />
            <h2 className="text-xl font-semibold">{label}</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
