import { describe, expect, it } from "vitest";
import { moveAgent } from "../src/services/movement";
import { minimalWorld } from "./helpers";

const world = minimalWorld();

function makeClient(agent: { id: string; name: string; region: string; location: string; place: string }) {
  const queries: Array<{ text: string; params: unknown[] }> = [];
  const client = {
    query: async (text: string, params: unknown[]) => {
      queries.push({ text, params });
      if (text.includes("SELECT * FROM characters")) {
        return { rows: [agent] };
      }
      return { rows: [] };
    },
  };
  return { client, queries };
}

describe("movement service", () => {
  it("moves within same location without logging activity", async () => {
    const { client, queries } = makeClient({
      id: "agent-1",
      name: "A",
      region: "Alpha",
      location: "Home",
      place: "Square",
    });

    const result = await moveAgent(client as any, world, "agent-1", {
      region: "Alpha",
      location: "Home",
      place: "Square",
    });

    expect(result.ok).toBe(true);
    const insertLog = queries.find((q) => q.text.includes("INSERT INTO activity_log"));
    expect(insertLog).toBeUndefined();
  });

  it("logs activity when moving across locations", async () => {
    const { client, queries } = makeClient({
      id: "agent-1",
      name: "A",
      region: "Alpha",
      location: "Home",
      place: "Square",
    });

    const result = await moveAgent(client as any, world, "agent-1", {
      region: "Beta",
      location: "Gate",
      place: "Path",
    });

    expect(result.ok).toBe(true);
    const insertLog = queries.find((q) => q.text.includes("INSERT INTO activity_log"));
    expect(insertLog).toBeTruthy();
  });

  it("rejects move to non-adjacent region", async () => {
    const { client } = makeClient({
      id: "agent-1",
      name: "A",
      region: "Alpha",
      location: "Home",
      place: "Square",
    });

    const result = await moveAgent(client as any, world, "agent-1", {
      region: "Gamma",
      location: "Somewhere",
      place: "Else",
    });

    expect(result.ok).toBe(false);
  });
});
