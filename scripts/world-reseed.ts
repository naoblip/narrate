import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pool, withTransaction } from "../src/db";
import { validateWorldConfig } from "../src/config/validate";
import { seedEventsFromWorld } from "../src/services/eventSeeding";
import { initializeCounters } from "../src/db/world";
import { ensureWorldMeta } from "../src/db/migrations";
import { diffWorlds } from "../src/utils/worldDiff";

function loadWorld(worldPath: string) {
  const raw = fs.readFileSync(worldPath, "utf8");
  const parsed = JSON.parse(raw);
  const { ok, issues, value } = validateWorldConfig(parsed);
  if (!ok || !value) {
    throw new Error(`Invalid world: ${issues.map((i) => i.issue).join("; ")}`);
  }
  return { world: value, hash: createHash("sha256").update(raw).digest("hex") };
}

function resolveFromPath() {
  const fromIndex = process.argv.indexOf("--from");
  if (fromIndex >= 0) {
    return process.argv[fromIndex + 1];
  }
  return null;
}

async function main() {
  const worldPath = process.argv[2] || "world.json";
  const mode = process.argv.includes("--apply") ? "apply" : "dry-run";
  const resolved = path.resolve(process.cwd(), worldPath);

  const { world, hash } = loadWorld(resolved);

  const { rows } = await pool.query<{ world_config_hash: string }>(
    "SELECT world_config_hash FROM world_meta WHERE id = 1"
  );
  const currentHash = rows[0]?.world_config_hash;
  if (!currentHash) {
    console.error("world_meta missing; run server boot first");
    process.exit(1);
  }

  if (currentHash === hash) {
    console.log("No changes detected.");
    process.exit(0);
  }

  const fromPath = resolveFromPath();
  const oldPath = fromPath ? path.resolve(process.cwd(), fromPath) : resolved;
  if (!fromPath) {
    console.warn("No --from supplied; diff may be empty.");
  }
  const oldRaw = fs.readFileSync(oldPath, "utf8");
  const oldParsed = JSON.parse(oldRaw);
  const diff = diffWorlds(oldParsed, world);

  console.log(JSON.stringify(diff, null, 2));

  if (mode !== "apply") {
    console.log("Dry run complete. Re-run with --apply to apply changes.");
    process.exit(1);
  }

  await withTransaction(async (client) => {
    await initializeCounters(client, world);
    await ensureWorldMeta(client, hash);
  });
  await seedEventsFromWorld(world);
  console.log("Reseed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
