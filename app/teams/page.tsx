import Link from "next/link";
import { IcebreakerTeamsDirectory } from "@/components/icebreaker-teams-directory";
import { PageHeader } from "@/components/page-header";
import { getEventDashboard } from "@/lib/event-dashboard";

const DEFAULT_EVENT_KEY = "2026vaale1";

export const dynamic = "force-dynamic";

export default async function TeamsPage({ searchParams }: { searchParams?: Promise<{ event?: string }> }) {
  const params = searchParams ? await searchParams : undefined;
  const eventKey = params?.event?.trim().toLowerCase() || DEFAULT_EVENT_KEY;
  const dashboard = await getEventDashboard(eventKey);
  const teams = [...dashboard.teams].sort((a, b) => a.teamNumber - b.teamNumber);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow={eventKey}
        title="Teams"
        description="Open an event scouting card for any team. Robot photos come from pit scouting; performance, notes, and report history come from synced 1731 match scouting."
      />
      <form className="flex max-w-xl gap-2" action="/teams">
        <input name="event" defaultValue={eventKey} aria-label="Event key" className="min-h-11 flex-1 rounded-xl border border-blue-300/20 bg-[#07111f] px-3 font-mono text-white outline-none focus:border-[#0b5fff]" />
        <button className="rounded-xl bg-[#ffd84d] px-4 font-semibold text-[#07111f]">Load event</button>
      </form>
      <IcebreakerTeamsDirectory teams={teams} eventKey={eventKey} />
      <Link href="/events" className="text-sm text-blue-300 hover:text-[#ffd84d]">Find an event key →</Link>
    </main>
  );
}
