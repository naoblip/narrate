import { validateWorldSchema } from "./schema";

export type WorldConfig = {
  regions: Array<{
    name: string;
    description: string;
    connected_to?: string[];
    locations: Array<{
      name: string;
      description: string;
      places: Array<{
        name: string;
        description: string;
        random_events?: Array<{
          id: string;
          text: string;
          weight: number;
          cooldown: number;
        }>;
      }>;
    }>;
  }>;
  character_options: {
    species: string[];
    traits: string[];
    inventory?: Record<string, string[]>;
  };
  starting_position: {
    region: string;
    location: string;
    place: string;
  };
};

export type ValidationIssue = {
  field: string;
  issue: string;
  expected?: string;
};

export function validateWorldConfig(config: unknown): {
  ok: boolean;
  issues: ValidationIssue[];
  value?: WorldConfig;
} {
  const issues: ValidationIssue[] = [];
  const valid = validateWorldSchema(config);

  if (!valid) {
    for (const err of validateWorldSchema.errors ?? []) {
      issues.push({
        field: err.instancePath || "(root)",
        issue: err.message || "Invalid value",
      });
    }
    return { ok: false, issues };
  }

  const world = config as WorldConfig;

  const nameSeen = new Set<string>();
  const regionNames = new Set<string>();

  for (const region of world.regions) {
    if (!region.name.trim()) {
      issues.push({ field: "regions.name", issue: "Region name must not be empty" });
    }
    if (region.name.includes(":")) {
      issues.push({ field: `regions.${region.name}`, issue: "Region name must not include ':'" });
    }
    if (regionNames.has(region.name)) {
      issues.push({ field: "regions.name", issue: `Duplicate region name '${region.name}'` });
    }
    regionNames.add(region.name);

    const locationNames = new Set<string>();
    for (const location of region.locations) {
      if (!location.name.trim()) {
        issues.push({ field: `regions.${region.name}.locations.name`, issue: "Location name must not be empty" });
      }
      if (location.name.includes(":")) {
        issues.push({ field: `regions.${region.name}.locations.${location.name}`, issue: "Location name must not include ':'" });
      }
      if (locationNames.has(location.name)) {
        issues.push({ field: `regions.${region.name}.locations.name`, issue: `Duplicate location name '${location.name}'` });
      }
      locationNames.add(location.name);

      const placeNames = new Set<string>();
      for (const place of location.places) {
        if (!place.name.trim()) {
          issues.push({ field: `regions.${region.name}.locations.${location.name}.places.name`, issue: "Place name must not be empty" });
        }
        if (place.name.includes(":")) {
          issues.push({ field: `regions.${region.name}.locations.${location.name}.places.${place.name}`, issue: "Place name must not include ':'" });
        }
        if (placeNames.has(place.name)) {
          issues.push({ field: `regions.${region.name}.locations.${location.name}.places.name`, issue: `Duplicate place name '${place.name}'` });
        }
        placeNames.add(place.name);

        for (const event of place.random_events ?? []) {
          if (!event.id.trim()) {
            issues.push({ field: `events.${place.name}.id`, issue: "Event id must not be empty" });
          }
          if (!event.text.trim()) {
            issues.push({ field: `events.${place.name}.text`, issue: "Event text must not be empty" });
          }
        }
      }
    }
  }

  for (const region of world.regions) {
    for (const connected of region.connected_to ?? []) {
      if (!regionNames.has(connected)) {
        issues.push({
          field: `regions.${region.name}.connected_to`,
          issue: `Unknown connected region '${connected}'`,
        });
      }
    }
  }

  const species = world.character_options.species ?? [];
  const traits = world.character_options.traits ?? [];
  const speciesSet = new Set<string>();
  const traitsSet = new Set<string>();

  for (const entry of species) {
    if (!entry.trim()) {
      issues.push({ field: "character_options.species", issue: "Species entries must not be empty" });
    }
    if (speciesSet.has(entry)) {
      issues.push({ field: "character_options.species", issue: `Duplicate species '${entry}'` });
    }
    speciesSet.add(entry);
  }

  for (const entry of traits) {
    if (!entry.trim()) {
      issues.push({ field: "character_options.traits", issue: "Trait entries must not be empty" });
    }
    if (traitsSet.has(entry)) {
      issues.push({ field: "character_options.traits", issue: `Duplicate trait '${entry}'` });
    }
    traitsSet.add(entry);
  }

  const inventory = world.character_options.inventory ?? {};
  for (const [slot, items] of Object.entries(inventory)) {
    if (slot !== slot.toLowerCase()) {
      issues.push({ field: `character_options.inventory.${slot}`, issue: "Inventory slots must be lower-case" });
    }
    const seen = new Set<string>();
    for (const item of items) {
      if (!item.trim()) {
        issues.push({ field: `character_options.inventory.${slot}`, issue: "Inventory items must not be empty" });
      }
      if (seen.has(item)) {
        issues.push({ field: `character_options.inventory.${slot}`, issue: `Duplicate item '${item}'` });
      }
      seen.add(item);
    }
  }

  const { region, location, place } = world.starting_position;
  const startRegion = world.regions.find((r) => r.name === region);
  if (!startRegion) {
    issues.push({ field: "starting_position.region", issue: `Unknown region '${region}'` });
  } else {
    const startLocation = startRegion.locations.find((l) => l.name === location);
    if (!startLocation) {
      issues.push({ field: "starting_position.location", issue: `Unknown location '${location}'` });
    } else if (!startLocation.places.some((p) => p.name === place)) {
      issues.push({ field: "starting_position.place", issue: `Unknown place '${place}'` });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  return { ok: true, issues: [], value: world };
}

export function inspectWorldConfig(world: WorldConfig) {
  const regionCount = world.regions.length;
  const locationCount = world.regions.reduce((acc, region) => acc + region.locations.length, 0);
  const placeCount = world.regions.reduce(
    (acc, region) => acc + region.locations.reduce((inner, loc) => inner + loc.places.length, 0),
    0
  );
  const eventCount = world.regions.reduce(
    (acc, region) =>
      acc +
      region.locations.reduce(
        (inner, loc) => inner + loc.places.reduce((sum, place) => sum + (place.random_events?.length ?? 0), 0),
        0
      ),
    0
  );

  return { regionCount, locationCount, placeCount, eventCount };
}
