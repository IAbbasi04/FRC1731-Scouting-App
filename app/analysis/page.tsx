import { PageHeader } from "@/components/page-header";
import { ScoutingAnalysis } from "@/components/scouting-analysis";

export default function AnalysisPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="1731 cloud scouting"
        title="Scouting analysis"
        description="Analyze synced raw scouting entries by event and team. These summaries use 1731 observations only and remain separate from external TBA or Statbotics metrics."
      />
      <ScoutingAnalysis />
    </main>
  );
}
