import { PageHeader } from "@/components/page-header";
import { ScoutingAnalysis } from "@/components/scouting-analysis";
import { TeamsLeaderboard } from "@/components/teams-leaderboard";

export default function AnalysisPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="2026vaale1 · Icebreaker"
        title="Event data"
        description="Use Team 1731's own scouting observations for event-specific decisions, then use OPR as an external comparison signal. Keep the two sources visually separate so OPR never masquerades as our scouting data."
      />
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-white">1731 scouting data</h2>
          <p className="mt-1 text-sm text-slate-400">Per-team observations, sample size, confidence, reliability, defense, driver ratings, and configured game metrics from Icebreaker reports.</p>
        </div>
        <ScoutingAnalysis />
      </section>
      <section className="space-y-4 border-t border-blue-400/15 pt-8">
        <div>
          <h2 className="text-2xl font-bold text-white">OPR reference</h2>
          <p className="mt-1 text-sm text-slate-400">External OPR context for comparison. Search an Icebreaker team or plot several teams to compare their 2026 OPR distributions.</p>
        </div>
        <TeamsLeaderboard />
      </section>
    </main>
  );
}
