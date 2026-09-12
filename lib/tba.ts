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

async function tbaFetch<T>(path: string, revalidate = 60): Promise<T> {
  const response = await fetch(`${TBA_BASE_URL}${path}`, {
    headers: { "X-TBA-Auth-Key": getAuthKey() },
    next: { revalidate },
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
  return tbaFetch<TbaRankings | null>(`/event/${encodeURIComponent(eventKey)}/rankings`);
}

export function getEventMatches(eventKey: string) {
  return tbaFetch<TbaMatch[]>(`/event/${encodeURIComponent(eventKey)}/matches/simple`);
}

export function getEventOprs(eventKey: string) {
  return tbaFetch<TbaOprs | null>(`/event/${encodeURIComponent(eventKey)}/oprs`, 300);
}

export function getEventsForYear(year: number) {
  return tbaFetch<TbaEvent[]>(`/events/${year}/simple`, 3600);
}

export function getTeamsForYearPage(page: number, year: number) {
  return tbaFetch<TbaTeam[]>(`/teams/${page}/${year}`, 3600);
}
