import type { Router } from "express";
import { WorldConfig } from "../config/validate";
import { requireAgent } from "../middleware/authAgent";
import { withTransaction } from "../db";
import { moveAgent } from "../services/movement";
import { sendError } from "../utils/errors";

export function registerMovementRoutes(router: Router, world: WorldConfig) {
  router.post("/api/agents/:id/move", requireAgent, async (req, res) => {
    const agentId = (req as typeof req & { agentId: string }).agentId;
    if (agentId !== req.params.id) {
      return sendError(res, 403, "AUTH_FORBIDDEN", "Cannot move another agent");
    }

    const result = await withTransaction(async (client) => moveAgent(client, world, agentId, req.body ?? {}));
    if (!result.ok) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid move request", result.errors);
    }

    return res.json({ ok: true, position: result.position });
  });
}
