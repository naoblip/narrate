import { describe, expect, it } from "vitest";
import { diffWorlds } from "../src/utils/worldDiff";
import { minimalWorld } from "./helpers";


describe("world diff", () => {
  it("detects added regions/locations/places/events", () => {
    const oldWorld = minimalWorld();
    const newWorld = minimalWorld();

    newWorld.regions.push({
      name: "NewRegion",
      description: "New",
      connected_to: [],
      locations: [
        {
          name: "NewLoc",
          description: "New",
          places: [
            {
              name: "NewPlace",
              description: "New",
              random_events: [{ id: "evt_new", text: "Event", weight: 1, cooldown: 0 }],
            },
          ],
        },
      ],
    });

    const diff = diffWorlds(oldWorld, newWorld);

    expect(diff.regions.added).toContain("NewRegion");
    expect(diff.locations.added).toContain("NewRegion/NewLoc");
    expect(diff.places.added).toContain("NewRegion/NewLoc/NewPlace");
    expect(diff.events.added[0]).toContain("evt_new");
  });
});
