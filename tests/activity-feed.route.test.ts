import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { minimalWorld } from "./helpers";
import { decodeCursor } from "../src/utils/pagination";

const listActivityByPlace = vi.fn();

vi.mock("../src/db/queries/activity", () => ({
  listActivityByPlace: (...args: unknown[]) => listActivityByPlace(...args),
}));

vi.mock("../src/services/agents", async () => {
  const actual = await vi.importActual<typeof import("../src/services/agents")>("../src/services/agents");
  return { ...actual };
});

describe("activity feed route", () => {
  it("returns activity with next_cursor", async () => {
    listActivityByPlace.mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000001",
        agent_id: "agent-1",
        statement: "Hello",
        created_at: new Date("2026-02-01T00:00:00Z"),
        region: "Alpha",
        location: "Home",
        place: "Square",
        shared_with: [],
        activity_type: "dialogue",
      },
    ]);

    const app = createApp(minimalWorld());
    const response = await request(app)
      .get("/api/places/Alpha/Home/Square/activity?limit=1");

    expect(response.status).toBe(200);
    expect(response.body.activity.length).toBe(1);
    expect(response.body.next_cursor).toBeTruthy();

    const decoded = decodeCursor(response.body.next_cursor);
    expect(decoded.id).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("flags events with is_event", async () => {
    listActivityByPlace.mockResolvedValue([
      {
        id: "00000000-0000-4000-8000-000000000002",
        agent_id: "SYSTEM",
        statement: "Event",
        created_at: new Date("2026-02-02T00:00:00Z"),
        region: "Alpha",
        location: "Home",
        place: "Square",
        shared_with: [],
        activity_type: "event",
      },
    ]);

    const app = createApp(minimalWorld());
    const response = await request(app)
      .get("/api/places/Alpha/Home/Square/activity?limit=1");

    expect(response.status).toBe(200);
    expect(response.body.activity[0].is_event).toBe(true);
  });
});
