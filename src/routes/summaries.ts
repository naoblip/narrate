import type { Router } from "express";
import { pool } from "../db";
import { getLatestSummary } from "../db/queries/summaries";

export function registerSummaryRoutes(router: Router) {
  router.get("/api/places/:region/:location/:place/summary", async (req, res) => {
    const summary = await getLatestSummary(pool, {
      areaType: "place",
      region: req.params.region,
      location: req.params.location,
      place: req.params.place,
    });
    res.json({ summary: summary ? formatSummary(summary) : null });
  });

  router.get("/api/locations/:region/:location/summary", async (req, res) => {
    const summary = await getLatestSummary(pool, {
      areaType: "location",
      region: req.params.region,
      location: req.params.location,
    });
    res.json({ summary: summary ? formatSummary(summary) : null });
  });

  router.get("/api/regions/:region/summary", async (req, res) => {
    const summary = await getLatestSummary(pool, {
      areaType: "region",
      region: req.params.region,
    });
    res.json({ summary: summary ? formatSummary(summary) : null });
  });
}

function formatSummary(summary: { summary: string; generated_at: Date; activity_count: number; source_statements: unknown }) {
  return {
    summary: summary.summary,
    generated_at: summary.generated_at.toISOString(),
    activity_count: summary.activity_count,
    source_statements: summary.source_statements,
  };
}
