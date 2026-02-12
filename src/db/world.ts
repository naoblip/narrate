import { PoolClient } from "pg";
import { WorldConfig } from "../config/validate";

export async function initializeCounters(client: PoolClient, world: WorldConfig) {
  for (const region of world.regions) {
    await client.query(
      `INSERT INTO area_counters (area_type, region, statements_since_summary, statements_since_event)
       VALUES ('region', $1, 0, 0)
       ON CONFLICT DO NOTHING`,
      [region.name]
    );

    for (const location of region.locations) {
      await client.query(
        `INSERT INTO area_counters (area_type, region, location, statements_since_summary, statements_since_event)
         VALUES ('location', $1, $2, 0, 0)
         ON CONFLICT DO NOTHING`,
        [region.name, location.name]
      );

      for (const place of location.places) {
        await client.query(
          `INSERT INTO area_counters (area_type, region, location, place, statements_since_summary, statements_since_event)
           VALUES ('place', $1, $2, $3, 0, 0)
           ON CONFLICT DO NOTHING`,
          [region.name, location.name, place.name]
        );
      }
    }
  }
}
