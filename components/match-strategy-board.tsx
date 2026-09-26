"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";
import { Download, RefreshCw } from "lucide-react";
import { toPng } from "html-to-image";

const EVENT_KEY = "2026vaale1";
const listEventEntries = makeFunctionReference<"query">("analysis:listEventEntries");

type MatchAlliance = {
  score: number;
  team_keys: string[];
  surrogate_team_keys: string[];
  dq_team_keys: string[];
};

type EventMatch = {
  key: string;
  comp_level: "qm" | "ef" | "qf" | "sf" | "f";
  set_number: number;
  match_number: number;
  alliances: {
    red: MatchAlliance;
    blue: MatchAlliance;
  };
  winning_alliance: "red" | "blue" | "";
  event_key: string;
  time: number | null;
  predicted_time: number | null;
  actual_time: number | null;
};

type EventTeam = {
  teamNumber: number;
  teamKey: string;
  nickname: string;
  city: string | null;
  stateProv: string | null;
  rank: number | null;
  opr: number | null;
};

type EventData = {
  event: {
    key: string;
    name: string;
    year: number;
    city: string | null;
    stateProv: string | null;
  };
  teams: EventTeam[];
};

type CloudEntry = {
  _id: string;
  clientId: string;
  eventKey: string;
  matchNumber: number;
  teamNumber: number;
  scoutName: string;
  createdAt: string;
  gameData: Record<string, string | number | boolean | null>;
  defense: "none" | "light" | "heavy";
  driverRating?: number;
  playedDefense?: boolean;
  defenseRating?: number;
  penalties: number;
  disabled: boolean;
  tipped: boolean;
  mechanicalIssue: boolean;
  notes: string;
};

type TeamStats = EventTeam & {
  reports: number;
  uniqueMatches: number;
  autoFuel: number | null;
  teleopFuel: number | null;
  fuelPassed: number | null;
  fieldGoalPercent: number | null;
  driverRating: number | null;
  defenseRating: number | null;
  reliabilityIssueRate: number | null;
  towerFinish: string;
  confidence: "none" | "low" | "medium" | "high";
};

function teamNumberFromKey(key: string) {
  return Number(key.replace(/^frc/, ""));
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function formatNumber(value: number | null, digits = 1) {
  return value === null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}

function averageGameValue(entries: CloudEntry[], key: string) {
  return average(
    entries
      .map((entry) => entry.gameData[key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
  );
}

function mostCommonTower(entries: CloudEntry[]) {
  const labels: Record<string, string> = {
    none: "None",
    level1: "Level 1",
    level2: "Level 2",
    level3: "Level 3",
  };
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const value = entry.gameData.towerLevel;
    if (typeof value !== "string") continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  return top ? labels[top] ?? top : "—";
}

function confidenceFor(matches: number): TeamStats["confidence"] {
  if (matches <= 0) return "none";
  if (matches === 1) return "low";
  if (matches <= 3) return "medium";
  return "high";
}

function confidenceClasses(level: TeamStats["confidence"]) {
  if (level === "high") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (level === "medium") return "border-yellow-300/25 bg-yellow-300/10 text-yellow-100";
  if (level === "low") return "border-orange-400/25 bg-orange-400/10 text-orange-200";
  return "border-slate-500/25 bg-slate-500/10 text-slate-400";
}

export function MatchStrategyBoard() {
  const boardRef = useRef<HTMLDivElement>(null);
  const [matches, setMatches] = useState<EventMatch[]>([]);
  const [eventData, setEventData] = useState<EventData | null>(null);
  const [entries, setEntries] = useState<CloudEntry[]>([]);
  const [selectedMatchKey, setSelectedMatchKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.key === selectedMatchKey) ?? matches[0] ?? null,
    [matches, selectedMatchKey],
  );

  const statsByTeam = useMemo(() => {
    const map = new Map<number, TeamStats>();
    for (const team of eventData?.teams ?? []) {
      const teamEntries = entries.filter((entry) => entry.teamNumber === team.teamNumber);
      const uniqueMatches = new Set(teamEntries.map((entry) => entry.matchNumber)).size;
      const issueCount = teamEntries.filter(
        (entry) => entry.disabled || entry.tipped || entry.mechanicalIssue,
      ).length;
      const driverRatings = teamEntries
        .map((entry) => entry.driverRating)
        .filter((value): value is number => typeof value === "number");
      const defenseRatings = teamEntries
        .map((entry) => entry.defenseRating)
        .filter((value): value is number => typeof value === "number");

      map.set(team.teamNumber, {
        ...team,
        reports: teamEntries.length,
        uniqueMatches,
        autoFuel: averageGameValue(teamEntries, "autoFuelScoredEstimate"),
        teleopFuel: averageGameValue(teamEntries, "teleopFuelScoredEstimate"),
        fuelPassed: averageGameValue(teamEntries, "teleopFuelPassed"),
        fieldGoalPercent: averageGameValue(teamEntries, "teleopFieldGoalPercent"),
        driverRating: average(driverRatings),
        defenseRating: average(defenseRatings),
        reliabilityIssueRate: teamEntries.length ? issueCount / teamEntries.length : null,
        towerFinish: mostCommonTower(teamEntries),
        confidence: confidenceFor(uniqueMatches),
      });
    }
    return map;
  }, [entries, eventData]);

  async function loadBoardData() {
    setLoading(true);
    setMessage(null);

    try {
      const [matchesResponse, eventResponse] = await Promise.all([
        fetch(`/api/tba/event/${EVENT_KEY}/matches`, { cache: "no-store" }),
        fetch(`/api/picklist/${EVENT_KEY}`, { cache: "no-store" }),
      ]);

      const matchesPayload = await matchesResponse.json();
      const eventPayload = await eventResponse.json();

      if (!matchesResponse.ok || !Array.isArray(matchesPayload)) {
        throw new Error(matchesPayload?.error ?? "Could not load Icebreaker matches.");
      }
      if (!eventResponse.ok || !eventPayload?.teams) {
        throw new Error(eventPayload?.error ?? "Could not load Icebreaker team data.");
      }

      const qualifications = (matchesPayload as EventMatch[])
        .filter((match) => match.comp_level === "qm")
        .sort((a, b) => a.match_number - b.match_number);

      setMatches(qualifications);
      setEventData(eventPayload as EventData);
      setSelectedMatchKey((current) =>
        qualifications.some((match) => match.key === current)
          ? current
          : qualifications[0]?.key ?? "",
      );

      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (convexUrl) {
        try {
          const client = new ConvexHttpClient(convexUrl);
          const cloudEntries = await client.query(listEventEntries, { eventKey: EVENT_KEY }) as CloudEntry[];
          setEntries(cloudEntries);
        } catch {
          setEntries([]);
          setMessage("Match schedule loaded, but 1731 cloud scouting data could not be refreshed.");
        }
      } else {
        setEntries([]);
        setMessage("Match schedule loaded, but NEXT_PUBLIC_CONVEX_URL is not configured.");
      }

      if (!qualifications.length) {
        setMessage("No qualification matches are published for Icebreaker yet.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load the Match board.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBoardData();
  }, []);

  async function downloadBoard() {
    if (!boardRef.current || !selectedMatch) return;
    setDownloading(true);
    setMessage(null);
    try {
      if ("fonts" in document) await document.fonts.ready;
      const dataUrl = await toPng(boardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: "#07111f",
      });
      const anchor = document.createElement("a");
      anchor.download = `1731-icebreaker-Q${selectedMatch.match_number}-strategy.png`;
      anchor.href = dataUrl;
      anchor.click();
    } catch {
      setMessage("Could not generate the downloadable image on this browser.");
    } finally {
      setDownloading(false);
    }
  }

  const blueTeams = selectedMatch?.alliances.blue.team_keys.map(teamNumberFromKey) ?? [];
  const redTeams = selectedMatch?.alliances.red.team_keys.map(teamNumberFromKey) ?? [];

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/85 p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-300">Qualification match</span>
              <select
                value={selectedMatch?.key ?? ""}
                onChange={(event) => setSelectedMatchKey(event.target.value)}
                disabled={loading || !matches.length}
                className="min-h-11 min-w-52 rounded-xl border border-blue-300/20 bg-[#07111f] px-3 py-2.5 text-white outline-none focus:border-[#0b5fff] disabled:opacity-50"
              >
                {!matches.length ? <option value="">No matches available</option> : null}
                {matches.map((match) => (
                  <option key={match.key} value={match.key}>Qualification {match.match_number}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void loadBoardData()}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/20 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-[#ffd84d]/40 disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          <button
            type="button"
            onClick={() => void downloadBoard()}
            disabled={!selectedMatch || downloading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ffd84d] px-5 py-2.5 font-semibold text-[#07111f] hover:bg-yellow-300 disabled:opacity-50"
          >
            <Download size={17} />
            {downloading ? "Generating image…" : "Download image"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          The field is a strategy schematic, not a scale drawing. OPR/rank are external event context; all other performance stats below come from Team 1731 scouting.
        </p>
        {message ? <div className="mt-3 rounded-xl border border-yellow-300/20 bg-yellow-300/5 px-3 py-2 text-sm text-yellow-100">{message}</div> : null}
      </section>

      <div className="overflow-x-auto pb-2">
        <div
          ref={boardRef}
          className="min-w-[1360px] rounded-3xl border border-blue-400/20 bg-[#07111f] p-5 shadow-2xl shadow-black/30"
        >
          <div className="mb-4 flex items-end justify-between gap-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#ffd84d]">Team 1731 · Chesapeake Robotics Icebreaker</div>
              <h2 className="mt-1 text-3xl font-bold text-white">
                {selectedMatch ? `Qualification ${selectedMatch.match_number}` : "Match strategy board"}
              </h2>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm text-slate-300">{EVENT_KEY}</div>
              <div className="mt-1 text-xs text-slate-600">Generated from current TBA + 1731 scouting data</div>
            </div>
          </div>

          <div className="grid grid-cols-[300px_minmax(700px,1fr)_300px] gap-4">
            <AllianceColumn
              alliance="blue"
              teamNumbers={blueTeams}
              statsByTeam={statsByTeam}
            />

            <section className="overflow-hidden rounded-3xl border border-blue-300/15 bg-[#0d1b2e] p-3">
              <FieldSchematic
                blueTeams={blueTeams}
                redTeams={redTeams}
              />
            </section>

            <AllianceColumn
              alliance="red"
              teamNumbers={redTeams}
              statsByTeam={statsByTeam}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AllianceColumn({
  alliance,
  teamNumbers,
  statsByTeam,
}: {
  alliance: "blue" | "red";
  teamNumbers: number[];
  statsByTeam: Map<number, TeamStats>;
}) {
  const teamStats = teamNumbers.map((team) => statsByTeam.get(team)).filter((team): team is TeamStats => Boolean(team));
  const summedOpr = teamStats.reduce((sum, team) => sum + (team.opr ?? 0), 0);
  const color = alliance === "blue";
  return (
    <section className={`overflow-hidden rounded-2xl border ${color ? "border-blue-400/35 bg-blue-950/20" : "border-red-400/35 bg-red-950/20"}`}>
      <header className={`border-b px-4 py-3 ${color ? "border-blue-400/20 bg-blue-500/10" : "border-red-400/20 bg-red-500/10"}`}>
        <div className={`text-xs font-bold uppercase tracking-[0.18em] ${color ? "text-blue-200" : "text-red-200"}`}>{alliance} alliance</div>
        <div className="mt-1 flex items-baseline justify-between gap-3">
          <span className="text-sm text-slate-400">Combined OPR</span>
          <span className="font-mono text-xl font-bold text-white">{teamStats.some((team) => team.opr !== null) ? summedOpr.toFixed(1) : "—"}</span>
        </div>
      </header>
      <div className="divide-y divide-blue-400/10">
        {teamNumbers.length ? teamNumbers.map((teamNumber) => (
          <TeamCard
            key={teamNumber}
            teamNumber={teamNumber}
            stats={statsByTeam.get(teamNumber)}
            alliance={alliance}
          />
        )) : (
          <div className="p-5 text-sm text-slate-500">No teams published for this match.</div>
        )}
      </div>
    </section>
  );
}

function TeamCard({
  teamNumber,
  stats,
  alliance,
}: {
  teamNumber: number;
  stats?: TeamStats;
  alliance: "blue" | "red";
}) {
  const accent = alliance === "blue" ? "text-blue-200" : "text-red-200";
  const issuePercent = stats?.reliabilityIssueRate === null || stats?.reliabilityIssueRate === undefined
    ? "—"
    : `${Math.round(stats.reliabilityIssueRate * 100)}%`;

  return (
    <article className="bg-[#0b1727]/88 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-2xl font-black ${accent}`}>{teamNumber}</div>
          <div className="mt-0.5 truncate text-xs text-slate-400">{stats?.nickname ?? "Team data loading"}</div>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] ${confidenceClasses(stats?.confidence ?? "none")}`}>
          {stats?.confidence ?? "none"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Stat label="OPR" value={formatNumber(stats?.opr ?? null)} />
        <Stat label="Rank" value={stats?.rank ? String(stats.rank) : "—"} />
        <Stat label="Auto fuel" value={formatNumber(stats?.autoFuel ?? null)} />
        <Stat label="Teleop fuel" value={formatNumber(stats?.teleopFuel ?? null)} />
        <Stat label="Fuel passed" value={formatNumber(stats?.fuelPassed ?? null)} />
        <Stat label="FG%" value={stats?.fieldGoalPercent === null || stats?.fieldGoalPercent === undefined ? "—" : `${Math.round(stats.fieldGoalPercent)}%`} />
        <Stat label="Driver" value={formatNumber(stats?.driverRating ?? null)} />
        <Stat label="Defense" value={formatNumber(stats?.defenseRating ?? null)} />
        <Stat label="Tower" value={stats?.towerFinish ?? "—"} compact />
        <Stat label="Issues" value={issuePercent} />
      </div>

      <div className="mt-3 text-[11px] text-slate-600">
        {stats ? `${stats.uniqueMatches} scouted match${stats.uniqueMatches === 1 ? "" : "es"} · ${stats.reports} report${stats.reports === 1 ? "" : "s"}` : "No scouting reports loaded"}
      </div>
    </article>
  );
}

function Stat({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <div className="rounded-lg border border-blue-300/10 bg-[#07111f]/75 px-2.5 py-2">
      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-600">{label}</div>
      <div className={`mt-0.5 font-semibold text-white ${compact ? "text-xs" : "font-mono text-sm"}`}>{value}</div>
    </div>
  );
}

function FieldSchematic({
  blueTeams,
  redTeams,
}: {
  blueTeams: number[];
  redTeams: number[];
}) {
  return (
    <div className="relative aspect-[1.75/1] min-h-[560px] w-full overflow-hidden rounded-2xl bg-[#111827]">
      <svg viewBox="0 0 1200 690" className="h-full w-full" role="img" aria-label="REBUILT strategy field schematic">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#ffffff" strokeOpacity="0.04" strokeWidth="1" />
          </pattern>
          <linearGradient id="fieldFade" x1="0" x2="1">
            <stop offset="0%" stopColor="#153c77" stopOpacity="0.62" />
            <stop offset="42%" stopColor="#111827" stopOpacity="0" />
            <stop offset="58%" stopColor="#111827" stopOpacity="0" />
            <stop offset="100%" stopColor="#7f1d2d" stopOpacity="0.62" />
          </linearGradient>
        </defs>

        <rect width="1200" height="690" rx="28" fill="#0b1220" />
        <rect x="20" y="20" width="1160" height="650" rx="22" fill="url(#fieldFade)" stroke="#dbeafe" strokeOpacity="0.24" strokeWidth="3" />
        <rect x="20" y="20" width="1160" height="650" rx="22" fill="url(#grid)" />

        <rect x="40" y="70" width="245" height="550" rx="18" fill="#2563eb" fillOpacity="0.13" stroke="#60a5fa" strokeOpacity="0.42" strokeWidth="2" />
        <rect x="915" y="70" width="245" height="550" rx="18" fill="#dc2626" fillOpacity="0.13" stroke="#f87171" strokeOpacity="0.42" strokeWidth="2" />
        <line x1="600" x2="600" y1="25" y2="665" stroke="#f8fafc" strokeOpacity="0.25" strokeWidth="3" strokeDasharray="12 12" />

        <circle cx="600" cy="345" r="112" fill="#ffd84d" fillOpacity="0.08" stroke="#ffd84d" strokeOpacity="0.62" strokeWidth="5" />
        <circle cx="600" cy="345" r="58" fill="#ffd84d" fillOpacity="0.14" stroke="#ffd84d" strokeOpacity="0.38" strokeWidth="3" />
        <text x="600" y="339" textAnchor="middle" fill="#fde68a" fontSize="24" fontWeight="700">HUB</text>
        <text x="600" y="371" textAnchor="middle" fill="#94a3b8" fontSize="14">central scoring zone</text>

        <rect x="305" y="85" width="135" height="92" rx="14" fill="#0f172a" stroke="#60a5fa" strokeOpacity="0.45" strokeWidth="3" />
        <rect x="305" y="513" width="135" height="92" rx="14" fill="#0f172a" stroke="#60a5fa" strokeOpacity="0.45" strokeWidth="3" />
        <rect x="760" y="85" width="135" height="92" rx="14" fill="#0f172a" stroke="#f87171" strokeOpacity="0.45" strokeWidth="3" />
        <rect x="760" y="513" width="135" height="92" rx="14" fill="#0f172a" stroke="#f87171" strokeOpacity="0.45" strokeWidth="3" />

        <text x="372" y="138" textAnchor="middle" fill="#93c5fd" fontSize="16" fontWeight="700">TRENCH</text>
        <text x="372" y="566" textAnchor="middle" fill="#93c5fd" fontSize="16" fontWeight="700">TRENCH</text>
        <text x="827" y="138" textAnchor="middle" fill="#fca5a5" fontSize="16" fontWeight="700">TRENCH</text>
        <text x="827" y="566" textAnchor="middle" fill="#fca5a5" fontSize="16" fontWeight="700">TRENCH</text>

        <path d="M470 155 L520 115 L570 155 L520 195 Z" fill="#475569" fillOpacity="0.48" stroke="#94a3b8" strokeOpacity="0.45" strokeWidth="2" />
        <path d="M470 535 L520 495 L570 535 L520 575 Z" fill="#475569" fillOpacity="0.48" stroke="#94a3b8" strokeOpacity="0.45" strokeWidth="2" />
        <path d="M630 155 L680 115 L730 155 L680 195 Z" fill="#475569" fillOpacity="0.48" stroke="#94a3b8" strokeOpacity="0.45" strokeWidth="2" />
        <path d="M630 535 L680 495 L730 535 L680 575 Z" fill="#475569" fillOpacity="0.48" stroke="#94a3b8" strokeOpacity="0.45" strokeWidth="2" />

        <text x="520" y="160" textAnchor="middle" fill="#cbd5e1" fontSize="13">BUMP</text>
        <text x="520" y="540" textAnchor="middle" fill="#cbd5e1" fontSize="13">BUMP</text>
        <text x="680" y="160" textAnchor="middle" fill="#cbd5e1" fontSize="13">BUMP</text>
        <text x="680" y="540" textAnchor="middle" fill="#cbd5e1" fontSize="13">BUMP</text>

        <text x="162" y="54" textAnchor="middle" fill="#bfdbfe" fontSize="15" fontWeight="700">BLUE ALLIANCE</text>
        <text x="1038" y="54" textAnchor="middle" fill="#fecaca" fontSize="15" fontWeight="700">RED ALLIANCE</text>

        {blueTeams.map((team, index) => (
          <g key={`blue-${team}`}>
            <circle cx={155} cy={230 + index * 115} r="42" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="3" />
            <text x={155} y={237 + index * 115} textAnchor="middle" fill="#ffffff" fontSize="21" fontWeight="800">{team}</text>
          </g>
        ))}

        {redTeams.map((team, index) => (
          <g key={`red-${team}`}>
            <circle cx={1045} cy={230 + index * 115} r="42" fill="#b91c1c" stroke="#fca5a5" strokeWidth="3" />
            <text x={1045} y={237 + index * 115} textAnchor="middle" fill="#ffffff" fontSize="21" fontWeight="800">{team}</text>
          </g>
        ))}

        <text x="600" y="640" textAnchor="middle" fill="#64748b" fontSize="14">REBUILT · strategy schematic · not to scale</text>
      </svg>

      <div className="pointer-events-none absolute left-5 top-5 rounded-lg border border-white/10 bg-black/30 px-3 py-2 backdrop-blur">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-white">Field view</div>
        <div className="text-[11px] text-slate-400">Use team cards for scouting context</div>
      </div>
    </div>
  );
}
