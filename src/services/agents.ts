import { randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import type { PoolClient } from "pg";
import { Queryable } from "../db/types";
import { WorldConfig } from "../config/validate";
import { insertAgent, getAgentById, listAgents } from "../db/queries/agents";
import { getActiveKeys, insertApiKey, revokeApiKeys } from "../db/queries/keys";

export type InventoryMap = Record<string, string | null>;

export type AgentResponse = {
  id: string;
  name: string;
  species: string;
  traits: string[];
  inventory: Record<string, string | null>;
  region: string;
  location: string;
  place: string;
  created_at: string;
};

const INVENTORY_COLUMNS: Record<string, keyof InventoryMap> = {
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

export function normalizeNameKey(name: string) {
  return name.normalize("NFKC").toLowerCase();
}

function toInventoryColumns(input?: Record<string, string>) {
  const inventory: InventoryMap = {
    inv_head: null,
    inv_neck: null,
    inv_body: null,
    inv_legs: null,
    inv_hands: null,
    inv_feet: null,
    inv_ring: null,
    inv_left_hand: null,
    inv_right_hand: null,
  };

  if (!input) {
    return inventory;
  }

  for (const [slot, item] of Object.entries(input)) {
    const column = INVENTORY_COLUMNS[slot];
    if (column) {
      inventory[column] = item;
    }
  }

  return inventory;
}

function fromInventoryColumns(row: Record<string, string | null>) {
  const inventory: Record<string, string | null> = {};
  for (const [slot, column] of Object.entries(INVENTORY_COLUMNS)) {
    inventory[slot] = row[column];
  }
  return inventory;
}

export function validateAgentInput(world: WorldConfig, input: unknown) {
  const errors: Array<{ field: string; issue: string }> = [];
  if (!input || typeof input !== "object") {
    return { ok: false, errors: [{ field: "body", issue: "Invalid JSON body" }] };
  }

  const data = input as Record<string, unknown>;
  if (data.id !== undefined) {
    errors.push({ field: "id", issue: "ID is server-generated" });
  }

  const name = typeof data.name === "string" ? data.name.trim() : "";
  if (!name) {
    errors.push({ field: "name", issue: "Name must be a non-empty string" });
  } else if (name.length > 60) {
    errors.push({ field: "name", issue: "Name must be 1-60 characters" });
  }

  if (normalizeNameKey(name) === "system") {
    errors.push({ field: "name", issue: "Name is reserved" });
  }

  const species = typeof data.species === "string" ? data.species : "";
  if (!species || !world.character_options.species.includes(species)) {
    errors.push({ field: "species", issue: "Species must be one of character_options.species" });
  }

  const traitsArray = Array.isArray(data.traits) ? data.traits : [];
  const traits = traitsArray.filter((t) => typeof t === "string");
  if (traitsArray.length !== traits.length) {
    errors.push({ field: "traits", issue: "Traits must be strings" });
  }
  const uniqueTraits = new Set(traits);
  if (traits.length === 0 || traits.length > 5 || uniqueTraits.size !== traits.length) {
    errors.push({ field: "traits", issue: "Traits must be 1-5 unique strings" });
  } else {
    for (const trait of traits) {
      if (!world.character_options.traits.includes(trait)) {
        errors.push({ field: "traits", issue: `Trait '${trait}' is not allowed` });
      }
    }
  }

  let inventory: Record<string, string> | undefined;
  if (data.inventory !== undefined) {
    if (!data.inventory || typeof data.inventory !== "object" || Array.isArray(data.inventory)) {
      errors.push({ field: "inventory", issue: "Inventory must be an object" });
    } else {
      inventory = {};
      const options = world.character_options.inventory ?? {};
      for (const [slot, item] of Object.entries(data.inventory)) {
        if (typeof item !== "string") {
          errors.push({ field: `inventory.${slot}`, issue: "Item must be a string" });
          continue;
        }
        if (!options[slot]) {
          errors.push({ field: `inventory.${slot}`, issue: "Unknown inventory slot" });
          continue;
        }
        if (!options[slot].includes(item)) {
          errors.push({ field: `inventory.${slot}`, issue: "Item is not allowed for this slot" });
          continue;
        }
        inventory[slot] = item;
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, data: { name, species, traits, inventory } };
}

export async function createAgent(client: PoolClient, world: WorldConfig, input: unknown) {
  const validation = validateAgentInput(world, input);
  if (!validation.ok) {
    return { ok: false as const, errors: validation.errors };
  }

  const { name, species, traits, inventory } = validation.data;
  const id = randomUUID();
  const nameKey = normalizeNameKey(name);
  const start = world.starting_position;
  const insert = await insertAgent(client, {
    id,
    name,
    nameKey,
    species,
    traits,
    inventory: toInventoryColumns(inventory),
    region: start.region,
    location: start.location,
    place: start.place,
  });

  const apiKey = await rotateApiKey(client, id);

  return { ok: true as const, agent: serializeAgent(insert), apiKey };
}

export async function rotateApiKey(client: PoolClient, agentId: string) {
  const rawKey = randomBytes(32).toString("base64url");
  const pepper = process.env.API_KEY_PEPPER ?? "";
  const hash = await bcrypt.hash(rawKey + pepper, 10);
  await revokeApiKeys(client, agentId);
  await insertApiKey(client, agentId, hash);
  return rawKey;
}

export async function getAgent(client: Queryable, id: string) {
  const row = await getAgentById(client, id);
  if (!row || row.id === "SYSTEM") {
    return null;
  }
  return serializeAgent(row);
}

export async function listAgentsPaged(client: Queryable, limit: number, cursor?: { createdAt: Date; id: string }) {
  const rows = await listAgents(client, { limit, cursor });
  return rows.map((row) => serializeAgent(row));
}

export async function findAgentIdForKey(client: Queryable, apiKey: string) {
  const pepper = process.env.API_KEY_PEPPER ?? "";
  const keys = await getActiveKeys(client);
  for (const key of keys) {
    const match = await bcrypt.compare(apiKey + pepper, key.key_hash);
    if (match) {
      return key.agent_id;
    }
  }
  return null;
}

export function serializeAgent(row: Record<string, unknown>): AgentResponse {
  let traits: string[] = [];
  const rawTraits = row.traits;
  if (Array.isArray(rawTraits)) {
    traits = rawTraits as string[];
  } else if (typeof rawTraits === "string") {
    try {
      traits = JSON.parse(rawTraits) as string[];
    } catch {
      traits = [];
    }
  }
  const createdAt = row.created_at instanceof Date ? row.created_at : new Date(row.created_at as string);

  return {
    id: row.id as string,
    name: row.name as string,
    species: row.species as string,
    traits,
    inventory: fromInventoryColumns(row as Record<string, string | null>),
    region: row.region as string,
    location: row.location as string,
    place: row.place as string,
    created_at: createdAt.toISOString(),
  };
}
