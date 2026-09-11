export type PitDrivetrain = "swerve" | "tank" | "mecanum" | "other" | "unknown";
export type PitTowerLevel = "none" | "level1" | "level2" | "level3";
export type PitPreferredRole = "scorer" | "feeder" | "defender" | "flexible" | "unknown";
export type PitShootingRange = "close" | "mid" | "far" | "multiple" | "unknown";

export interface PitScoutingEntry {
  id: string;
  schemaVersion: 1;
  season: number;
  eventKey: string;
  teamNumber: number;
  scoutName: string;
  createdAt: string;
  drivetrain: PitDrivetrain;
  widthIn: number | null;
  lengthIn: number | null;
  heightIn: number | null;
  weightLbs: number | null;
  usesTrench: boolean;
  crossesBump: boolean;
  floorIntake: boolean;
  canPassFuel: boolean;
  shootsOnMove: boolean;
  shootingRange: PitShootingRange;
  fuelCapacity: number | null;
  maxTowerLevel: PitTowerLevel;
  autoCount: number;
  autoNotes: string;
  preferredRole: PitPreferredRole;
  intakeNotes: string;
  reliabilityNotes: string;
  notes: string;
  syncStatus: "local" | "synced";
}
