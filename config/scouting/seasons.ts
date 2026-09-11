export type GameFieldType = "counter" | "number" | "toggle" | "select";

export interface GameFieldOption {
  value: string;
  label: string;
}

export interface GameField {
  key: string;
  label: string;
  phase: "auto" | "teleop" | "endgame";
  type: GameFieldType;
  help?: string;
  options?: GameFieldOption[];
  min?: number;
  max?: number;
  step?: number;
}

export interface SeasonScoutingConfig {
  year: number;
  gameKey: string;
  gameName: string;
  description: string;
  fields: GameField[];
}

export const scoutingSeasons: SeasonScoutingConfig[] = [
  {
    year: 2026,
    gameKey: "rebuilt",
    gameName: "REBUILT",
    description: "Fuel production, passing, field traversal, guarding, driver quality, and tower performance.",
    fields: [
      {
        key: "autoStartLocation",
        label: "Starting location",
        phase: "auto",
        type: "select",
        help: "Alliance-relative starting position.",
        options: [
          { value: "under-left-trench", label: "Under left trench" },
          { value: "left-bump", label: "Left bump" },
          { value: "hub", label: "Hub" },
          { value: "right-bump", label: "Right bump" },
          { value: "under-right-trench", label: "Under right trench" },
        ],
      },
      { key: "autoFuelScoredEstimate", label: "Fuel scored", phase: "auto", type: "counter", help: "Best estimate of fuel contributed to the active hub." },
      { key: "autoTower", label: "Auto tower", phase: "auto", type: "select", options: [{ value: "none", label: "None" }, { value: "level1", label: "Level 1" }] },
      { key: "teleopFuelScoredEstimate", label: "Fuel scored", phase: "teleop", type: "counter" },
      { key: "teleopFuelPassed", label: "Fuel passed", phase: "teleop", type: "counter" },
      { key: "teleopFieldGoalPercent", label: "Rough FG%", phase: "teleop", type: "number", min: 0, max: 100, step: 5, help: "Scout estimate from 0–100%." },
      { key: "usesTrench", label: "Uses trench", phase: "teleop", type: "toggle" },
      { key: "crossesBump", label: "Crosses bump", phase: "teleop", type: "toggle" },
      { key: "towerLevel", label: "Tower finish", phase: "endgame", type: "select", options: [{ value: "none", label: "None" }, { value: "level1", label: "Level 1" }, { value: "level2", label: "Level 2" }, { value: "level3", label: "Level 3" }] },
    ],
  },
  {
    year: 2025,
    gameKey: "reefscape",
    gameName: "REEFSCAPE",
    description: "Coral by reef level, algae scoring, and barge endgame.",
    fields: [
      { key: "autoLeave", label: "Leaves starting zone", phase: "auto", type: "toggle" },
      { key: "autoCoralL1", label: "Coral L1", phase: "auto", type: "counter" },
      { key: "autoCoralL2", label: "Coral L2", phase: "auto", type: "counter" },
      { key: "autoCoralL3", label: "Coral L3", phase: "auto", type: "counter" },
      { key: "autoCoralL4", label: "Coral L4", phase: "auto", type: "counter" },
      { key: "teleopCoralL1", label: "Coral L1", phase: "teleop", type: "counter" },
      { key: "teleopCoralL2", label: "Coral L2", phase: "teleop", type: "counter" },
      { key: "teleopCoralL3", label: "Coral L3", phase: "teleop", type: "counter" },
      { key: "teleopCoralL4", label: "Coral L4", phase: "teleop", type: "counter" },
      { key: "algaeProcessor", label: "Algae → processor", phase: "teleop", type: "counter" },
      { key: "algaeNet", label: "Algae → net", phase: "teleop", type: "counter" },
      { key: "bargeFinish", label: "Barge finish", phase: "endgame", type: "select", options: [{ value: "none", label: "None" }, { value: "park", label: "Park" }, { value: "shallow", label: "Shallow cage" }, { value: "deep", label: "Deep cage" }] },
    ],
  },
  {
    year: 2023,
    gameKey: "charged-up",
    gameName: "CHARGED UP",
    description: "Cone/cube grid production and charge-station performance.",
    fields: [
      { key: "autoMobility", label: "Mobility", phase: "auto", type: "toggle" },
      { key: "autoConesHigh", label: "Cones high", phase: "auto", type: "counter" },
      { key: "autoConesMid", label: "Cones mid", phase: "auto", type: "counter" },
      { key: "autoCubesHigh", label: "Cubes high", phase: "auto", type: "counter" },
      { key: "autoCubesMid", label: "Cubes mid", phase: "auto", type: "counter" },
      { key: "autoLow", label: "Low nodes", phase: "auto", type: "counter" },
      { key: "autoCharge", label: "Auto charge station", phase: "auto", type: "select", options: [{ value: "none", label: "None" }, { value: "dock", label: "Docked" }, { value: "engage", label: "Engaged" }] },
      { key: "teleopConesHigh", label: "Cones high", phase: "teleop", type: "counter" },
      { key: "teleopConesMid", label: "Cones mid", phase: "teleop", type: "counter" },
      { key: "teleopCubesHigh", label: "Cubes high", phase: "teleop", type: "counter" },
      { key: "teleopCubesMid", label: "Cubes mid", phase: "teleop", type: "counter" },
      { key: "teleopLow", label: "Low nodes", phase: "teleop", type: "counter" },
      { key: "chargeFinish", label: "Charge station finish", phase: "endgame", type: "select", options: [{ value: "none", label: "None" }, { value: "park", label: "Park" }, { value: "dock", label: "Docked" }, { value: "engage", label: "Engaged" }] },
    ],
  },
];

export function getScoutingSeason(year: number) {
  return scoutingSeasons.find((season) => season.year === year) ?? scoutingSeasons[0];
}

export function inferSeasonFromEventKey(eventKey: string) {
  const match = eventKey.trim().match(/^(20\d{2})/);
  return match ? Number(match[1]) : null;
}
