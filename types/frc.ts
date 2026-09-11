export interface TbaTeam {
  key: string;
  team_number: number;
  nickname: string | null;
  name: string;
  city: string | null;
  state_prov: string | null;
  country: string | null;
  rookie_year: number | null;
}

export interface TbaEvent {
  key: string;
  name: string;
  event_code: string;
  event_type: number;
  district: { abbreviation: string; display_name: string; key: string; year: number } | null;
  city: string | null;
  state_prov: string | null;
  country: string | null;
  start_date: string;
  end_date: string;
  year: number;
}

export interface TbaRecord {
  wins: number;
  losses: number;
  ties: number;
}

export interface TbaRanking {
  rank: number;
  team_key: string;
  record: TbaRecord | null;
  dq: number;
  matches_played: number;
  qual_average: number | null;
  sort_orders: number[];
}

export interface TbaRankings {
  rankings: TbaRanking[] | null;
  sort_order_info: Array<{ name: string; precision: number }>;
  extra_stats_info: Array<{ name: string; precision: number }>;
}

export interface TbaAllianceSimple {
  score: number;
  team_keys: string[];
  surrogate_team_keys: string[];
  dq_team_keys: string[];
}

export interface TbaMatch {
  key: string;
  comp_level: "qm" | "ef" | "qf" | "sf" | "f";
  set_number: number;
  match_number: number;
  alliances: {
    red: TbaAllianceSimple;
    blue: TbaAllianceSimple;
  };
  winning_alliance: "red" | "blue" | "";
  event_key: string;
  time: number | null;
  predicted_time: number | null;
  actual_time: number | null;
}

export interface TbaOprs {
  oprs: Record<string, number> | null;
  dprs: Record<string, number> | null;
  ccwms: Record<string, number> | null;
}

export interface StatboticsTeamEvent {
  team: number;
  year: number;
  event: string;
  team_name: string;
  event_name: string;
  status: string;
  epa: {
    total_points: { mean: number; sd: number };
    breakdown: {
      total_points?: number;
      auto_points?: number;
      teleop_points?: number;
      endgame_points?: number;
      [key: string]: number | undefined;
    };
  };
}

export interface EventDashboardTeam {
  teamNumber: number;
  teamKey: string;
  nickname: string;
  city: string | null;
  stateProv: string | null;
  rank: number | null;
  record: TbaRecord | null;
  opr: number | null;
  dpr: number | null;
  ccwm: number | null;
  epa: number | null;
  epaAuto: number | null;
  epaTeleop: number | null;
  epaEndgame: number | null;
}

export interface EventDashboard {
  event: TbaEvent;
  teams: EventDashboardTeam[];
  rankings: TbaRanking[];
  matches: TbaMatch[];
}

export interface TeamMetricSnapshot {
  teamNumber: number;
  eventKey: string;
  source: "tba" | "statbotics" | "ace" | "1731";
  metric: string;
  value: number;
  capturedAt: string;
}
