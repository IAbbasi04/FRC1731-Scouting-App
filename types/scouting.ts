export type EndgameResult = "none" | "attempted" | "successful";
export type DefenseLevel = "none" | "light" | "heavy";
export type ScoutingValue = string | number | boolean | null;
export type AllianceColor = "red" | "blue";

export interface FieldPoint {
  x: number;
  y: number;
}

export interface MatchScoutingEntry {
  id: string;
  schemaVersion: 2;
  season: number;
  gameKey: string;
  eventKey: string;
  matchNumber: number;
  teamNumber: number;
  scoutName: string;
  createdAt: string;
  alliance?: AllianceColor;
  autoStart?: FieldPoint;
  gameData: Record<string, ScoutingValue>;
  defense: DefenseLevel;
  driverRating?: number;
  playedDefense?: boolean;
  defenseRating?: number;
  penalties: number;
  disabled: boolean;
  tipped: boolean;
  mechanicalIssue: boolean;
  notes: string;
  syncStatus: "local" | "synced";
  source: "manual" | "ai-video";
}

export interface LegacyMatchScoutingEntryV1 {
  id: string;
  schemaVersion: 1;
  eventKey: string;
  matchNumber: number;
  teamNumber: number;
  scoutName: string;
  createdAt: string;
  auto: { attempts: number; scored: number };
  teleop: { attempts: number; scored: number; averageCycleSeconds: number | null };
  endgame: "none" | "attempted" | "successful";
  defense: DefenseLevel;
  penalties: number;
  disabled: boolean;
  tipped: boolean;
  mechanicalIssue: boolean;
  notes: string;
  syncStatus: "local" | "synced";
}

export type StoredScoutingEntry = MatchScoutingEntry | LegacyMatchScoutingEntryV1;
export type MatchScoutingDraft = Omit<MatchScoutingEntry, "id" | "schemaVersion" | "createdAt" | "syncStatus" | "source">;
