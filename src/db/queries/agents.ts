import { Queryable } from "../types";

export type AgentRow = {
  id: string;
  name: string;
  name_key: string;
  species: string;
  traits: unknown;
  inv_head: string | null;
  inv_neck: string | null;
  inv_body: string | null;
  inv_legs: string | null;
  inv_hands: string | null;
  inv_feet: string | null;
  inv_ring: string | null;
  inv_left_hand: string | null;
  inv_right_hand: string | null;
  region: string;
  location: string;
  place: string;
  created_at: Date;
};

export async function insertAgent(client: Queryable, params: {
  id: string;
  name: string;
  nameKey: string;
  species: string;
  traits: string[];
  inventory: Record<string, string | null>;
  region: string;
  location: string;
  place: string;
}) {
  const {
    id,
    name,
    nameKey,
    species,
    traits,
    inventory,
    region,
    location,
    place,
  } = params;

  const columns = [
    "inv_head",
    "inv_neck",
    "inv_body",
    "inv_legs",
    "inv_hands",
    "inv_feet",
    "inv_ring",
    "inv_left_hand",
    "inv_right_hand",
  ];

  const values = columns.map((col) => inventory[col] ?? null);

  const result = await client.query<AgentRow>(
    `INSERT INTO characters (
      id, name, name_key, species, traits,
      inv_head, inv_neck, inv_body, inv_legs, inv_hands, inv_feet, inv_ring, inv_left_hand, inv_right_hand,
      region, location, place
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17
    )
    RETURNING *`,
    [
      id,
      name,
      nameKey,
      species,
      JSON.stringify(traits),
      ...values,
      region,
      location,
      place,
    ]
  );

  return result.rows[0];
}

export async function getAgentById(client: Queryable, id: string) {
  const { rows } = await client.query<AgentRow>(
    "SELECT * FROM characters WHERE id = $1",
    [id]
  );
  return rows[0] ?? null;
}

export async function listAgents(client: Queryable, params: {
  limit: number;
  cursor?: { createdAt: Date; id: string };
}) {
  const { limit, cursor } = params;
  if (cursor) {
    const { rows } = await client.query<AgentRow>(
      `SELECT * FROM characters
       WHERE id <> 'SYSTEM'
         AND (created_at, id) < ($1::timestamptz, $2::text)
       ORDER BY created_at DESC, id DESC
       LIMIT $3`,
      [cursor.createdAt.toISOString(), cursor.id, limit]
    );
    return rows;
  }

  const { rows } = await client.query<AgentRow>(
    `SELECT * FROM characters
     WHERE id <> 'SYSTEM'
     ORDER BY created_at DESC, id DESC
     LIMIT $1`,
    [limit]
  );

  return rows;
}

export async function listAgentsAtPlace(
  client: Queryable,
  params: { region: string; location: string; place: string; limit: number; cursor?: { createdAt: Date; id: string } }
) {
  const { region, location, place, limit, cursor } = params;
  if (cursor) {
    const { rows } = await client.query<AgentRow>(
      `SELECT * FROM characters
       WHERE id <> 'SYSTEM'
         AND region = $1 AND location = $2 AND place = $3
         AND (created_at, id) < ($4::timestamptz, $5::text)
       ORDER BY created_at DESC, id DESC
       LIMIT $6`,
      [region, location, place, cursor.createdAt.toISOString(), cursor.id, limit]
    );
    return rows;
  }

  const { rows } = await client.query<AgentRow>(
    `SELECT * FROM characters
     WHERE id <> 'SYSTEM'
       AND region = $1 AND location = $2 AND place = $3
     ORDER BY created_at DESC, id DESC
     LIMIT $4`,
    [region, location, place, limit]
  );

  return rows;
}
