import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { createApp } from "./app";
import { validateWorldConfig } from "./config/validate";
import { pool, withTransaction } from "./db";
import { runMigrations, ensureWorldMeta } from "./db/migrations";
import { initializeCounters } from "./db/world";
import { acquireWorldLock } from "./db/advisoryLocks";
import { startSummaryCleanupCron } from "./services/summarization";
import { seedEventsFromWorld } from "./services/eventSeeding";

const worldPath = process.env.NARRATE_WORLD || process.argv[2] || "world.json";
const resolvedPath = path.resolve(process.cwd(), worldPath);

if (!fs.existsSync(resolvedPath)) {
  console.error(`World file not found: ${resolvedPath}`);
  process.exit(1);
}

const raw = fs.readFileSync(resolvedPath, "utf8");
const parsed = JSON.parse(raw);
const { ok, issues, value } = validateWorldConfig(parsed);

if (!ok || !value) {
  console.error("World config validation failed:");
  for (const issue of issues) {
    console.error(`- ${issue.field}: ${issue.issue}`);
  }
  process.exit(1);
}

const worldHash = createHash("sha256").update(raw).digest("hex");

async function boot() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  await withTransaction(async (client) => {
    await runMigrations(client);
    const meta = await ensureWorldMeta(client, worldHash);
    if (!meta.matched) {
      throw new Error("WORLD_HASH_MISMATCH");
    }
    await initializeCounters(client, value);
  });

  await seedEventsFromWorld(value);

  const lockClient = await pool.connect();
  const locked = await acquireWorldLock(lockClient, worldHash);
  if (!locked) {
    lockClient.release();
    throw new Error("WORLD_LOCKED");
  }

  const port = Number(process.env.PORT || 3000);
  const app = createApp(value);

  app.listen(port, () => {
    console.log(`Narrate server listening on :${port}`);
  });

  startSummaryCleanupCron();
}

boot().catch((err) => {
  if (err instanceof Error && err.message === "WORLD_HASH_MISMATCH") {
    console.error("World config hash mismatch. Run narrate world:reseed once available.");
  } else if (err instanceof Error && err.message === "WORLD_LOCKED") {
    console.error("Another Narrate instance is running for this world.");
  } else {
    console.error("Failed to start server", err);
  }
  process.exit(1);
});
