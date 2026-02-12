import type { Router } from "express";
import { WorldConfig } from "../config/validate";

export function registerWorldRoutes(router: Router, world: WorldConfig) {
  router.get("/api/world", (_req, res) => {
    res.json({
      world: world.regions.map((region) => ({
        name: region.name,
        description: region.description,
        connected_to: region.connected_to ?? [],
        locations: region.locations.map((location) => ({
          name: location.name,
          description: location.description,
          places: location.places.map((place) => ({
            name: place.name,
            description: place.description,
          })),
        })),
      })),
      character_options: world.character_options,
      starting_position: world.starting_position,
    });
  });
}
