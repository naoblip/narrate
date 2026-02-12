import type { Router } from "express";
import { pool } from "../db";

export function registerHealthRoutes(router: Router) {
  router.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ ok: false, error: { code: "DB_UNREACHABLE", message: "Database unreachable" } });
    }
  });
}
