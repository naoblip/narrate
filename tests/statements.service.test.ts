import { describe, expect, it, vi } from "vitest";
import { createStatement } from "../src/services/statements";

const getAgentById = vi.fn();
const insertStatement = vi.fn();
const incrementCounters = vi.fn();

vi.mock("../src/db/queries/agents", () => ({
  getAgentById: (...args: unknown[]) => getAgentById(...args),
}));

vi.mock("../src/db/queries/statements", () => ({
  insertStatement: (...args: unknown[]) => insertStatement(...args),
  incrementCounters: (...args: unknown[]) => incrementCounters(...args),
}));

describe("statements service", () => {
  it("rejects empty statements", async () => {
    getAgentById.mockResolvedValue({
      id: "agent-1",
      region: "Alpha",
      location: "Home",
      place: "Square",
    });

    const result = await createStatement({} as any, "agent-1", { statement: "   " });
    expect(result.ok).toBe(false);
  });

  it("rejects shared_with containing SYSTEM", async () => {
    getAgentById.mockResolvedValue({
      id: "agent-1",
      region: "Alpha",
      location: "Home",
      place: "Square",
    });

    const result = await createStatement({} as any, "agent-1", {
      statement: "Hello",
      shared_with: ["SYSTEM"],
    });

    expect(result.ok).toBe(false);
  });

  it("persists statement and increments counters", async () => {
    getAgentById.mockResolvedValue({
      id: "agent-1",
      region: "Alpha",
      location: "Home",
      place: "Square",
    });

    const result = await createStatement({} as any, "agent-1", {
      statement: "Hello",
      shared_with: [],
    });

    expect(result.ok).toBe(true);
    expect(insertStatement).toHaveBeenCalled();
    expect(incrementCounters).toHaveBeenCalledWith(expect.anything(), {
      region: "Alpha",
      location: "Home",
      place: "Square",
    });
  });
});
