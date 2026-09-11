import { MatchScoutingForm } from "@/components/match-scouting-form";
import { PageHeader } from "@/components/page-header";
import { ScoutingSyncPanel } from "@/components/scouting-sync-panel";

export default function ScoutingPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader eyebrow="1731 observations" title="Match scouting" description="A mobile-first raw-data form with offline storage. Entries stay auditable and separate from any derived statistics we calculate later." />
      <ScoutingSyncPanel />
      <MatchScoutingForm />
    </main>
  );
}
