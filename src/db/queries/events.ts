import { Queryable } from "../types";

export type EventPoolRow = {
  id: number;
  region: string;
  location: string;
  place: string;
  event_id: string;
  event_text: string;
  weight: number;
  cooldown_seconds: number;
  created_at: Date;
  updated_at: Date;
};

export type PlaceEventRow = {
  id: number;
  region: string;
  location: string;
  place: string;
  event_id: string;
  event_text: string;
  triggered_at: Date;
  next_available: Date | null;
};

export async function seedEventPool(
  client: Queryable,
  params: {
    region: string;
    location: string;
    place: string;
    eventId: string;
    eventText: string;
    weight: number;
    cooldownSeconds: number;
  }
) {
  const { region, location, place, eventId, eventText, weight, cooldownSeconds } = params;
  await client.query(
    `INSERT INTO place_event_pool (region, location, place, event_id, event_text, weight, cooldown_seconds)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (region, location, place, event_id) DO NOTHING`,
    [region, location, place, eventId, eventText, weight, cooldownSeconds]
  );
}

export async function insertEventPool(
  client: Queryable,
  params: {
    region: string;
    location: string;
    place: string;
    eventId: string;
    eventText: string;
    weight: number;
    cooldownSeconds: number;
  }
) {
  const { region, location, place, eventId, eventText, weight, cooldownSeconds } = params;
  const { rows } = await client.query<EventPoolRow>(
    `INSERT INTO place_event_pool (region, location, place, event_id, event_text, weight, cooldown_seconds)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [region, location, place, eventId, eventText, weight, cooldownSeconds]
  );
  return rows[0];
}

export async function deleteEventPool(
  client: Queryable,
  params: { region: string; location: string; place: string; eventId: string }
) {
  const { region, location, place, eventId } = params;
  await client.query(
    `DELETE FROM place_event_pool
     WHERE region = $1 AND location = $2 AND place = $3 AND event_id = $4`,
    [region, location, place, eventId]
  );
}

export async function listEventPool(
  client: Queryable,
  params: { region: string; location: string; place: string }
) {
  const { region, location, place } = params;
  const { rows } = await client.query<EventPoolRow>(
    `SELECT * FROM place_event_pool
     WHERE region = $1 AND location = $2 AND place = $3
     ORDER BY event_id ASC`,
    [region, location, place]
  );
  return rows;
}

export async function insertPlaceEvent(
  client: Queryable,
  params: { region: string; location: string; place: string; eventId: string; eventText: string; cooldownSeconds: number }
) {
  const { region, location, place, eventId, eventText, cooldownSeconds } = params;
  const { rows } = await client.query<PlaceEventRow>(
    `INSERT INTO place_events (region, location, place, event_id, event_text, next_available)
     VALUES ($1, $2, $3, $4, $5, NOW() + ($6 || ' seconds')::interval)
     RETURNING *`,
    [region, location, place, eventId, eventText, cooldownSeconds]
  );
  return rows[0];
}

export async function listPlaceEvents(
  client: Queryable,
  params: { region: string; location: string; place: string; limit: number; cursor?: { createdAt: Date; id: number } }
) {
  const { region, location, place, limit, cursor } = params;
  if (cursor) {
    const { rows } = await client.query<PlaceEventRow>(
      `SELECT * FROM place_events
       WHERE region = $1 AND location = $2 AND place = $3
         AND (triggered_at, id) < ($4::timestamptz, $5::bigint)
       ORDER BY triggered_at DESC, id DESC
       LIMIT $6`,
      [region, location, place, cursor.createdAt.toISOString(), cursor.id, limit]
    );
    return rows;
  }

  const { rows } = await client.query<PlaceEventRow>(
    `SELECT * FROM place_events
     WHERE region = $1 AND location = $2 AND place = $3
     ORDER BY triggered_at DESC, id DESC
     LIMIT $4`,
    [region, location, place, limit]
  );
  return rows;
}

export async function getLatestEventCooldown(
  client: Queryable,
  params: { region: string; location: string; place: string; eventId: string }
) {
  const { region, location, place, eventId } = params;
  const { rows } = await client.query<{ next_available: Date | null }>(
    `SELECT next_available FROM place_events
     WHERE region = $1 AND location = $2 AND place = $3 AND event_id = $4
     ORDER BY triggered_at DESC
     LIMIT 1`,
    [region, location, place, eventId]
  );
  return rows[0]?.next_available ?? null;
}

export async function resetEventCounter(
  client: Queryable,
  params: { region: string; location: string; place: string }
) {
  const { region, location, place } = params;
  await client.query(
    `UPDATE area_counters
     SET statements_since_event = 0, updated_at = NOW()
     WHERE area_type = 'place' AND region = $1 AND location = $2 AND place = $3`,
    [region, location, place]
  );
}

export async function getEventCounter(
  client: Queryable,
  params: { region: string; location: string; place: string }
) {
  const { region, location, place } = params;
  const { rows } = await client.query<{ statements_since_event: number }>(
    `SELECT statements_since_event FROM area_counters
     WHERE area_type = 'place' AND region = $1 AND location = $2 AND place = $3
     LIMIT 1`,
    [region, location, place]
  );
  return rows[0]?.statements_since_event ?? null;
}
