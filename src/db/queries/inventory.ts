import { Queryable } from "../types";

export const INVENTORY_COLUMNS: Record<string, string> = {
  head: "inv_head",
  neck: "inv_neck",
  body: "inv_body",
  legs: "inv_legs",
  hands: "inv_hands",
  feet: "inv_feet",
  ring: "inv_ring",
  left_hand: "inv_left_hand",
  right_hand: "inv_right_hand",
};

export async function updateInventorySlots(
  client: Queryable,
  agentId: string,
  updates: Record<string, string | null>
) {
  const slots = Object.keys(updates);
  const sets = slots.map((slot, idx) => `${INVENTORY_COLUMNS[slot]} = $${idx + 1}`);
  const values = slots.map((slot) => updates[slot]);

  const { rows } = await client.query(
    `UPDATE characters SET ${sets.join(", ")}
     WHERE id = $${values.length + 1}
     RETURNING *`,
    [...values, agentId]
  );

  return rows[0] ?? null;
}
