import { FeaturePlaceholder } from "@/components/feature-placeholder";
import { PageHeader } from "@/components/page-header";

export default function TeamsPage() {
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8"><PageHeader eyebrow="Team intelligence" title="Teams" description="Team profiles will combine TBA, Statbotics, ACE, and 1731 scouting data while preserving each metric's source." /><FeaturePlaceholder title="Next milestone">Team search, event-specific team profiles, EPA/OPR cards, match history, and scouting summaries will be implemented here.</FeaturePlaceholder></main>;
}
