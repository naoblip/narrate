import { describe, expect, it, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { minimalWorld } from "./helpers";

const insertAgent = vi.fn();
const revokeApiKeys = vi.fn();
const insertApiKey = vi.fn();
const getActiveKeys = vi.fn();

vi.mock("../src/db/queries/agents", () => ({
  insertAgent: (...args: unknown[]) => insertAgent(...args),
  getAgentById: vi.fn(),
  listAgents: vi.fn(),
  listAgentsAtPlace: vi.fn(),
}));

vi.mock("../src/db/queries/keys", () => ({
  revokeApiKeys: (...args: unknown[]) => revokeApiKeys(...args),
  insertApiKey: (...args: unknown[]) => insertApiKey(...args),
  getActiveKeys: (...args: unknown[]) => getActiveKeys(...args),
}));

const { createAgent, rotateApiKey, findAgentIdForKey } = await import("../src/services/agents");

describe("agent services", () => {
  beforeEach(() => {
    insertAgent.mockReset();
    revokeApiKeys.mockReset();
    insertApiKey.mockReset();
    getActiveKeys.mockReset();
    process.env.API_KEY_PEPPER = "pepper";
  });

  it("creates an agent with server-generated id", async () => {
    insertAgent.mockResolvedValue({
      id: "agent-id",
      name: "Ava",
      name_key: "ava",
      species: "Human",
      traits: ["Brave"],
      inv_head: null,
      inv_neck: null,
      inv_body: null,
      inv_legs: null,
      inv_hands: null,
      inv_feet: null,
      inv_ring: null,
      inv_left_hand: null,
      inv_right_hand: null,
      region: "Alpha",
      location: "Home",
      place: "Square",
      created_at: new Date("2026-01-01T00:00:00Z"),
    });

    const result = await createAgent({} as any, minimalWorld(), {
      name: "Ava",
      species: "Human",
      traits: ["Brave"],
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.agent.name).toBe("Ava");
      expect(result.apiKey).toBeTruthy();
      expect(insertAgent).toHaveBeenCalled();
    }
  });

  it("rotates an api key and stores hash", async () => {
    let storedHash = "";
    insertApiKey.mockImplementation((_client: unknown, _agentId: string, hash: string) => {
      storedHash = hash;
    });

    const rawKey = await rotateApiKey({} as any, "agent-id");

    expect(revokeApiKeys).toHaveBeenCalledWith(expect.anything(), "agent-id");
    expect(insertApiKey).toHaveBeenCalled();
    const matches = await bcrypt.compare(rawKey + "pepper", storedHash);
    expect(matches).toBe(true);
  });

  it("finds agent id for a valid api key", async () => {
    const rawKey = "raw-key";
    const hash = await bcrypt.hash(rawKey + "pepper", 10);
    getActiveKeys.mockResolvedValue([
      { agent_id: "agent-1", key_hash: hash },
    ]);

    const agentId = await findAgentIdForKey({} as any, rawKey);
    expect(agentId).toBe("agent-1");
  });

  it("does not match old key after rotation", async () => {
    const oldKey = "old-key";
    const newKey = "new-key";
    const oldHash = await bcrypt.hash(oldKey + "pepper", 10);
    const newHash = await bcrypt.hash(newKey + "pepper", 10);

    getActiveKeys.mockResolvedValue([{ agent_id: "agent-1", key_hash: newHash }]);

    const oldMatch = await findAgentIdForKey({} as any, oldKey);
    const newMatch = await findAgentIdForKey({} as any, newKey);

    expect(oldMatch).toBe(null);
    expect(newMatch).toBe("agent-1");
  });
});
