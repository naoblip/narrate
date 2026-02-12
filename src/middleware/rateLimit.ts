import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/errors";

const lastStatementAt = new Map<string, number>();

export function statementCooldown(req: Request, res: Response, next: NextFunction) {
  const agentId = (req as Request & { agentId?: string }).agentId;
  if (!agentId) {
    return sendError(res, 401, "AUTH_MISSING", "Missing agent context");
  }

  const cooldown = Number(process.env.STATEMENT_COOLDOWN || 5);
  const now = Date.now();
  const last = lastStatementAt.get(agentId) ?? 0;
  const elapsed = (now - last) / 1000;

  if (elapsed < cooldown) {
    const retryAfter = Math.ceil(cooldown - elapsed);
    res.setHeader("Retry-After", String(retryAfter));
    return sendError(res, 429, "RATE_LIMITED", `Wait ${retryAfter}s before posting another statement`, {
      retry_after_seconds: retryAfter,
    });
  }

  lastStatementAt.set(agentId, now);
  return next();
}

export function resetStatementCooldown() {
  lastStatementAt.clear();
}
