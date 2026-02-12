import type { Router } from "express";
import { pool, withTransaction } from "../db";
import { WorldConfig } from "../config/validate";
import { requireAgent } from "../middleware/authAgent";
import { requireAdmin } from "../middleware/authAdmin";
import {
  createAgent,
  getAgent,
  listAgentsPaged,
  rotateApiKey,
} from "../services/agents";
import { decodeCursor, encodeCursor } from "../utils/pagination";
import { sendError } from "../utils/errors";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function registerAgentRoutes(router: Router, world: WorldConfig) {
  router.post("/api/agents", async (req, res) => {
    try {
      const result = await withTransaction(async (client) => createAgent(client, world, req.body));
      if (!result.ok) {
        return sendError(res, 400, "VALIDATION_ERROR", "Invalid agent payload", result.errors);
      }
      return res.status(201).json({ agent: result.agent, api_key: result.apiKey });
    } catch (err: any) {
      if (err?.code === "23505") {
        return sendError(res, 409, "NAME_TAKEN", "Agent name is already taken");
      }
      return sendError(res, 500, "AGENT_CREATE_FAILED", "Failed to create agent");
    }
  });

  router.get("/api/agents/:id", requireAgent, async (req, res) => {
    const agentId = (req as typeof req & { agentId: string }).agentId;
    if (agentId !== req.params.id) {
      return sendError(res, 403, "AUTH_FORBIDDEN", "Cannot access another agent");
    }
    const agent = await getAgent(pool, agentId);
    if (!agent) {
      return sendError(res, 404, "NOT_FOUND", "Agent not found");
    }
    return res.json({ agent });
  });

  router.get("/api/agents", requireAdmin, async (req, res) => {
    const limitRaw = req.query.limit ? Number(req.query.limit) : DEFAULT_LIMIT;
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), MAX_LIMIT) : DEFAULT_LIMIT;
    let cursor;
    if (req.query.cursor && typeof req.query.cursor === "string") {
      try {
        cursor = decodeCursor(req.query.cursor);
      } catch (err) {
        return sendError(res, 400, "CURSOR_INVALID", "Invalid cursor");
      }
    }

    const agents = await listAgentsPaged(pool, limit, cursor);
    const last = agents[agents.length - 1];
    const nextCursor =
      agents.length === limit && last ? encodeCursor(new Date(last.created_at), last.id) : undefined;

    return res.json({ agents, next_cursor: nextCursor });
  });

  router.post("/api/agents/:id/keys/rotate", requireAgent, async (req, res) => {
    const agentId = (req as typeof req & { agentId: string }).agentId;
    if (agentId !== req.params.id) {
      return sendError(res, 403, "AUTH_FORBIDDEN", "Cannot rotate another agent key");
    }
    try {
      const apiKey = await withTransaction(async (client) => rotateApiKey(client, agentId));
      return res.json({ api_key: apiKey });
    } catch (err) {
      return sendError(res, 500, "KEY_ROTATION_FAILED", "Failed to rotate API key");
    }
  });

  router.post("/api/admin/agents/:id/keys/rotate", requireAdmin, async (req, res) => {
    const existing = await getAgent(pool, req.params.id);
    if (!existing) {
      return sendError(res, 404, "NOT_FOUND", "Agent not found");
    }
    try {
      const apiKey = await withTransaction(async (client) => rotateApiKey(client, req.params.id));
      return res.json({ api_key: apiKey });
    } catch (err) {
      return sendError(res, 500, "KEY_ROTATION_FAILED", "Failed to rotate API key");
    }
  });
}
