import { FeaturePlaceholder } from "@/components/feature-placeholder";
import { PageHeader } from "@/components/page-header";

export default function ComparePage() {
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8"><PageHeader eyebrow="Decision support" title="Team comparison" description="Compare teams across external metrics, scouted production, trends, consistency, reliability, and custom 1731 metrics." /><FeaturePlaceholder title="Planned visualizations">EPA vs OPR, external vs scouted output, match-by-match trends, auto/teleop/endgame components, distributions, and percentile comparisons.</FeaturePlaceholder></main>;
}
