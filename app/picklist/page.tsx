import { FeaturePlaceholder } from "@/components/feature-placeholder";
import { PageHeader } from "@/components/page-header";

export default function PickListPage() {
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8"><PageHeader eyebrow="Alliance selection" title="Pick List" description="Build event-specific rankings that combine quantitative models with scout and strategy judgment." /><FeaturePlaceholder title="Planned workflow">Custom metric weights, manual drag-and-drop ordering, team tags, do-not-pick flags, compatibility notes, and automatic removal of selected teams.</FeaturePlaceholder></main>;
}
