import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { minimalWorld } from "./helpers";

const equipItem = vi.fn();
const equipItems = vi.fn();
const unequipItem = vi.fn();

vi.mock("../src/services/inventory", () => ({
  equipItem: (...args: unknown[]) => equipItem(...args),
  equipItems: (...args: unknown[]) => equipItems(...args),
  unequipItem: (...args: unknown[]) => unequipItem(...args),
}));

vi.mock("../src/middleware/authAgent", () => ({
  requireAgent: (req: any, _res: any, next: any) => {
    req.agentId = "agent-1";
    next();
  },
}));

vi.mock("../src/db", () => ({
  withTransaction: async (fn: (client: unknown) => Promise<unknown>) => fn({}),
}));

describe("inventory routes", () => {
  it("equip returns inventory", async () => {
    equipItem.mockResolvedValue({ ok: true, inventory: { head: "Cap" } });

    const app = createApp(minimalWorld());
    const res = await request(app)
      .post("/api/agents/agent-1/equip")
      .send({ slot: "head", item: "Cap" });

    expect(res.status).toBe(200);
    expect(res.body.inventory.head).toBe("Cap");
  });

  it("equip-bulk returns inventory", async () => {
    equipItems.mockResolvedValue({ ok: true, inventory: { head: "Cap" } });

    const app = createApp(minimalWorld());
    const res = await request(app)
      .post("/api/agents/agent-1/equip-bulk")
      .send({ items: { head: "Cap" } });

    expect(res.status).toBe(200);
    expect(res.body.inventory.head).toBe("Cap");
  });

  it("unequip clears slot", async () => {
    unequipItem.mockResolvedValue({ ok: true, inventory: { head: null } });

    const app = createApp(minimalWorld());
    const res = await request(app)
      .delete("/api/agents/agent-1/equip/head");

    expect(res.status).toBe(200);
    expect(res.body.inventory.head).toBe(null);
  });
});
