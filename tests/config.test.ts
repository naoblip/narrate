import { describe, expect, it } from "vitest";
import { validateWorldConfig } from "../src/config/validate";
import { minimalWorld } from "./helpers";

const validWorld = minimalWorld();

describe("validateWorldConfig", () => {
  it("accepts a valid world", () => {
    const result = validateWorldConfig(validWorld);
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
  });

  it("rejects duplicate region names", () => {
    const world = minimalWorld();
    world.regions.push({
      name: "Alpha",
      description: "Dup",
      connected_to: [],
      locations: [
        {
          name: "Other",
          description: "Other",
          places: [{ name: "Spot", description: "Spot" }],
        },
      ],
    });

    const result = validateWorldConfig(world);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.issue.includes("Duplicate region"))).toBe(true);
  });

  it("rejects invalid connected_to region", () => {
    const world = minimalWorld();
    world.regions[0].connected_to = ["Missing"];
    const result = validateWorldConfig(world);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.issue.includes("Unknown connected region"))).toBe(true);
  });

  it("rejects invalid starting position", () => {
    const world = minimalWorld();
    world.starting_position.place = "Nowhere";
    const result = validateWorldConfig(world);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.field.includes("starting_position.place"))).toBe(true);
  });

  it("rejects names containing ':'", () => {
    const world = minimalWorld();
    world.regions[0].locations[0].places[0].name = "Bad:Name";
    const result = validateWorldConfig(world);
    expect(result.ok).toBe(false);
    expect(result.issues.some((issue) => issue.issue.includes("must not include ':'"))).toBe(true);
  });
});
