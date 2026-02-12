import { Queryable } from "../types";

export type ApiKeyRow = {
  id: number;
  agent_id: string;
  key_hash: string;
  created_at: Date;
  revoked_at: Date | null;
};

export async function getActiveKeys(client: Queryable) {
  const { rows } = await client.query<ApiKeyRow>(
    "SELECT * FROM api_keys WHERE revoked_at IS NULL"
  );
  return rows;
}

export async function insertApiKey(client: Queryable, agentId: string, keyHash: string) {
  const { rows } = await client.query<ApiKeyRow>(
    "INSERT INTO api_keys (agent_id, key_hash) VALUES ($1, $2) RETURNING *",
    [agentId, keyHash]
  );
  return rows[0];
}

export async function revokeApiKeys(client: Queryable, agentId: string) {
  await client.query(
    "UPDATE api_keys SET revoked_at = NOW() WHERE agent_id = $1 AND revoked_at IS NULL",
    [agentId]
  );
}
