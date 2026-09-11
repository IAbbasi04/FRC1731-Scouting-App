import Link from "next/link";
import { Wrench } from "lucide-react";
import { MatchScoutingForm } from "@/components/match-scouting-form";
import { PageHeader } from "@/components/page-header";
import { ScoutingAssignmentPanel } from "@/components/scouting-assignment-panel";
import { ScoutingSyncPanel } from "@/components/scouting-sync-panel";

export default function ScoutingPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <PageHeader eyebrow="1731 observations" title="Match scouting" description="A mobile-first raw-data form with offline storage. Entries stay auditable and separate from any derived statistics we calculate later." />
        <Link href="/pit-scouting" className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl border border-[#ffd84d]/35 bg-[#ffd84d]/10 px-4 py-2.5 text-sm font-semibold text-[#ffd84d] hover:bg-[#ffd84d]/15 sm:w-auto">
          <Wrench size={16} /> Pit scouting
        </Link>
      </div>
      <ScoutingAssignmentPanel />
      <MatchScoutingForm />
      <ScoutingSyncPanel />
    </main>
  );
}
