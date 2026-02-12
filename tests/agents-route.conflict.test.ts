import { describe, expect, it, vi } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { minimalWorld } from "./helpers";

const withTransaction = vi.fn();

vi.mock("../src/db", () => ({
  pool: { query: vi.fn() },
  withTransaction: (...args: unknown[]) => withTransaction(...args),
}));

vi.mock("../src/services/agents", async () => {
  const actual = await vi.importActual<typeof import("../src/services/agents")>("../src/services/agents");
  return {
    ...actual,
  };
});

describe("agents route conflicts", () => {
  it("returns 409 when name is taken", async () => {
    withTransaction.mockRejectedValue({ code: "23505" });

    const app = createApp(minimalWorld());
    const response = await request(app)
      .post("/api/agents")
      .send({ name: "Ava", species: "Human", traits: ["Brave"] });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("NAME_TAKEN");
  });
});
