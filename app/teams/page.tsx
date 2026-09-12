import { PageHeader } from "@/components/page-header";
import { TeamsLeaderboard } from "@/components/teams-leaderboard";

export default function TeamsPage() {
  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="Global team intelligence"
        title="Teams"
        description="Rank FRC teams worldwide for any season by peak, average, or latest event OPR, then jump directly into a team profile."
      />
      <TeamsLeaderboard />
    </main>
  );
}
