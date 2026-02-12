import { Queryable } from "../types";

export type SummaryRow = {
  id: number;
  area_type: "region" | "location" | "place";
  region: string;
  location: string | null;
  place: string | null;
  summary: string;
  generated_at: Date;
  activity_count: number;
  source_statements: unknown;
  history: unknown;
};

export async function getLatestSummary(
  client: Queryable,
  params: { areaType: "region" | "location" | "place"; region: string; location?: string | null; place?: string | null }
) {
  const { areaType, region, location = null, place = null } = params;
  const { rows } = await client.query<SummaryRow>(
    `SELECT * FROM area_summaries
     WHERE area_type = $1 AND region = $2 AND (location IS NOT DISTINCT FROM $3) AND (place IS NOT DISTINCT FROM $4)
     ORDER BY generated_at DESC
     LIMIT 1`,
    [areaType, region, location, place]
  );
  return rows[0] ?? null;
}

export async function upsertSummary(
  client: Queryable,
  params: {
    areaType: "region" | "location" | "place";
    region: string;
    location?: string | null;
    place?: string | null;
    summary: string;
    activityCount: number;
    sourceStatements: string[];
    history: Array<{ summary: string; generated_at: string }>;
  }
) {
  const { areaType, region, location = null, place = null, summary, activityCount, sourceStatements, history } = params;
  const update = await client.query<SummaryRow>(
    `UPDATE area_summaries
     SET summary = $5,
         activity_count = $6,
         source_statements = $7,
         history = $8,
         generated_at = NOW()
     WHERE area_type = $1 AND region = $2 AND (location IS NOT DISTINCT FROM $3) AND (place IS NOT DISTINCT FROM $4)
     RETURNING *`,
    [areaType, region, location, place, summary, activityCount, JSON.stringify(sourceStatements), JSON.stringify(history)]
  );

  if (update.rows[0]) {
    return update.rows[0];
  }

  const insert = await client.query<SummaryRow>(
    `INSERT INTO area_summaries (area_type, region, location, place, summary, activity_count, source_statements, history)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [areaType, region, location, place, summary, activityCount, JSON.stringify(sourceStatements), JSON.stringify(history)]
  );

  return insert.rows[0];
}

export async function resetSummaryCounter(
  client: Queryable,
  params: { areaType: "region" | "location" | "place"; region: string; location?: string | null; place?: string | null }
) {
  const { areaType, region, location = null, place = null } = params;
  await client.query(
    `UPDATE area_counters
     SET statements_since_summary = 0, updated_at = NOW()
     WHERE area_type = $1 AND region = $2 AND (location IS NOT DISTINCT FROM $3) AND (place IS NOT DISTINCT FROM $4)`,
    [areaType, region, location, place]
  );
}

export async function getSummaryCounters(client: Queryable) {
  const { rows } = await client.query<{
    area_type: "region" | "location" | "place";
    region: string;
    location: string | null;
    place: string | null;
    statements_since_summary: number;
    updated_at: Date;
  }>(
    `SELECT area_type, region, location, place, statements_since_summary, updated_at
     FROM area_counters`
  );
  return rows;
}

export async function getCounter(
  client: Queryable,
  params: { areaType: "region" | "location" | "place"; region: string; location?: string | null; place?: string | null }
) {
  const { areaType, region, location = null, place = null } = params;
  const { rows } = await client.query<{
    area_type: "region" | "location" | "place";
    region: string;
    location: string | null;
    place: string | null;
    statements_since_summary: number;
    updated_at: Date;
  }>(
    `SELECT area_type, region, location, place, statements_since_summary, updated_at
     FROM area_counters
     WHERE area_type = $1 AND region = $2 AND (location IS NOT DISTINCT FROM $3) AND (place IS NOT DISTINCT FROM $4)
     LIMIT 1`,
    [areaType, region, location, place]
  );
  return rows[0] ?? null;
}
