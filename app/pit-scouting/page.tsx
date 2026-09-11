import { PageHeader } from "@/components/page-header";
import { PitScoutingForm } from "@/components/pit-scouting-form";

export default function PitScoutingPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader
        eyebrow="1731 pit observations"
        title="Pit scouting"
        description="Capture robot capabilities and team-reported information before validating it against match performance. Entries save locally first and sync to the shared cloud database when connectivity is available."
      />
      <PitScoutingForm />
    </main>
  );
}
