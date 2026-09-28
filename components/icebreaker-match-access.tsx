"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { MatchStrategyBoard } from "@/components/match-strategy-board";
import { useScouterSession } from "@/components/scouter-session";

const ALLOWED_MATCH_USERS = new Set(["ibrahim", "hisham"]);

export function IcebreakerMatchAccess() {
  const { session } = useScouterSession();
  const allowed = ALLOWED_MATCH_USERS.has(session.name.trim().toLowerCase());

  if (!allowed) {
    return (
      <div className="rounded-2xl border border-yellow-300/20 bg-[#0d1b2e]/85 p-6">
        <div className="flex items-center gap-3 text-[#ffd84d]">
          <LockKeyhole size={20} />
          <h2 className="font-semibold">Match board restricted</h2>
        </div>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          The strategy Match board is limited to authorized strategy users.
          You are signed in as <span className="font-medium text-white">{session.name}</span>.
        </p>
        <Link
          href="/scouting"
          className="mt-5 inline-flex rounded-xl border border-blue-300/20 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:border-[#ffd84d]/40"
        >
          Return to match scouting
        </Link>
      </div>
    );
  }

  return <MatchStrategyBoard />;
}
