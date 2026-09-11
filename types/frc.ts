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

export interface TeamMetricSnapshot {
  teamNumber: number;
  eventKey: string;
  source: "tba" | "statbotics" | "ace" | "1731";
  metric: string;
  value: number;
  capturedAt: string;
}
