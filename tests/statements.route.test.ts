import { describe, expect, it, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { minimalWorld } from "./helpers";
import { resetStatementCooldown } from "../src/middleware/rateLimit";

const createStatement = vi.fn();

vi.mock("../src/services/agents", async () => {
  const actual = await vi.importActual<typeof import("../src/services/agents")>("../src/services/agents");
  return {
    ...actual,
    findAgentIdForKey: vi.fn().mockResolvedValue("agent-1"),
  };
});

vi.mock("../src/middleware/authAgent", () => ({
  requireAgent: (req: any, _res: any, next: any) => {
    req.agentId = "agent-1";
    next();
  },
}));

vi.mock("../src/db", () => ({
  withTransaction: async (fn: (client: unknown) => Promise<unknown>) => fn({}),
}));

vi.mock("../src/services/statements", () => ({
  createStatement: (...args: unknown[]) => createStatement(...args),
}));

vi.mock("../src/services/summarization", () => ({
  queueSummaryChecks: () => {},
}));

describe("statements route", () => {
  beforeEach(() => {
    process.env.STATEMENT_COOLDOWN = "0";
    resetStatementCooldown();
    createStatement.mockReset();
  });

  it("returns 201 with statement_id", async () => {
    createStatement.mockResolvedValue({
      ok: true,
      statementId: "stmt-1",
      position: { region: "Alpha", location: "Home", place: "Square" },
    });

    const app = createApp(minimalWorld());
    const response = await request(app)
      .post("/api/agents/agent-1/statements")
      .set("Authorization", "Bearer token")
      .send({ statement: "Hello" });

    expect(response.status).toBe(201);
    expect(response.body.statement_id).toBe("stmt-1");
  });

  it("returns 400 on validation errors", async () => {
    createStatement.mockResolvedValue({ ok: false, errors: [{ field: "statement", issue: "Invalid" }] });

    const app = createApp(minimalWorld());
    const response = await request(app)
      .post("/api/agents/agent-1/statements")
      .set("Authorization", "Bearer token")
      .send({ statement: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 429 when cooldown applies", async () => {
    createStatement.mockResolvedValue({
      ok: true,
      statementId: "stmt-1",
      position: { region: "Alpha", location: "Home", place: "Square" },
    });

    const app = createApp(minimalWorld());
    process.env.STATEMENT_COOLDOWN = "1";
    resetStatementCooldown();

    const first = await request(app)
      .post("/api/agents/agent-1/statements")
      .set("Authorization", "Bearer token")
      .send({ statement: "Hello" });

    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/agents/agent-1/statements")
      .set("Authorization", "Bearer token")
      .send({ statement: "Hello again" });

    expect(second.status).toBe(429);
    expect(second.body.error.code).toBe("RATE_LIMITED");
  });
});
