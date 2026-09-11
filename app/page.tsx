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
      <section className="overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-[#0d1b2e] via-[#0b5fff]/10 to-[#0d1b2e] p-8 shadow-2xl shadow-blue-950/20">
        <div className="mb-6 h-1.5 w-28 rounded-full bg-[#ffd84d]" />
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#ffd84d]">Team 1731</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Scouting & analytics platform</h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">One place for FRC event data, external metrics, match scouting, statistical analysis, team comparisons, and alliance-selection decisions.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/events" className="inline-flex items-center gap-2 rounded-xl bg-[#ffd84d] px-4 py-2.5 font-semibold text-[#07111f] hover:bg-yellow-300">Browse events <ArrowRight size={18} /></Link>
          <Link href="/scouting" className="rounded-xl border border-blue-300/30 bg-[#0b5fff]/10 px-4 py-2.5 font-medium text-blue-100 hover:bg-[#0b5fff]/20">Open scouting</Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sections.map(({ href, label, description, icon: Icon }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-blue-400/15 bg-[#0d1b2e]/90 p-5 hover:border-[#ffd84d]/50 hover:bg-[#11243d]">
            <Icon className="mb-4 text-[#0b5fff] group-hover:text-[#ffd84d]" />
            <h2 className="text-xl font-semibold text-white">{label}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          </Link>
        ))}
      </section>
    </main>
  );
}
