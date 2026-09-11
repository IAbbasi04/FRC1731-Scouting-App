import Link from "next/link";
import { Wrench } from "lucide-react";
import { MatchScoutingForm } from "@/components/match-scouting-form";
import { PageHeader } from "@/components/page-header";
import { ScoutingAssignmentPanel } from "@/components/scouting-assignment-panel";
import { ScoutingSyncPanel } from "@/components/scouting-sync-panel";

export default function ScoutingPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader eyebrow="1731 observations" title="Match scouting" description="A mobile-first raw-data form with offline storage. Entries stay auditable and separate from any derived statistics we calculate later." />
        <Link href="/pit-scouting" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#ffd84d]/35 bg-[#ffd84d]/10 px-4 py-2.5 text-sm font-semibold text-[#ffd84d] hover:bg-[#ffd84d]/15">
          <Wrench size={16} /> Pit scouting
        </Link>
      </div>
      <ScoutingAssignmentPanel />
      <ScoutingSyncPanel />
      <MatchScoutingForm />
    </main>
  );
}
