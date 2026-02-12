import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { minimalWorld } from "./helpers";

const getLatestSummary = vi.fn();

vi.mock("../src/db/queries/summaries", () => ({
  getLatestSummary: (...args: unknown[]) => getLatestSummary(...args),
}));

vi.mock("../src/services/agents", async () => {
  const actual = await vi.importActual<typeof import("../src/services/agents")>("../src/services/agents");
  return { ...actual };
});

describe("summary routes", () => {
  it("returns null when no summary exists", async () => {
    getLatestSummary.mockResolvedValue(null);

    const app = createApp(minimalWorld());
    const res = await request(app).get("/api/regions/Alpha/summary");

    expect(res.status).toBe(200);
    expect(res.body.summary).toBe(null);
  });

  it("returns formatted summary", async () => {
    getLatestSummary.mockResolvedValue({
      summary: "A short summary",
      generated_at: new Date("2026-02-01T00:00:00Z"),
      activity_count: 12,
      source_statements: ["a", "b"],
    });

    const app = createApp(minimalWorld());
    const res = await request(app).get("/api/regions/Alpha/summary");

    expect(res.status).toBe(200);
    expect(res.body.summary.summary).toBe("A short summary");
    expect(res.body.summary.activity_count).toBe(12);
  });
});
