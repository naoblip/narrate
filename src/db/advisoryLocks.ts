import { createHash } from "node:crypto";
import { PoolClient } from "pg";

function hashToInt32Pair(input: string): [number, number] {
  const digest = createHash("sha256").update(input).digest();
  const partA = digest.readInt32BE(0);
  const partB = digest.readInt32BE(4);
  return [partA, partB];
}

export async function acquireWorldLock(client: PoolClient, worldHash: string): Promise<boolean> {
  const [key1, key2] = hashToInt32Pair(worldHash);
  const { rows } = await client.query<{ locked: boolean }>(
    "SELECT pg_try_advisory_lock($1, $2) as locked",
    [key1, key2]
  );
  return rows[0]?.locked ?? false;
}

function areaKey(areaType: string, region: string, location?: string | null, place?: string | null) {
  return `${areaType}:${region}:${location ?? ""}:${place ?? ""}`;
}

export async function trySummaryLock(
  client: PoolClient,
  params: { areaType: "region" | "location" | "place"; region: string; location?: string | null; place?: string | null }
) {
  const [key1, key2] = hashToInt32Pair(`summary:${areaKey(params.areaType, params.region, params.location, params.place)}`);
  const { rows } = await client.query<{ locked: boolean }>(
    "SELECT pg_try_advisory_lock($1, $2) as locked",
    [key1, key2]
  );
  return rows[0]?.locked ?? false;
}

export async function releaseSummaryLock(
  client: PoolClient,
  params: { areaType: "region" | "location" | "place"; region: string; location?: string | null; place?: string | null }
) {
  const [key1, key2] = hashToInt32Pair(`summary:${areaKey(params.areaType, params.region, params.location, params.place)}`);
  await client.query("SELECT pg_advisory_unlock($1, $2)", [key1, key2]);
}

export async function tryEventLock(
  client: PoolClient,
  params: { region: string; location: string; place: string }
) {
  const [key1, key2] = hashToInt32Pair(`event:${params.region}:${params.location}:${params.place}`);
  const { rows } = await client.query<{ locked: boolean }>(
    "SELECT pg_try_advisory_lock($1, $2) as locked",
    [key1, key2]
  );
  return rows[0]?.locked ?? false;
}

export async function releaseEventLock(
  client: PoolClient,
  params: { region: string; location: string; place: string }
) {
  const [key1, key2] = hashToInt32Pair(`event:${params.region}:${params.location}:${params.place}`);
  await client.query("SELECT pg_advisory_unlock($1, $2)", [key1, key2]);
}
