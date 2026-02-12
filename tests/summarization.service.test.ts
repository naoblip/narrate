import { describe, expect, it, vi, beforeEach } from "vitest";

const poolConnect = vi.fn();
const listDialogueByArea = vi.fn();
const getLatestSummary = vi.fn();
const upsertSummary = vi.fn();
const resetSummaryCounter = vi.fn();
const trySummaryLock = vi.fn();
const releaseSummaryLock = vi.fn();
const summarize = vi.fn();

vi.mock("../src/db", () => ({
  pool: {
    connect: () => poolConnect(),
  },
}));

vi.mock("../src/db/queries/activity", () => ({
  listDialogueByArea: (...args: unknown[]) => listDialogueByArea(...args),
}));

vi.mock("../src/db/queries/summaries", () => ({
  getLatestSummary: (...args: unknown[]) => getLatestSummary(...args),
  upsertSummary: (...args: unknown[]) => upsertSummary(...args),
  resetSummaryCounter: (...args: unknown[]) => resetSummaryCounter(...args),
  getSummaryCounters: vi.fn(),
  getCounter: vi.fn(),
}));

vi.mock("../src/db/advisoryLocks", () => ({
  trySummaryLock: (...args: unknown[]) => trySummaryLock(...args),
  releaseSummaryLock: (...args: unknown[]) => releaseSummaryLock(...args),
}));

vi.mock("../src/llm", () => ({
  summarize: (...args: unknown[]) => summarize(...args),
}));

const { summarizeArea } = await import("../src/services/summarization");

describe("summarization service", () => {
  beforeEach(() => {
    poolConnect.mockReset();
    listDialogueByArea.mockReset();
    getLatestSummary.mockReset();
    upsertSummary.mockReset();
    resetSummaryCounter.mockReset();
    trySummaryLock.mockReset();
    releaseSummaryLock.mockReset();
    summarize.mockReset();

    poolConnect.mockResolvedValue({
      query: vi.fn(),
      release: vi.fn(),
    });
    trySummaryLock.mockResolvedValue(true);
  });

  it("returns NO_ACTIVITY when no statements", async () => {
    getLatestSummary.mockResolvedValue(null);
    listDialogueByArea.mockResolvedValue([]);

    const result = await summarizeArea({ areaType: "region", region: "Alpha" });
    expect(result.ok).toBe(false);
  });

  it("summarizes and resets counters", async () => {
    getLatestSummary.mockResolvedValue(null);
    listDialogueByArea.mockResolvedValue([
      {
        id: "1",
        agent_id: "agent-1",
        statement: "Hello",
        created_at: new Date("2026-02-01T00:00:00Z"),
      },
    ]);
    summarize.mockResolvedValue({ summary: "Summary" });

    const result = await summarizeArea({ areaType: "region", region: "Alpha" });
    expect(result.ok).toBe(true);
    expect(upsertSummary).toHaveBeenCalled();
    expect(resetSummaryCounter).toHaveBeenCalled();
  });
});
