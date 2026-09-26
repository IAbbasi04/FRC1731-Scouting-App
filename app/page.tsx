import Link from "next/link";
import { ArrowRight, BarChart3, ClipboardList, Users, Wrench } from "lucide-react";

const sections = [
  { href: "/scouting", label: "Match scouting", description: "Scout qualification matches at Chesapeake Robotics Icebreaker.", icon: ClipboardList },
  { href: "/pit-scouting", label: "Pit scouting", description: "Capture robot capabilities and pit observations for Icebreaker teams.", icon: Wrench },
  { href: "/analysis", label: "Event data", description: "Review Team 1731 scouting observations alongside the app's OPR tools.", icon: BarChart3 },
  { href: "/teams", label: "Teams", description: "Open individual Icebreaker team scouting cards with robot photos, stats, notes, and match reports.", icon: Users },
];

export default function HomePage() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-blue-400/20 bg-gradient-to-br from-[#0d1b2e] via-[#0b5fff]/10 to-[#0d1b2e] p-8 shadow-2xl shadow-blue-950/20">
        <div className="mb-6 h-1.5 w-28 rounded-full bg-[#ffd84d]" />
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#ffd84d]">Team 1731 · Icebreaker build</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">Chesapeake Robotics Icebreaker</h1>
        <p className="mt-4 max-w-3xl text-lg text-slate-300">Temporary event build locked to <span className="font-mono text-white">2026vaale1</span>. Use match scouting or pit scouting during the event, then review the collected data.</p>
        <Link href="/scouting" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#ffd84d] px-4 py-2.5 font-semibold text-[#07111f] hover:bg-yellow-300">Start match scouting <ArrowRight size={18} /></Link>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
