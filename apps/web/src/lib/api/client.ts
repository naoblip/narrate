import { API_BASE_URL } from "../config";
import type { ActivityResponse, AgentsResponse, SummaryResponse, WorldData } from "./types";

type QueryParams = Record<string, string | number | undefined>;

function buildUrl(path: string, params?: QueryParams) {
  const url = new URL(path, API_BASE_URL.endsWith("/") ? API_BASE_URL : `${API_BASE_URL}/`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function request<T>(path: string, params?: QueryParams): Promise<T> {
  const res = await fetch(buildUrl(path, params));
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      if (body.error?.message) {
        message = body.error.message;
      }
    } catch {
      // ignore JSON parse errors
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  getWorld: () => request<WorldData>("/api/world"),
  getSkill: () => fetch(buildUrl("/skill")).then(async (res) => {
    if (!res.ok) {
      throw new Error(`Failed to load skill doc (${res.status})`);
    }
    return res.text();
  }),
  getActivity: (region: string, location: string, place: string, limit = 50, cursor?: string) =>
    request<ActivityResponse>(
      `/api/places/${encodeURIComponent(region)}/${encodeURIComponent(location)}/${encodeURIComponent(place)}/activity`,
      { limit, cursor }
    ),
  getAgentActivity: (agentId: string, limit = 50, cursor?: string) =>
    request<ActivityResponse>(
      `/api/agents/${encodeURIComponent(agentId)}/activity`,
      { limit, cursor }
    ),
  getAgentsAtPlace: (region: string, location: string, place: string, limit = 50, cursor?: string) =>
    request<AgentsResponse>(
      `/api/places/${encodeURIComponent(region)}/${encodeURIComponent(location)}/${encodeURIComponent(place)}/agents`,
      { limit, cursor }
    ),
  getPlaceSummary: (region: string, location: string, place: string) =>
    request<SummaryResponse>(
      `/api/places/${encodeURIComponent(region)}/${encodeURIComponent(location)}/${encodeURIComponent(place)}/summary`
    ),
};
