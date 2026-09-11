import type { StatboticsTeamEvent } from "@/types/frc";

const STATBOTICS_BASE_URL = process.env.STATBOTICS_BASE_URL ?? "https://api.statbotics.io/v3";

export async function statboticsFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${STATBOTICS_BASE_URL}${path}`, { next: { revalidate: 60 } });
  if (!response.ok) throw new Error(`Statbotics request failed (${response.status} ${response.statusText}).`);
  return response.json() as Promise<T>;
}

export function getStatboticsTeamEvent(teamNumber: number, eventKey: string) {
  return statboticsFetch<StatboticsTeamEvent>(
    `/team_event/${teamNumber}/${encodeURIComponent(eventKey)}`,
  );
}
