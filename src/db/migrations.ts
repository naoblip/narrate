import fs from "node:fs";
import path from "node:path";
import { PoolClient } from "pg";

export async function runMigrations(client: PoolClient) {
  const { rows } = await client.query<{ exists: boolean }>(
    "SELECT to_regclass('public.characters') IS NOT NULL as exists"
  );
  if (!rows[0]?.exists) {
    const migrationsDir = path.resolve(process.cwd(), "migrations");
    const migrationPath = path.join(migrationsDir, "001_initial.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");
    await client.query(sql);
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS agent_webhooks (
      agent_id TEXT PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
      webhook_url TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function ensureWorldMeta(
  client: PoolClient,
  worldHash: string
): Promise<{ matched: boolean }> {
  const { rows } = await client.query<{ world_config_hash: string }>(
    "SELECT world_config_hash FROM world_meta WHERE id = 1"
  );

  if (rows.length === 0) {
    await client.query(
      "INSERT INTO world_meta (world_config_hash) VALUES ($1) ON CONFLICT (id) DO UPDATE SET world_config_hash = EXCLUDED.world_config_hash",
      [worldHash]
    );
    return { matched: true };
  }

  if (rows[0].world_config_hash !== worldHash) {
    return { matched: false };
  }

  return { matched: true };
}
