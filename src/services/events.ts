import { randomUUID } from "node:crypto";
import { pool } from "../db";
import { tryEventLock, releaseEventLock } from "../db/advisoryLocks";
import {
  getEventCounter,
  listEventPool,
  insertPlaceEvent,
  getLatestEventCooldown,
  resetEventCounter,
} from "../db/queries/events";

export type PlaceId = { region: string; location: string; place: string };

function triggerThreshold() {
  return Number(process.env.EVENT_TRIGGER_THRESHOLD || 30);
}

function triggerChance() {
  return Number(process.env.EVENT_TRIGGER_CHANCE || 0.25);
}

export async function maybeFireEvent(place: PlaceId) {
  const client = await pool.connect();
  let locked = false;
  try {
    locked = await tryEventLock(client, place);
    if (!locked) {
      return { ok: false as const, reason: "LOCKED" };
    }

    const counter = await getEventCounter(client, place);
    if (counter === null || counter < triggerThreshold()) {
      return { ok: false as const, reason: "BELOW_THRESHOLD" };
    }

    const roll = Math.random();
    if (roll > triggerChance()) {
      await resetEventCounter(client, place);
      return { ok: false as const, reason: "ROLLED_NO_EVENT" };
    }

    const poolEvents = await listEventPool(client, place);
    if (poolEvents.length === 0) {
      await resetEventCounter(client, place);
      return { ok: false as const, reason: "NO_EVENTS" };
    }

    const available = [] as typeof poolEvents;
    for (const event of poolEvents) {
      const nextAvailable = await getLatestEventCooldown(client, {
        ...place,
        eventId: event.event_id,
      });
      if (!nextAvailable || nextAvailable.getTime() <= Date.now()) {
        available.push(event);
      }
    }

    if (available.length === 0) {
      await resetEventCounter(client, place);
      return { ok: false as const, reason: "COOLDOWN" };
    }

    const chosen = weightedPick(available.map((row) => ({ row, weight: row.weight })));
    const inserted = await insertPlaceEvent(client, {
      ...place,
      eventId: chosen.event_id,
      eventText: chosen.event_text,
      cooldownSeconds: chosen.cooldown_seconds,
    });

    await client.query(
      `INSERT INTO activity_log (id, agent_id, statement, region, location, place, shared_with, activity_type)
       VALUES ($1, 'SYSTEM', $2, $3, $4, $5, '[]', 'event')`,
      [randomUUID(), inserted.event_text, place.region, place.location, place.place]
    );

    await resetEventCounter(client, place);

    return {
      ok: true as const,
      eventId: inserted.event_id,
      eventText: inserted.event_text,
      triggeredAt: inserted.triggered_at,
    };
  } finally {
    if (locked) {
      await releaseEventLock(client, place);
    }
    client.release();
  }
}

export async function forceEvent(place: PlaceId, eventId?: string) {
  const client = await pool.connect();
  let locked = false;
  try {
    locked = await tryEventLock(client, place);
    if (!locked) {
      return { ok: false as const, reason: "LOCKED" };
    }

    const poolEvents = await listEventPool(client, place);
    if (poolEvents.length === 0) {
      return { ok: false as const, reason: "NO_EVENTS" };
    }

    const chosen = eventId
      ? poolEvents.find((row) => row.event_id === eventId)
      : weightedPick(poolEvents.map((row) => ({ row, weight: row.weight })));

    if (!chosen) {
      return { ok: false as const, reason: "NOT_FOUND" };
    }

    const inserted = await insertPlaceEvent(client, {
      ...place,
      eventId: chosen.event_id,
      eventText: chosen.event_text,
      cooldownSeconds: chosen.cooldown_seconds,
    });

    await client.query(
      `INSERT INTO activity_log (id, agent_id, statement, region, location, place, shared_with, activity_type)
       VALUES ($1, 'SYSTEM', $2, $3, $4, $5, '[]', 'event')`,
      [randomUUID(), inserted.event_text, place.region, place.location, place.place]
    );

    await resetEventCounter(client, place);

    return {
      ok: true as const,
      eventId: inserted.event_id,
      eventText: inserted.event_text,
      triggeredAt: inserted.triggered_at,
    };
  } finally {
    if (locked) {
      await releaseEventLock(client, place);
    }
    client.release();
  }
}

function weightedPick<T extends { weight: number; row?: unknown }>(items: Array<T>) {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const roll = Math.random() * total;
  let acc = 0;
  for (const item of items) {
    acc += item.weight;
    if (roll <= acc) {
      return item.row ?? item;
    }
  }
  return items[items.length - 1].row ?? items[items.length - 1];
}
