import type { Response } from "express";

export type ErrorDetails = Record<string, unknown> | Array<Record<string, unknown>>;

export function sendError(
  res: Response,
  status: number,
  code: string,
  message: string,
  details?: ErrorDetails
) {
  const payload = details ? { error: { code, message, details } } : { error: { code, message } };
  return res.status(status).json(payload);
}
