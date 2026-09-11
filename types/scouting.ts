export type EndgameResult = "none" | "attempted" | "successful";
export type DefenseLevel = "none" | "light" | "heavy";

export interface MatchScoutingEntry {
  id: string;
  schemaVersion: 1;
  eventKey: string;
  matchNumber: number;
  teamNumber: number;
  scoutName: string;
  createdAt: string;
  auto: {
    attempts: number;
    scored: number;
  };
  teleop: {
    attempts: number;
    scored: number;
    averageCycleSeconds: number | null;
  };
  endgame: EndgameResult;
  defense: DefenseLevel;
  penalties: number;
  disabled: boolean;
  tipped: boolean;
  mechanicalIssue: boolean;
  notes: string;
  syncStatus: "local" | "synced";
}

export type MatchScoutingDraft = Omit<MatchScoutingEntry, "id" | "schemaVersion" | "createdAt" | "syncStatus">;
