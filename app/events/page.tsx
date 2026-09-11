import { EventLookup } from "@/components/event-lookup";
import { PageHeader } from "@/components/page-header";

export default function EventsPage() {
  return <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8"><PageHeader eyebrow="FRC data" title="Events" description="Enter a TBA event key to load an event roster from The Blue Alliance. This is the first live-data milestone for the app." /><EventLookup /></main>;
}
