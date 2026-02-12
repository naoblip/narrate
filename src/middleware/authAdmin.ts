import type { NextFunction, Request, Response } from "express";
import { sendError } from "../utils/errors";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return sendError(res, 500, "ADMIN_KEY_MISSING", "ADMIN_API_KEY is not configured");
  }

  const header = req.header("authorization");
  if (!header) {
    return sendError(res, 401, "AUTH_MISSING", "Missing Authorization header");
  }
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return sendError(res, 401, "AUTH_INVALID", "Invalid Authorization header");
  }

  if (token !== adminKey) {
    return sendError(res, 403, "AUTH_FORBIDDEN", "Invalid admin key");
  }

  return next();
}
