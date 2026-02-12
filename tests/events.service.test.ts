import { describe, expect, it, vi, beforeEach } from "vitest";

const poolConnect = vi.fn();
const tryEventLock = vi.fn();
const releaseEventLock = vi.fn();
const getEventCounter = vi.fn();
const listEventPool = vi.fn();
const getLatestEventCooldown = vi.fn();
const insertPlaceEvent = vi.fn();
const resetEventCounter = vi.fn();

vi.mock("../src/db", () => ({
  pool: {
    connect: () => poolConnect(),
  },
}));

vi.mock("../src/db/advisoryLocks", () => ({
  tryEventLock: (...args: unknown[]) => tryEventLock(...args),
  releaseEventLock: (...args: unknown[]) => releaseEventLock(...args),
}));

vi.mock("../src/db/queries/events", () => ({
  getEventCounter: (...args: unknown[]) => getEventCounter(...args),
  listEventPool: (...args: unknown[]) => listEventPool(...args),
  getLatestEventCooldown: (...args: unknown[]) => getLatestEventCooldown(...args),
  insertPlaceEvent: (...args: unknown[]) => insertPlaceEvent(...args),
  resetEventCounter: (...args: unknown[]) => resetEventCounter(...args),
}));

const { maybeFireEvent } = await import("../src/services/events");

describe("events service", () => {
  beforeEach(() => {
    poolConnect.mockReset();
    tryEventLock.mockReset();
    releaseEventLock.mockReset();
    getEventCounter.mockReset();
    listEventPool.mockReset();
    getLatestEventCooldown.mockReset();
    insertPlaceEvent.mockReset();
    resetEventCounter.mockReset();

    poolConnect.mockResolvedValue({
      query: vi.fn(),
      release: vi.fn(),
    });
    tryEventLock.mockResolvedValue(true);
    process.env.EVENT_TRIGGER_THRESHOLD = "1";
    process.env.EVENT_TRIGGER_CHANCE = "1";
  });

  it("does not fire below threshold", async () => {
    getEventCounter.mockResolvedValue(0);
    const result = await maybeFireEvent({ region: "A", location: "B", place: "C" });
    expect(result.ok).toBe(false);
  });

  it("fires event when available", async () => {
    getEventCounter.mockResolvedValue(5);
    listEventPool.mockResolvedValue([
      { event_id: "evt", event_text: "Boom", weight: 1, cooldown_seconds: 0 },
    ]);
    getLatestEventCooldown.mockResolvedValue(null);
    insertPlaceEvent.mockResolvedValue({
      event_id: "evt",
      event_text: "Boom",
      triggered_at: new Date("2026-02-01T00:00:00Z"),
    });

    const result = await maybeFireEvent({ region: "A", location: "B", place: "C" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.eventId).toBe("evt");
    }
  });
});
