import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { minimalWorld } from "./helpers";

const insertEventPool = vi.fn();
const deleteEventPool = vi.fn();
const listEventPool = vi.fn();
const listPlaceEvents = vi.fn();

vi.mock("../src/middleware/authAdmin", () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../src/db/queries/events", () => ({
  insertEventPool: (...args: unknown[]) => insertEventPool(...args),
  deleteEventPool: (...args: unknown[]) => deleteEventPool(...args),
  listEventPool: (...args: unknown[]) => listEventPool(...args),
  listPlaceEvents: (...args: unknown[]) => listPlaceEvents(...args),
}));

vi.mock("../src/services/events", () => ({
  forceEvent: vi.fn().mockResolvedValue({
    ok: true,
    eventId: "evt",
    eventText: "Boom",
    triggeredAt: new Date("2026-02-01T00:00:00Z"),
  }),
}));

describe("admin events routes", () => {
  it("creates event pool entry", async () => {
    insertEventPool.mockResolvedValue({ event_id: "evt" });

    const app = createApp(minimalWorld());
    const res = await request(app)
      .post("/api/admin/events")
      .send({
        place_id: "Alpha:Home:Square",
        event: { id: "evt", text: "Boom", weight: 1, cooldown: 0 },
      });

    expect(res.status).toBe(201);
    expect(res.body.event_id).toBe("evt");
  });

  it("lists event pool", async () => {
    listEventPool.mockResolvedValue([
      { event_id: "evt", event_text: "Boom", weight: 1, cooldown_seconds: 0 },
    ]);

    const app = createApp(minimalWorld());
    const res = await request(app)
      .get("/api/admin/events/Alpha:Home:Square/pool");

    expect(res.status).toBe(200);
    expect(res.body.events.length).toBe(1);
  });

  it("deletes event pool entry", async () => {
    const app = createApp(minimalWorld());
    const res = await request(app)
      .delete("/api/admin/events/Alpha:Home:Square/evt");

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(deleteEventPool).toHaveBeenCalled();
  });

  it("lists place events", async () => {
    listPlaceEvents.mockResolvedValue([
      { id: 1, event_id: "evt", event_text: "Boom", triggered_at: new Date("2026-02-01T00:00:00Z") },
    ]);

    const app = createApp(minimalWorld());
    const res = await request(app)
      .get("/api/admin/events/Alpha:Home:Square");

    expect(res.status).toBe(200);
    expect(res.body.events[0].event_id).toBe("evt");
  });
});
