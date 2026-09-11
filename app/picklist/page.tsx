import { PageHeader } from "@/components/page-header";
import { PickListBuilder } from "@/components/picklist-builder";

export default function PickListPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="Alliance selection"
        title="Pick List"
        description="Start from event OPR, then reorder teams with strategy judgment and tag the roles that matter to your alliance plan."
      />
      <PickListBuilder />
    </main>
  );
}
