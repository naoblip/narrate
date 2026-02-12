import type { Router } from "express";
import { pool } from "../db";
import { decodeCursor, encodeCursor } from "../utils/pagination";
import { sendError } from "../utils/errors";
import { listAgentsAtPlace } from "../db/queries/agents";
import { listActivityByAgentOrShared, listActivityByPlace } from "../db/queries/activity";
import { serializeAgent } from "../services/agents";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseLimit(limitRaw: unknown) {
  const value = typeof limitRaw === "string" ? Number(limitRaw) : DEFAULT_LIMIT;
  if (!Number.isFinite(value)) return DEFAULT_LIMIT;
  return Math.min(Math.max(value, 1), MAX_LIMIT);
}

function parseCursor(cursorRaw: unknown) {
  if (!cursorRaw || typeof cursorRaw !== "string") return undefined;
  return decodeCursor(cursorRaw);
}

function isValidAgentId(id: string) {
  return id === "SYSTEM" || UUID_V4.test(id);
}

export function registerQueryRoutes(router: Router) {
  router.get("/api/places/:region/:location/:place/agents", async (req, res) => {
    let cursor;
    try {
      cursor = parseCursor(req.query.cursor);
    } catch (err) {
      return sendError(res, 400, "CURSOR_INVALID", "Invalid cursor");
    }

    const limit = parseLimit(req.query.limit);
    const agents = await listAgentsAtPlace(pool, {
      region: req.params.region,
      location: req.params.location,
      place: req.params.place,
      limit,
      cursor,
    });

    const serialized = agents.map((agent) => serializeAgent(agent));
    const last = serialized[serialized.length - 1];
    const nextCursor = serialized.length === limit && last
      ? encodeCursor(new Date(last.created_at), last.id)
      : undefined;

    return res.json({ agents: serialized, next_cursor: nextCursor });
  });

  router.get("/api/places/:region/:location/:place/activity", async (req, res) => {
    let cursor;
    try {
      cursor = parseCursor(req.query.cursor);
    } catch (err) {
      return sendError(res, 400, "CURSOR_INVALID", "Invalid cursor");
    }

    const limit = parseLimit(req.query.limit);
    const activityRows = await listActivityByPlace(pool, {
      region: req.params.region,
      location: req.params.location,
      place: req.params.place,
      limit,
      cursor,
    });

    const activity = serializeActivityRows(activityRows);

    const last = activity[activity.length - 1];
    const nextCursor = activity.length === limit && last
      ? encodeCursor(new Date(last.created_at), last.id)
      : undefined;

    return res.json({ activity, next_cursor: nextCursor });
  });

  router.get("/api/agents/:id/activity", async (req, res) => {
    let cursor;
    try {
      cursor = parseCursor(req.query.cursor);
    } catch (err) {
      return sendError(res, 400, "CURSOR_INVALID", "Invalid cursor");
    }

    const agentId = req.params.id;
    if (!isValidAgentId(agentId)) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid agent id");
    }

    const limit = parseLimit(req.query.limit);
    const activityRows = await listActivityByAgentOrShared(pool, {
      agentId,
      limit,
      cursor,
    });

    const activity = serializeActivityRows(activityRows);
    const last = activity[activity.length - 1];
    const nextCursor = activity.length === limit && last
      ? encodeCursor(new Date(last.created_at), last.id)
      : undefined;

    return res.json({ activity, next_cursor: nextCursor });
  });
}

function safeJsonArray(raw: string): unknown[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function serializeActivityRows(activityRows: Array<{
  id: string;
  agent_id: string;
  agent_name: string | null;
  statement: string;
  created_at: Date;
  region: string;
  location: string;
  place: string;
  shared_with: unknown;
  activity_type: "dialogue" | "movement" | "event";
}>) {
  return activityRows.map((row) => ({
    id: row.id,
    agent_id: row.agent_id,
    agent_name: row.agent_name,
    statement: row.statement,
    created_at: row.created_at.toISOString(),
    region: row.region,
    location: row.location,
    place: row.place,
    shared_with: Array.isArray(row.shared_with)
      ? row.shared_with
      : typeof row.shared_with === "string"
        ? safeJsonArray(row.shared_with)
        : [],
    activity_type: row.activity_type,
    is_event: row.activity_type === "event",
  }));
}
