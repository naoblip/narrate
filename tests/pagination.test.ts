import { describe, expect, it } from "vitest";
import { decodeCursor, encodeCursor } from "../src/utils/pagination";


describe("pagination cursors", () => {
  it("round-trips encode/decode", () => {
    const date = new Date("2026-02-01T00:00:00Z");
    const cursor = encodeCursor(date, "abc");
    const decoded = decodeCursor(cursor);
    expect(decoded.id).toBe("abc");
    expect(decoded.createdAt.toISOString()).toBe(date.toISOString());
  });

  it("rejects malformed cursor", () => {
    expect(() => decodeCursor("not-base64")).toThrow();
  });
});
