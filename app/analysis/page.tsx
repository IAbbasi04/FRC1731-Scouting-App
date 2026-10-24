import { PageHeader } from "@/components/page-header";
import { ScoutingAnalysis } from "@/components/scouting-analysis";

const DEFAULT_EVENT_KEY = "2026vagle2";

export default function AnalysisPage() {
  const eventKey = DEFAULT_EVENT_KEY;

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow={eventKey}
        title="Event data"
        description="Use Team 1731's own scouting observations for event-specific decisions. Only Rumble 11 scouting observations are shown here; older event records remain stored."
      />
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
