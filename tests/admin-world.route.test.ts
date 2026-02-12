import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { minimalWorld } from "./helpers";

vi.mock("../src/middleware/authAdmin", () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

describe("admin world validate route", () => {
  it("returns ok for valid world", async () => {
    const app = createApp(minimalWorld());
    const res = await request(app)
      .post("/api/admin/worlds/validate")
      .send(minimalWorld());

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("returns validation errors", async () => {
    const app = createApp(minimalWorld());
    const invalid = minimalWorld();
    invalid.starting_position.place = "Missing";

    const res = await request(app)
      .post("/api/admin/worlds/validate")
      .send(invalid);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});
