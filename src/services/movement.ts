import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import type { WorldConfig } from "../config/validate";
import { getAgentById } from "../db/queries/agents";

export type MoveInput = {
  region?: unknown;
  location?: unknown;
  place?: unknown;
};

export function validateMoveInput(input: MoveInput) {
  const errors: Array<{ field: string; issue: string }> = [];
  const region = typeof input.region === "string" ? input.region : "";
  const location = typeof input.location === "string" ? input.location : "";
  const place = typeof input.place === "string" ? input.place : "";

  if (!region) errors.push({ field: "region", issue: "Region is required" });
  if (!location) errors.push({ field: "location", issue: "Location is required" });
  if (!place) errors.push({ field: "place", issue: "Place is required" });

  return { errors, region, location, place };
}

export function findPlace(world: WorldConfig, regionName: string, locationName: string, placeName: string) {
  const region = world.regions.find((r) => r.name === regionName);
  if (!region) return null;
  const location = region.locations.find((l) => l.name === locationName);
  if (!location) return null;
  const place = location.places.find((p) => p.name === placeName);
  if (!place) return null;
  return { region, location, place };
}

export function canMoveBetweenRegions(world: WorldConfig, fromRegion: string, toRegion: string) {
  if (fromRegion === toRegion) return true;
  const region = world.regions.find((r) => r.name === fromRegion);
  if (!region) return false;
  const connected = new Set(region.connected_to ?? []);
  if (connected.has(toRegion)) {
    return true;
  }
  const reverse = world.regions.find((r) => r.name === toRegion);
  return reverse ? (reverse.connected_to ?? []).includes(fromRegion) : false;
}

export async function moveAgent(client: PoolClient, world: WorldConfig, agentId: string, input: MoveInput) {
  const { errors, region, location, place } = validateMoveInput(input);
  if (errors.length > 0) {
    return { ok: false as const, errors };
  }

  const target = findPlace(world, region, location, place);
  if (!target) {
    return { ok: false as const, errors: [{ field: "place", issue: "Unknown destination" }] };
  }

  const current = await getAgentById(client, agentId);
  if (!current || current.id === "SYSTEM") {
    return { ok: false as const, errors: [{ field: "agent", issue: "Agent not found" }] };
  }

  const sameRegion = current.region === region;
  if (!sameRegion && !canMoveBetweenRegions(world, current.region, region)) {
    return {
      ok: false as const,
      errors: [{ field: "region", issue: "Target region is not adjacent" }],
    };
  }

  await client.query(
    "UPDATE characters SET region = $1, location = $2, place = $3 WHERE id = $4",
    [region, location, place, agentId]
  );

  const crossedLocation = current.location !== location || current.region !== region;
  if (crossedLocation) {
    await client.query(
      `INSERT INTO activity_log (id, agent_id, statement, region, location, place, shared_with, activity_type)
       VALUES ($1, $2, $3, $4, $5, $6, '[]', 'movement')`,
      [
        randomUUID(),
        agentId,
        `${current.name} moved to ${place}.`,
        region,
        location,
        place,
      ]
    );
  }

  return { ok: true as const, position: { region, location, place } };
}
