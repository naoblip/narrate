import { WorldConfig } from "../config/validate";
import { pool } from "../db";
import { seedEventPool } from "../db/queries/events";

export async function seedEventsFromWorld(world: WorldConfig) {
  const client = await pool.connect();
  try {
    for (const region of world.regions) {
      for (const location of region.locations) {
        for (const place of location.places) {
          for (const event of place.random_events ?? []) {
            await seedEventPool(client, {
              region: region.name,
              location: location.name,
              place: place.name,
              eventId: event.id,
              eventText: event.text,
              weight: event.weight,
              cooldownSeconds: event.cooldown,
            });
          }
        }
      }
    }
  } finally {
    client.release();
  }
}
