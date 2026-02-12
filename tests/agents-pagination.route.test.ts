import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { minimalWorld } from "./helpers";
import { decodeCursor } from "../src/utils/pagination";

const listAgentsPaged = vi.fn();

vi.mock("../src/services/agents", async () => {
  const actual = await vi.importActual<typeof import("../src/services/agents")>("../src/services/agents");
  return {
    ...actual,
    listAgentsPaged: (...args: unknown[]) => listAgentsPaged(...args),
  };
});

describe("agents pagination route", () => {
  it("returns next_cursor when page is full", async () => {
    process.env.ADMIN_API_KEY = "admin";
    listAgentsPaged.mockResolvedValue([
      {
        id: "agent-1",
        name: "A",
        species: "Human",
        traits: ["Brave"],
        inventory: { head: null, neck: null, body: null, legs: null, hands: null, feet: null, ring: null, left_hand: null, right_hand: null },
        region: "Alpha",
        location: "Home",
        place: "Square",
        created_at: "2026-02-01T00:00:00.000Z",
      },
    ]);

    const app = createApp(minimalWorld());
    const response = await request(app)
      .get("/api/agents?limit=1")
      .set("Authorization", "Bearer admin");

    expect(response.status).toBe(200);
    expect(response.body.next_cursor).toBeTruthy();

    const decoded = decodeCursor(response.body.next_cursor);
    expect(decoded.id).toBe("agent-1");
  });
});
