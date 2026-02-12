import { Queryable } from "../types";

export type ActivityRow = {
  id: string;
  agent_id: string;
  agent_name: string | null;
  statement: string;
  created_at: Date;
  region: string;
  location: string;
  place: string;
  shared_with: unknown;
  activity_type: "dialogue" | "movement" | "event";
};

export async function listActivityByPlace(
  client: Queryable,
  params: {
    region: string;
    location: string;
    place: string;
    limit: number;
    cursor?: { createdAt: Date; id: string };
  }
) {
  const { region, location, place, limit, cursor } = params;
  if (cursor) {
    const { rows } = await client.query<ActivityRow>(
      `SELECT
         a.id,
         a.agent_id,
         c.name AS agent_name,
         a.statement,
         a.created_at,
         a.region,
         a.location,
         a.place,
         a.shared_with,
         a.activity_type
       FROM activity_log a
       LEFT JOIN characters c ON c.id = a.agent_id
       WHERE a.region = $1 AND a.location = $2 AND a.place = $3
         AND (a.created_at, a.id) < ($4::timestamptz, $5::uuid)
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $6`,
      [region, location, place, cursor.createdAt.toISOString(), cursor.id, limit]
    );
    return rows;
  }

  const { rows } = await client.query<ActivityRow>(
    `SELECT
       a.id,
       a.agent_id,
       c.name AS agent_name,
       a.statement,
       a.created_at,
       a.region,
       a.location,
       a.place,
       a.shared_with,
       a.activity_type
     FROM activity_log a
     LEFT JOIN characters c ON c.id = a.agent_id
     WHERE a.region = $1 AND a.location = $2 AND a.place = $3
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT $4`,
    [region, location, place, limit]
  );

  return rows;
}

export async function listActivityByAgentOrShared(
  client: Queryable,
  params: {
    agentId: string;
    limit: number;
    cursor?: { createdAt: Date; id: string };
  }
) {
  const { agentId, limit, cursor } = params;
  if (cursor) {
    const { rows } = await client.query<ActivityRow>(
      `SELECT
         a.id,
         a.agent_id,
         c.name AS agent_name,
         a.statement,
         a.created_at,
         a.region,
         a.location,
         a.place,
         a.shared_with,
         a.activity_type
       FROM activity_log a
       LEFT JOIN characters c ON c.id = a.agent_id
       WHERE (a.agent_id = $1 OR a.shared_with ? $1)
         AND (a.created_at, a.id) < ($2::timestamptz, $3::uuid)
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $4`,
      [agentId, cursor.createdAt.toISOString(), cursor.id, limit]
    );
    return rows;
  }

  const { rows } = await client.query<ActivityRow>(
    `SELECT
       a.id,
       a.agent_id,
       c.name AS agent_name,
       a.statement,
       a.created_at,
       a.region,
       a.location,
       a.place,
       a.shared_with,
       a.activity_type
     FROM activity_log a
     LEFT JOIN characters c ON c.id = a.agent_id
     WHERE a.agent_id = $1 OR a.shared_with ? $1
     ORDER BY a.created_at DESC, a.id DESC
     LIMIT $2`,
    [agentId, limit]
  );

  return rows;
}

export async function listDialogueByArea(
  client: Queryable,
  params: {
    areaType: "region" | "location" | "place";
    region: string;
    location?: string | null;
    place?: string | null;
    since?: Date | null;
    limit?: number;
  }
) {
  const { areaType, region, location = null, place = null, since = null, limit = 200 } = params;
  const conditions: string[] = ["activity_type = 'dialogue'", "region = $1"];
  const values: Array<string | number | null> = [region];
  let idx = 2;

  if (areaType !== "region") {
    conditions.push(`location = $${idx++}`);
    values.push(location ?? "");
  }
  if (areaType === "place") {
    conditions.push(`place = $${idx++}`);
    values.push(place ?? "");
  }
  if (since) {
    conditions.push(`created_at > $${idx++}`);
    values.push(since.toISOString());
  }

  const { rows } = await client.query<ActivityRow>(
    `SELECT * FROM activity_log
     WHERE ${conditions.join(" AND ")}
     ORDER BY created_at ASC
     LIMIT ${limit}`,
    values
  );

  return rows;
}
