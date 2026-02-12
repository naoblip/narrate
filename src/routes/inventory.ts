import type { Router } from "express";
import { WorldConfig } from "../config/validate";
import { requireAgent } from "../middleware/authAgent";
import { withTransaction } from "../db";
import { equipItem, equipItems, unequipItem } from "../services/inventory";
import { sendError } from "../utils/errors";

export function registerInventoryRoutes(router: Router, world: WorldConfig) {
  router.post("/api/agents/:id/equip", requireAgent, async (req, res) => {
    const agentId = (req as typeof req & { agentId: string }).agentId;
    if (agentId !== req.params.id) {
      return sendError(res, 403, "AUTH_FORBIDDEN", "Cannot equip for another agent");
    }

    const { slot, item } = req.body ?? {};
    const result = await withTransaction((client) => equipItem(client, world, agentId, slot, item));
    if (!result.ok) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid equip request", result.errors);
    }

    return res.json({ inventory: result.inventory });
  });

  router.post("/api/agents/:id/equip-bulk", requireAgent, async (req, res) => {
    const agentId = (req as typeof req & { agentId: string }).agentId;
    if (agentId !== req.params.id) {
      return sendError(res, 403, "AUTH_FORBIDDEN", "Cannot equip for another agent");
    }

    const result = await withTransaction((client) => equipItems(client, world, agentId, req.body?.items));
    if (!result.ok) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid equip request", result.errors);
    }

    return res.json({ inventory: result.inventory });
  });

  router.delete("/api/agents/:id/equip/:slot", requireAgent, async (req, res) => {
    const agentId = (req as typeof req & { agentId: string }).agentId;
    if (agentId !== req.params.id) {
      return sendError(res, 403, "AUTH_FORBIDDEN", "Cannot unequip for another agent");
    }

    const result = await withTransaction((client) => unequipItem(client, world, agentId, req.params.slot));
    if (!result.ok) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid unequip request", result.errors);
    }

    return res.json({ inventory: result.inventory });
  });
}
