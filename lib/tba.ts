import type {
  TbaEvent,
  TbaMatch,
  TbaOprs,
  TbaRankings,
  TbaTeam,
} from "@/types/frc";

const TBA_BASE_URL = process.env.TBA_BASE_URL ?? "https://www.thebluealliance.com/api/v3";

function getAuthKey() {
  const key = process.env.TBA_AUTH_KEY;
  if (!key) throw new Error("Missing TBA_AUTH_KEY. Copy .env.example to .env.local and add your The Blue Alliance API key.");
  return key;
}

async function tbaFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${TBA_BASE_URL}${path}`, {
    headers: { "X-TBA-Auth-Key": getAuthKey() },
    next: { revalidate: 60 },
  });
  if (!response.ok) throw new Error(`TBA request failed (${response.status} ${response.statusText}).`);
  return response.json() as Promise<T>;
}

export function getEvent(eventKey: string) {
  return tbaFetch<TbaEvent>(`/event/${encodeURIComponent(eventKey)}`);
}

export function getEventTeams(eventKey: string) {
  return tbaFetch<TbaTeam[]>(`/event/${encodeURIComponent(eventKey)}/teams`);
}

export function getEventRankings(eventKey: string) {
  return tbaFetch<TbaRankings>(`/event/${encodeURIComponent(eventKey)}/rankings`);
}

export function getEventMatches(eventKey: string) {
  return tbaFetch<TbaMatch[]>(`/event/${encodeURIComponent(eventKey)}/matches/simple`);
}

export function getEventOprs(eventKey: string) {
  return tbaFetch<TbaOprs>(`/event/${encodeURIComponent(eventKey)}/oprs`);
}
