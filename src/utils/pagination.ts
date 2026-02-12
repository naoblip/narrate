export type Cursor = {
  createdAt: Date;
  id: string;
};

export function encodeCursor(createdAt: Date, id: string): string {
  const payload = `${createdAt.toISOString()}|${id}`;
  return Buffer.from(payload, "utf8").toString("base64");
}

export function decodeCursor(cursor: string): Cursor {
  const raw = Buffer.from(cursor, "base64").toString("utf8");
  const [createdAtRaw, id] = raw.split("|");
  if (!createdAtRaw || !id) {
    throw new Error("Invalid cursor");
  }
  const createdAt = new Date(createdAtRaw);
  if (Number.isNaN(createdAt.getTime())) {
    throw new Error("Invalid cursor timestamp");
  }
  return { createdAt, id };
}
