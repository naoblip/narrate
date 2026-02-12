import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { getAgentById } from "../db/queries/agents";
import { insertStatement, incrementCounters } from "../db/queries/statements";

export type StatementInput = {
  statement?: unknown;
  shared_with?: unknown;
};

export function validateStatementInput(input: StatementInput) {
  const errors: Array<{ field: string; issue: string }> = [];
  const raw = typeof input.statement === "string" ? input.statement.trim() : "";
  if (!raw) {
    errors.push({ field: "statement", issue: "Statement must be 1-500 characters" });
  } else if (raw.length > 500) {
    errors.push({ field: "statement", issue: "Statement must be 1-500 characters" });
  }

  let sharedWith: string[] = [];
  if (input.shared_with !== undefined) {
    if (!Array.isArray(input.shared_with)) {
      errors.push({ field: "shared_with", issue: "shared_with must be an array" });
    } else {
      const rawList = input.shared_with;
      if (rawList.length > 10) {
        errors.push({ field: "shared_with", issue: "shared_with must have at most 10 entries" });
      }
      const filtered = rawList.filter((id) => typeof id === "string") as string[];
      if (filtered.length !== rawList.length) {
        errors.push({ field: "shared_with", issue: "shared_with must contain only strings" });
      }
      const unique = new Set(filtered);
      if (unique.size !== filtered.length) {
        errors.push({ field: "shared_with", issue: "shared_with must be unique" });
      }
      if (filtered.includes("SYSTEM")) {
        errors.push({ field: "shared_with", issue: "SYSTEM is not allowed" });
      }
      sharedWith = filtered;
    }
  }

  return { errors, statement: raw, sharedWith };
}

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function createStatement(client: PoolClient, agentId: string, input: StatementInput) {
  const { errors, statement, sharedWith } = validateStatementInput(input);
  if (errors.length > 0) {
    return { ok: false as const, errors };
  }

  const agent = await getAgentById(client, agentId);
  if (!agent || agent.id === "SYSTEM") {
    return { ok: false as const, errors: [{ field: "agent", issue: "Agent not found" }] };
  }

  const invalidId = sharedWith.find((id) => id !== "SYSTEM" && !UUID_V4.test(id));
  if (invalidId) {
    return { ok: false as const, errors: [{ field: "shared_with", issue: "Invalid agent id" }] };
  }

  const statementId = randomUUID();
  await insertStatement(client, {
    id: statementId,
    agentId,
    statement,
    region: agent.region,
    location: agent.location,
    place: agent.place,
    sharedWith,
  });

  await incrementCounters(client, {
    region: agent.region,
    location: agent.location,
    place: agent.place,
  });

  return {
    ok: true as const,
    statementId,
    position: { region: agent.region, location: agent.location, place: agent.place },
  };
}
