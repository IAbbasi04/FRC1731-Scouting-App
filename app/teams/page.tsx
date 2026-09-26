import { IcebreakerTeamsDirectory } from "@/components/icebreaker-teams-directory";
import { PageHeader } from "@/components/page-header";
import { getEventDashboard } from "@/lib/event-dashboard";

const EVENT_KEY = "2026vaale1";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const dashboard = await getEventDashboard(EVENT_KEY);
  const teams = [...dashboard.teams].sort((a, b) => a.teamNumber - b.teamNumber);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="2026vaale1 · Icebreaker"
        title="Teams"
        description="Open an event scouting card for any Icebreaker team. Robot photos come from pit scouting; performance, notes, and report history come from synced 1731 match scouting."
      />
      <IcebreakerTeamsDirectory teams={teams} />
    </main>
  );
}
