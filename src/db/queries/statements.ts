import { Queryable } from "../types";

export async function insertStatement(
  client: Queryable,
  params: {
    id: string;
    agentId: string;
    statement: string;
    region: string;
    location: string;
    place: string;
    sharedWith: string[];
  }
) {
  const { id, agentId, statement, region, location, place, sharedWith } = params;
  await client.query(
    `INSERT INTO activity_log (id, agent_id, statement, region, location, place, shared_with, activity_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'dialogue')`,
    [id, agentId, statement, region, location, place, JSON.stringify(sharedWith)]
  );
}

export async function incrementCounters(
  client: Queryable,
  params: { region: string; location: string; place: string }
) {
  const { region, location, place } = params;
  await client.query(
    `UPDATE area_counters
     SET statements_since_summary = statements_since_summary + 1,
         statements_since_event = statements_since_event + 1,
         updated_at = NOW()
     WHERE area_type = 'region' AND region = $1`,
    [region]
  );
  await client.query(
    `UPDATE area_counters
     SET statements_since_summary = statements_since_summary + 1,
         statements_since_event = statements_since_event + 1,
         updated_at = NOW()
     WHERE area_type = 'location' AND region = $1 AND location = $2`,
    [region, location]
  );
  await client.query(
    `UPDATE area_counters
     SET statements_since_summary = statements_since_summary + 1,
         statements_since_event = statements_since_event + 1,
         updated_at = NOW()
     WHERE area_type = 'place' AND region = $1 AND location = $2 AND place = $3`,
    [region, location, place]
  );
}
