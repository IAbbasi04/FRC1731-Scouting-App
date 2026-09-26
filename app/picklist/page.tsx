import { IcebreakerPickListAccess } from "@/components/icebreaker-picklist-access";
import { PageHeader } from "@/components/page-header";

export default function PickListPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="2026vaale1 · Restricted"
        title="Icebreaker Pick List"
        description="Alliance-selection workspace for Ibrahim and Hisham. Initial ordering uses OPR; manual strategy judgment, tags, and DNP decisions remain separate."
      />
      <IcebreakerPickListAccess />
    </main>
  );
}
