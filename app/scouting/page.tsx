import { FeaturePlaceholder } from "@/components/feature-placeholder";
import { PageHeader } from "@/components/page-header";

export default function ScoutingPage() {
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8"><PageHeader eyebrow="1731 observations" title="Scouting" description="A mobile-first, offline-friendly workflow for match, pit, reliability, and subjective scouting." /><FeaturePlaceholder title="Planned data model">Every observation will retain event, match, team, scout, timestamp, raw values, and provenance so derived statistics remain auditable.</FeaturePlaceholder></main>;
}
