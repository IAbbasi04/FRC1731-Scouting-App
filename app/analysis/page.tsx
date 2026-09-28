import { PageHeader } from "@/components/page-header";
import { ScoutingAnalysis } from "@/components/scouting-analysis";

const DEFAULT_EVENT_KEY = "2026vaale1";

export default async function AnalysisPage({ searchParams }: { searchParams?: Promise<{ event?: string }> }) {
  const params = searchParams ? await searchParams : undefined;
  const eventKey = params?.event?.trim().toLowerCase() || DEFAULT_EVENT_KEY;

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={eventKey}
        title="Event data"
        description="Use Team 1731's own scouting observations for event-specific decisions. Select any event key to analyze its synced scouting data."
      />
      <form className="flex max-w-xl gap-2" action="/analysis">
        <input name="event" defaultValue={eventKey} aria-label="Event key" className="min-h-11 flex-1 rounded-xl border border-blue-300/20 bg-[#07111f] px-3 font-mono text-white outline-none focus:border-[#0b5fff]" />
        <button className="rounded-xl bg-[#ffd84d] px-4 font-semibold text-[#07111f]">Load event</button>
      </form>
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white">1731 scouting data</h2>
          <p className="mt-1 text-sm text-slate-400">Per-game averages for every scouted team and metric, with a wide comparison table and hideable team graphs.</p>
        </div>
        <ScoutingAnalysis eventKey={eventKey} />
      </section>
    </main>
  );
}
