import type { Router } from "express";
import { pool } from "../db";
import { requireAdmin } from "../middleware/authAdmin";
import { sendError } from "../utils/errors";
import { parsePlaceId } from "../utils/placeId";
import {
  insertEventPool,
  deleteEventPool,
  listEventPool,
  listPlaceEvents,
} from "../db/queries/events";
import { forceEvent } from "../services/events";
import { decodeCursor, encodeCursor } from "../utils/pagination";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function registerAdminEventRoutes(router: Router) {
  router.post("/api/admin/events", requireAdmin, async (req, res) => {
    const { place_id, event } = req.body ?? {};
    if (!place_id || typeof place_id !== "string") {
      return sendError(res, 400, "VALIDATION_ERROR", "place_id is required");
    }
    if (!event || typeof event !== "object") {
      return sendError(res, 400, "VALIDATION_ERROR", "event is required");
    }
    const { id, text, weight, cooldown } = event as Record<string, unknown>;
    if (typeof id !== "string" || typeof text !== "string" || typeof weight !== "number" || typeof cooldown !== "number") {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid event payload");
    }

    const place = parsePlaceId(place_id);
    const row = await insertEventPool(pool, {
      region: place.region,
      location: place.location,
      place: place.place,
      eventId: id,
      eventText: text,
      weight,
      cooldownSeconds: cooldown,
    });

    res.status(201).json({ event_id: row.event_id });
  });

  router.delete("/api/admin/events/:place_id/:event_id", requireAdmin, async (req, res) => {
    const place = parsePlaceId(req.params.place_id);
    await deleteEventPool(pool, {
      region: place.region,
      location: place.location,
      place: place.place,
      eventId: req.params.event_id,
    });
    res.json({ ok: true });
  });

  router.post("/api/admin/events/trigger", requireAdmin, async (req, res) => {
    const { place_id, event_id } = req.body ?? {};
    if (!place_id || typeof place_id !== "string") {
      return sendError(res, 400, "VALIDATION_ERROR", "place_id is required");
    }

    const place = parsePlaceId(place_id);
    const result = await forceEvent(place, typeof event_id === "string" ? event_id : undefined);
    if (!result.ok) {
      return sendError(res, 409, "EVENT_NOT_TRIGGERED", result.reason);
    }
    res.json({ event_id: result.eventId, event_text: result.eventText, triggered_at: result.triggeredAt.toISOString() });
  });

  router.get("/api/admin/events/:place_id", requireAdmin, async (req, res) => {
    const place = parsePlaceId(req.params.place_id);
    const limitRaw = req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT) : DEFAULT_LIMIT;
    let cursor;
    if (req.query.cursor && typeof req.query.cursor === "string") {
      try {
        const decoded = decodeCursor(req.query.cursor);
        cursor = { createdAt: decoded.createdAt, id: Number(decoded.id) };
      } catch {
        return sendError(res, 400, "CURSOR_INVALID", "Invalid cursor");
      }
    }

    const events = await listPlaceEvents(pool, {
      region: place.region,
      location: place.location,
      place: place.place,
      limit,
      cursor,
    });

    const mapped = events.map((row) => ({
      event_id: row.event_id,
      event_text: row.event_text,
      triggered_at: row.triggered_at.toISOString(),
    }));

    const last = events[events.length - 1];
    const nextCursor = events.length === limit && last
      ? encodeCursor(last.triggered_at, String(last.id))
      : undefined;

    res.json({ events: mapped, next_cursor: nextCursor });
  });

  router.get("/api/admin/events/:place_id/pool", requireAdmin, async (req, res) => {
    const place = parsePlaceId(req.params.place_id);
    const events = await listEventPool(pool, {
      region: place.region,
      location: place.location,
      place: place.place,
    });

    res.json({ events: events.map((row) => ({
      event_id: row.event_id,
      event_text: row.event_text,
      weight: row.weight,
      cooldown: row.cooldown_seconds,
    })) });
  });
}
