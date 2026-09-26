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
  const [boardMode, setBoardMode] = useState<"match" | "manual">("match");
  const [manualRed, setManualRed] = useState(["", "", ""]);
  const [manualBlue, setManualBlue] = useState(["", "", ""]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const selectedMatch = useMemo(
    () => matches.find((match) => match.key === selectedMatchKey) ?? matches[0] ?? null,
    [matches, selectedMatchKey],
  );

  const matchBlueTeams = selectedMatch?.alliances.blue.team_keys.map(teamNumberFromKey) ?? [];
  const matchRedTeams = selectedMatch?.alliances.red.team_keys.map(teamNumberFromKey) ?? [];
  const manualBlueTeams = manualBlue.map(Number).filter((team) => Number.isInteger(team) && team > 0);
  const manualRedTeams = manualRed.map(Number).filter((team) => Number.isInteger(team) && team > 0);
  const blueTeams = boardMode === "manual" ? manualBlueTeams : matchBlueTeams;
  const redTeams = boardMode === "manual" ? manualRedTeams : matchRedTeams;

  const statsByTeam = useMemo(() => {
    const map = new Map<number, TeamStats>();
    const eventTeams = new Map((eventData?.teams ?? []).map((team) => [team.teamNumber, team]));
    const candidateNumbers = new Set<number>([
      ...eventTeams.keys(),
      ...entries.map((entry) => entry.teamNumber),
      ...blueTeams,
      ...redTeams,
    ]);

    for (const teamNumber of candidateNumbers) {
      const team = eventTeams.get(teamNumber) ?? {
        teamNumber,
        teamKey: `frc${teamNumber}`,
        nickname: `Team ${teamNumber}`,
        city: null,
        stateProv: null,
        rank: null,
        opr: null,
      };
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
  }, [entries, eventData, blueTeams.join(","), redTeams.join(",")]);

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

  function switchBoardMode(nextMode: "match" | "manual") {
    if (
      nextMode === "manual"
      && selectedMatch
      && [...manualRed, ...manualBlue].every((value) => !value.trim())
    ) {
      setManualRed(selectedMatch.alliances.red.team_keys.map((key) => String(teamNumberFromKey(key))));
      setManualBlue(selectedMatch.alliances.blue.team_keys.map((key) => String(teamNumberFromKey(key))));
    }
    setBoardMode(nextMode);
  }

  function setManualTeam(alliance: "red" | "blue", index: number, value: string) {
    const normalized = value.replace(/\D/g, "").slice(0, 5);
    const setter = alliance === "red" ? setManualRed : setManualBlue;
    setter((current) => current.map((team, teamIndex) => teamIndex === index ? normalized : team));
  }

  async function downloadBoard() {
    if (!boardRef.current || (boardMode === "match" && !selectedMatch)) return;
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
      anchor.download = boardMode === "manual"
        ? "1731-icebreaker-manual-strategy.png"
        : `1731-icebreaker-Q${selectedMatch?.match_number ?? "unknown"}-strategy.png`;
      anchor.href = dataUrl;
      anchor.click();
    } catch {
      setMessage("Could not generate the downloadable image on this browser.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-blue-400/20 bg-[#0d1b2e]/85 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="inline-flex rounded-xl border border-blue-300/15 bg-[#07111f] p-1">
                <button
                  type="button"
                  onClick={() => switchBoardMode("match")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${boardMode === "match" ? "bg-[#0b5fff] text-white" : "text-slate-400 hover:text-white"}`}
                >
                  Actual match
                </button>
                <button
                  type="button"
                  onClick={() => switchBoardMode("manual")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${boardMode === "manual" ? "bg-[#ffd84d] text-[#07111f]" : "text-slate-400 hover:text-white"}`}
                >
                  Manual override
                </button>
              </div>

              {boardMode === "match" ? (
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
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <ManualAllianceInputs alliance="red" values={manualRed} onChange={setManualTeam} />
                  <ManualAllianceInputs alliance="blue" values={manualBlue} onChange={setManualTeam} />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => void downloadBoard()}
              disabled={(boardMode === "match" && !selectedMatch) || downloading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#ffd84d] px-5 py-2.5 font-semibold text-[#07111f] hover:bg-yellow-300 disabled:opacity-50"
            >
              <Download size={17} />
              {downloading ? "Generating image…" : "Download image"}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          Actual match mode follows TBA. Manual override lets you enter any three red and three blue teams, then switch back without losing the selected qualification match. OPR/rank are event context; the remaining stats come from Team 1731 scouting.
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
                {boardMode === "manual" ? "Manual alliance board" : selectedMatch ? `Qualification ${selectedMatch.match_number}` : "Match strategy board"}
              </h2>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm text-slate-300">{EVENT_KEY}</div>
              <div className="mt-1 text-xs text-slate-600">Generated from current TBA + 1731 scouting data</div>
            </div>
          </div>

          <div className="grid grid-cols-[300px_minmax(700px,1fr)_300px] gap-4">
            <AllianceColumn
              alliance="red"
              teamNumbers={redTeams}
              statsByTeam={statsByTeam}
            />

            <section className="overflow-hidden rounded-3xl border border-blue-300/15 bg-[#0d1b2e] p-3">
              <FieldImage
                blueTeams={blueTeams}
                redTeams={redTeams}
              />
            </section>

            <AllianceColumn
              alliance="blue"
              teamNumbers={blueTeams}
              statsByTeam={statsByTeam}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function ManualAllianceInputs({
  alliance,
  values,
  onChange,
}: {
  alliance: "red" | "blue";
  values: string[];
  onChange: (alliance: "red" | "blue", index: number, value: string) => void;
}) {
  const red = alliance === "red";
  return (
    <div className={`rounded-xl border p-3 ${red ? "border-red-400/25 bg-red-950/15" : "border-blue-400/25 bg-blue-950/15"}`}>
      <div className={`mb-2 text-xs font-bold uppercase tracking-[0.14em] ${red ? "text-red-200" : "text-blue-200"}`}>{alliance} alliance teams</div>
      <div className="grid grid-cols-3 gap-2">
        {values.map((value, index) => (
          <input
            key={index}
            inputMode="numeric"
            pattern="[0-9]*"
            value={value}
            onChange={(event) => onChange(alliance, index, event.target.value)}
            placeholder={`Team ${index + 1}`}
            aria-label={`${alliance} alliance team ${index + 1}`}
            className="min-w-0 rounded-lg border border-blue-300/15 bg-[#07111f] px-2 py-2.5 text-center font-mono text-sm font-semibold text-white outline-none focus:border-[#ffd84d]/50"
          />
        ))}
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

function FieldImage({
  blueTeams,
  redTeams,
}: {
  blueTeams: number[];
  redTeams: number[];
}) {
  return (
    <div className="relative aspect-[40/21] min-h-[520px] w-full overflow-hidden rounded-2xl bg-[#111827]">
      <img
        src="/assets/2026FieldImage.webp"
        alt="2026 REBUILT field"
        className="absolute inset-0 h-full w-full object-fill"
        draggable={false}
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-red-950/10 via-transparent to-blue-950/10" />

      <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/15 bg-black/55 px-3 py-2 backdrop-blur-sm">
        <div className="text-xs font-bold uppercase tracking-[0.16em] text-white">2026 REBUILT field</div>
        <div className="text-[11px] text-slate-300">Official field image · red left · blue right</div>
      </div>

      <div className="pointer-events-none absolute left-[3%] top-1/2 flex -translate-y-1/2 flex-col gap-4">
        {redTeams.map((team) => (
          <div key={`field-red-${team}`} className="rounded-lg border-2 border-red-200/90 bg-red-700/90 px-3 py-2 text-center font-mono text-lg font-black text-white shadow-xl shadow-black/40">
            {team}
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute right-[3%] top-1/2 flex -translate-y-1/2 flex-col gap-4">
        {blueTeams.map((team) => (
          <div key={`field-blue-${team}`} className="rounded-lg border-2 border-blue-200/90 bg-blue-700/90 px-3 py-2 text-center font-mono text-lg font-black text-white shadow-xl shadow-black/40">
            {team}
          </div>
        ))}
      </div>
    </div>
  );
}
