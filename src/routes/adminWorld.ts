import type { Router } from "express";
import { requireAdmin } from "../middleware/authAdmin";
import { validateWorldConfig } from "../config/validate";
import { sendError } from "../utils/errors";

export function registerAdminWorldRoutes(router: Router) {
  router.post("/api/admin/worlds/validate", requireAdmin, async (req, res) => {
    const { ok, issues } = validateWorldConfig(req.body);
    if (!ok) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid world config", issues);
    }
    return res.json({ ok: true });
  });
}
