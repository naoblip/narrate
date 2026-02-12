import { pool } from "../db";
import { summarize } from "../llm";
import { listDialogueByArea } from "../db/queries/activity";
import { getLatestSummary, getSummaryCounters, getCounter, resetSummaryCounter, upsertSummary } from "../db/queries/summaries";
import { trySummaryLock, releaseSummaryLock } from "../db/advisoryLocks";

export type AreaParams = {
  areaType: "region" | "location" | "place";
  region: string;
  location?: string | null;
  place?: string | null;
};

function summaryThreshold() {
  return Number(process.env.SUMMARY_TRIGGER_THRESHOLD || 25);
}

function summaryMaxHistory() {
  return Number(process.env.SUMMARY_MAX_HISTORY || 5);
}

function summaryStaleDays() {
  return Number(process.env.SUMMARY_STALE_DAYS || 2);
}

export async function summarizeArea(params: AreaParams) {
  const client = await pool.connect();
  let locked = false;
  try {
    locked = await trySummaryLock(client, params);
    if (!locked) {
      return { ok: false as const, reason: "LOCKED" };
    }

    const latest = await getLatestSummary(client, params);
    const since = latest?.generated_at ?? null;

    const statements = await listDialogueByArea(client, {
      ...params,
      since,
      limit: 200,
    });

    if (statements.length === 0) {
      return { ok: false as const, reason: "NO_ACTIVITY" };
    }

    const promptInput = {
      areaType: params.areaType,
      region: params.region,
      location: params.location ?? null,
      place: params.place ?? null,
      statements: statements.map((row) => ({ statement: row.statement, agentId: row.agent_id })),
    } as const;

    const result = await summarize(promptInput);

    const historyEntries: Array<{ summary: string; generated_at: string }> = Array.isArray(latest?.history)
      ? (latest?.history as Array<{ summary: string; generated_at: string }>)
      : typeof latest?.history === "string"
        ? safeJsonArray(latest.history)
        : [];

    if (latest?.summary) {
      historyEntries.unshift({ summary: latest.summary, generated_at: latest.generated_at.toISOString() });
    }

    const maxHistory = summaryMaxHistory();
    const trimmedHistory = historyEntries.slice(0, maxHistory);

    await upsertSummary(client, {
      ...params,
      summary: result.summary,
      activityCount: statements.length,
      sourceStatements: statements.map((row) => row.id),
      history: trimmedHistory,
    });

    await resetSummaryCounter(client, params);

    return { ok: true as const, summary: result.summary };
  } finally {
    if (locked) {
      try {
        await releaseSummaryLock(client, params);
      } catch {
        // ignore
      }
    }
    client.release();
  }
}

export async function maybeTriggerSummary(params: AreaParams) {
  const counter = await getCounter(pool, params);
  if (!counter) return { ok: false as const, reason: "NO_COUNTER" };
  if (counter.statements_since_summary < summaryThreshold()) {
    return { ok: false as const, reason: "BELOW_THRESHOLD" };
  }
  return summarizeArea(params);
}

export async function queueSummaryChecks(region: string, location: string, place: string) {
  setImmediate(() => {
    maybeTriggerSummary({ areaType: "place", region, location, place }).catch(() => undefined);
    maybeTriggerSummary({ areaType: "location", region, location }).catch(() => undefined);
    maybeTriggerSummary({ areaType: "region", region }).catch(() => undefined);
  });
}

export function startSummaryCleanupCron() {
  const intervalMs = parseInterval(process.env.SUMMARY_CLEANUP_INTERVAL || "15m");
  if (!intervalMs) return;

  setInterval(async () => {
    try {
      const counters = await getSummaryCounters(pool);
      const staleCutoff = Date.now() - summaryStaleDays() * 24 * 60 * 60 * 1000;

      for (const counter of counters) {
        if (counter.statements_since_summary <= 0) continue;

        const latest = await getLatestSummary(pool, {
          areaType: counter.area_type,
          region: counter.region,
          location: counter.location,
          place: counter.place,
        });

        const lastGenerated = latest?.generated_at?.getTime() ?? 0;
        if (lastGenerated < staleCutoff) {
          await summarizeArea({
            areaType: counter.area_type,
            region: counter.region,
            location: counter.location,
            place: counter.place,
          });
        }
      }
    } catch (err) {
      console.error("Summary cleanup cron failed:", err);
    }
  }, intervalMs).unref();
}

function parseInterval(value: string) {
  const match = value.trim().match(/^(\d+)(s|m|h)$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  switch (match[2]) {
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    default:
      return null;
  }
}

function safeJsonArray(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
