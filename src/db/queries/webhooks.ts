import { Queryable } from "../types";

export type AgentWebhookRow = {
  agent_id: string;
  webhook_url: string;
  created_at: Date;
  updated_at: Date;
};

export async function getAgentWebhook(client: Queryable, agentId: string) {
  const { rows } = await client.query<AgentWebhookRow>(
    `SELECT agent_id, webhook_url, created_at, updated_at
     FROM agent_webhooks
     WHERE agent_id = $1`,
    [agentId]
  );
  return rows[0] ?? null;
}

export async function upsertAgentWebhook(client: Queryable, agentId: string, webhookUrl: string) {
  const { rows } = await client.query<AgentWebhookRow>(
    `INSERT INTO agent_webhooks (agent_id, webhook_url)
     VALUES ($1, $2)
     ON CONFLICT (agent_id) DO UPDATE
       SET webhook_url = EXCLUDED.webhook_url,
           updated_at = NOW()
     RETURNING agent_id, webhook_url, created_at, updated_at`,
    [agentId, webhookUrl]
  );
  return rows[0];
}

export async function deleteAgentWebhook(client: Queryable, agentId: string) {
  await client.query("DELETE FROM agent_webhooks WHERE agent_id = $1", [agentId]);
}

export async function listAgentWebhooksByIds(client: Queryable, agentIds: string[]) {
  if (agentIds.length === 0) {
    return [] as AgentWebhookRow[];
  }

  const { rows } = await client.query<AgentWebhookRow>(
    `SELECT agent_id, webhook_url, created_at, updated_at
     FROM agent_webhooks
     WHERE agent_id = ANY($1::text[])`,
    [agentIds]
  );
  return rows;
}
