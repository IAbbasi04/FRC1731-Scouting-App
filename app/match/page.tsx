import { IcebreakerMatchAccess } from "@/components/icebreaker-match-access";
import { PageHeader } from "@/components/page-header";

export default function MatchPage() {
  return (
    <main className="mx-auto max-w-[1800px] space-y-6 px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
      <PageHeader
        eyebrow="Event strategy · Restricted access"
        title="Match"
        description="Select an event and qualification match to load the six teams, review 1731 scouting and OPR context, and download the full strategy board as an image."
      />
      <IcebreakerMatchAccess />
    </main>
  );
}
