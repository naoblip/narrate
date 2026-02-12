import type { Router } from "express";
import { requireAgent } from "../middleware/authAgent";
import { statementCooldown } from "../middleware/rateLimit";
import { withTransaction } from "../db";
import { createStatement } from "../services/statements";
import { queueSummaryChecks } from "../services/summarization";
import { maybeFireEvent } from "../services/events";
import { sendError } from "../utils/errors";

export function registerStatementRoutes(router: Router) {
  router.post("/api/agents/:id/statements", requireAgent, statementCooldown, async (req, res) => {
    const agentId = (req as typeof req & { agentId: string }).agentId;
    if (agentId !== req.params.id) {
      return sendError(res, 403, "AUTH_FORBIDDEN", "Cannot post for another agent");
    }

    const result = await withTransaction(async (client) => createStatement(client, agentId, req.body ?? {}));
    if (!result.ok) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid statement", result.errors);
    }

    queueSummaryChecks(result.position.region, result.position.location, result.position.place);
    setImmediate(() => {
      maybeFireEvent(result.position).catch(() => undefined);
    });
    return res.status(201).json({ statement_id: result.statementId });
  });
}
