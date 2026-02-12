import type { PoolClient } from "pg";
import { WorldConfig } from "../config/validate";
import { getAgentById } from "../db/queries/agents";
import { INVENTORY_COLUMNS, updateInventorySlots } from "../db/queries/inventory";

export type Inventory = Record<string, string | null>;

function toInventory(row: Record<string, any>): Inventory {
  const inventory: Inventory = {};
  for (const [slot, column] of Object.entries(INVENTORY_COLUMNS)) {
    inventory[slot] = row[column] ?? null;
  }
  return inventory;
}

function validateSlot(world: WorldConfig, slot: string) {
  const allowedSlots = world.character_options.inventory ?? {};
  return slot in INVENTORY_COLUMNS && slot in allowedSlots;
}

function validateItem(world: WorldConfig, slot: string, item: string) {
  const allowedSlots = world.character_options.inventory ?? {};
  const items = allowedSlots[slot] ?? [];
  return items.includes(item);
}

function hasDuplicateItem(inventory: Inventory, slot: string, item: string) {
  return Object.entries(inventory).some(([invSlot, invItem]) => invSlot !== slot && invItem === item);
}

export async function equipItem(
  client: PoolClient,
  world: WorldConfig,
  agentId: string,
  slot: unknown,
  item: unknown
) {
  if (typeof slot !== "string" || typeof item !== "string") {
    return { ok: false as const, errors: [{ field: "slot", issue: "Invalid slot/item" }] };
  }

  if (!validateSlot(world, slot)) {
    return { ok: false as const, errors: [{ field: "slot", issue: "Unknown slot" }] };
  }

  if (!validateItem(world, slot, item)) {
    return { ok: false as const, errors: [{ field: "item", issue: "Item not allowed for slot" }] };
  }

  const agent = await getAgentById(client, agentId);
  if (!agent || agent.id === "SYSTEM") {
    return { ok: false as const, errors: [{ field: "agent", issue: "Agent not found" }] };
  }

  const inventory = toInventory(agent as Record<string, any>);
  if (hasDuplicateItem(inventory, slot, item)) {
    return { ok: false as const, errors: [{ field: "item", issue: "Item already equipped in another slot" }] };
  }

  const updated = await updateInventorySlots(client, agentId, { [slot]: item });
  return { ok: true as const, inventory: toInventory(updated) };
}

export async function equipItems(
  client: PoolClient,
  world: WorldConfig,
  agentId: string,
  items: unknown
) {
  if (!items || typeof items !== "object" || Array.isArray(items)) {
    return { ok: false as const, errors: [{ field: "items", issue: "Items must be an object" }] };
  }

  const entries = Object.entries(items as Record<string, unknown>);
  if (entries.length === 0) {
    return { ok: false as const, errors: [{ field: "items", issue: "No items provided" }] };
  }

  const errors: Array<{ field: string; issue: string }> = [];
  const updates: Record<string, string> = {};

  for (const [slot, item] of entries) {
    if (typeof item !== "string") {
      errors.push({ field: `items.${slot}`, issue: "Item must be a string" });
      continue;
    }
    if (!validateSlot(world, slot)) {
      errors.push({ field: `items.${slot}`, issue: "Unknown slot" });
      continue;
    }
    if (!validateItem(world, slot, item)) {
      errors.push({ field: `items.${slot}`, issue: "Item not allowed for slot" });
      continue;
    }
    updates[slot] = item;
  }

  const updateValues = Object.values(updates);
  const uniqueItems = new Set(updateValues);
  if (uniqueItems.size !== updateValues.length) {
    errors.push({ field: "items", issue: "Duplicate items across slots" });
  }

  if (errors.length > 0) {
    return { ok: false as const, errors };
  }

  const agent = await getAgentById(client, agentId);
  if (!agent || agent.id === "SYSTEM") {
    return { ok: false as const, errors: [{ field: "agent", issue: "Agent not found" }] };
  }

  const inventory = toInventory(agent as Record<string, any>);
  for (const [slot, item] of Object.entries(updates)) {
    if (hasDuplicateItem(inventory, slot, item)) {
      return { ok: false as const, errors: [{ field: `items.${slot}`, issue: "Item already equipped in another slot" }] };
    }
  }

  const updated = await updateInventorySlots(client, agentId, updates);
  return { ok: true as const, inventory: toInventory(updated) };
}

export async function unequipItem(
  client: PoolClient,
  world: WorldConfig,
  agentId: string,
  slot: unknown
) {
  if (typeof slot !== "string") {
    return { ok: false as const, errors: [{ field: "slot", issue: "Invalid slot" }] };
  }

  if (!validateSlot(world, slot)) {
    return { ok: false as const, errors: [{ field: "slot", issue: "Unknown slot" }] };
  }

  const agent = await getAgentById(client, agentId);
  if (!agent || agent.id === "SYSTEM") {
    return { ok: false as const, errors: [{ field: "agent", issue: "Agent not found" }] };
  }

  const updated = await updateInventorySlots(client, agentId, { [slot]: null });
  return { ok: true as const, inventory: toInventory(updated) };
}
