import express from "express";
import type { WorldConfig } from "./config/validate";
import { registerHealthRoutes } from "./routes/health";
import { registerWorldRoutes } from "./routes/world";
import { registerAgentRoutes } from "./routes/agents";
import { registerMovementRoutes } from "./routes/movement";
import { registerQueryRoutes } from "./routes/queries";
import { registerStatementRoutes } from "./routes/statements";
import { registerSummaryRoutes } from "./routes/summaries";
import { registerAdminEventRoutes } from "./routes/adminEvents";
import { registerInventoryRoutes } from "./routes/inventory";
import { registerAdminWorldRoutes } from "./routes/adminWorld";
import fs from "node:fs";
import path from "node:path";

export function createApp(world: WorldConfig) {
  const app = express();
  applyCors(app);
  app.use(express.json({ limit: "1mb" }));

  const router = express.Router();
  router.get("/skill", (_req, res) => {
    const skillPath = path.resolve(process.cwd(), "SKILL.md");
    if (!fs.existsSync(skillPath)) {
      return res.status(404).send("SKILL.md not found");
    }
    res.type("text/markdown").send(fs.readFileSync(skillPath, "utf8"));
  });
  registerHealthRoutes(router);
  registerWorldRoutes(router, world);
  registerAgentRoutes(router, world);
  registerMovementRoutes(router, world);
  registerQueryRoutes(router);
  registerStatementRoutes(router);
  registerSummaryRoutes(router);
  registerAdminEventRoutes(router);
  registerInventoryRoutes(router, world);
  registerAdminWorldRoutes(router);

  app.use(router);

  return app;
}

function normalizeOrigin(value: string) {
  return value.replace(/\/+$/, "").toLowerCase();
}

function applyCors(app: express.Express) {
  const originValues = process.env.CORS_ORIGINS || "http://localhost:5173";
  const origins = originValues
    .split(",")
    .map((x) => normalizeOrigin(x.trim()))
    .filter(Boolean);

  app.use((req, res, next) => {
    const origin = req.header("origin");
    if (origin && origins.includes(normalizeOrigin(origin))) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    }
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    next();
  });
}
