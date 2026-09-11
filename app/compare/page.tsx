import { PageHeader } from "@/components/page-header";
import { TeamCompare } from "@/components/team-compare";

export default function ComparePage() {
  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
      <PageHeader eyebrow="Decision support" title="Team comparison" description="Compare up to six teams from the same event across EPA, OPR, DPR, CCWM, rank, and record. Scouting-derived metrics will plug into this same workspace later." />
      <TeamCompare />
    </main>
  );
}
