import type { NextFunction, Request, Response } from "express";
import { pool } from "../db";
import { findAgentIdForKey } from "../services/agents";
import { sendError } from "../utils/errors";

export async function requireAgent(req: Request, res: Response, next: NextFunction) {
  const header = req.header("authorization");
  if (!header) {
    return sendError(res, 401, "AUTH_MISSING", "Missing Authorization header");
  }
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return sendError(res, 401, "AUTH_INVALID", "Invalid Authorization header");
  }

  try {
    const agentId = await findAgentIdForKey(pool, token);
    if (!agentId) {
      return sendError(res, 403, "AUTH_FORBIDDEN", "Invalid API key");
    }
    (req as Request & { agentId: string }).agentId = agentId;
    return next();
  } catch (err) {
    return sendError(res, 500, "AUTH_ERROR", "Failed to authenticate");
  }
}
