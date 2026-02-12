export type WorldDiff = {
  regions: { added: string[]; removed: string[] };
  locations: { added: string[]; removed: string[] };
  places: { added: string[]; removed: string[] };
  events: { added: string[]; removed: string[] };
};

export function diffWorlds(oldWorld: any, newWorld: any): WorldDiff {
  const diff: WorldDiff = {
    regions: { added: [], removed: [] },
    locations: { added: [], removed: [] },
    places: { added: [], removed: [] },
    events: { added: [], removed: [] },
  };

  const oldRegions = new Set(oldWorld.regions.map((r: any) => r.name));
  const newRegions = new Set(newWorld.regions.map((r: any) => r.name));
  for (const r of newRegions) if (!oldRegions.has(r)) diff.regions.added.push(r);
  for (const r of oldRegions) if (!newRegions.has(r)) diff.regions.removed.push(r);

  const oldLocations = new Set<string>();
  const newLocations = new Set<string>();
  const oldPlaces = new Set<string>();
  const newPlaces = new Set<string>();
  const oldEvents = new Set<string>();
  const newEvents = new Set<string>();

  for (const region of oldWorld.regions) {
    for (const location of region.locations) {
      oldLocations.add(`${region.name}/${location.name}`);
      for (const place of location.places) {
        oldPlaces.add(`${region.name}/${location.name}/${place.name}`);
        for (const evt of place.random_events ?? []) {
          oldEvents.add(`${region.name}/${location.name}/${place.name}:${evt.id}`);
        }
      }
    }
  }

  for (const region of newWorld.regions) {
    for (const location of region.locations) {
      newLocations.add(`${region.name}/${location.name}`);
      for (const place of location.places) {
        newPlaces.add(`${region.name}/${location.name}/${place.name}`);
        for (const evt of place.random_events ?? []) {
          newEvents.add(`${region.name}/${location.name}/${place.name}:${evt.id}`);
        }
      }
    }
  }

  for (const loc of newLocations) if (!oldLocations.has(loc)) diff.locations.added.push(loc);
  for (const loc of oldLocations) if (!newLocations.has(loc)) diff.locations.removed.push(loc);

  for (const place of newPlaces) if (!oldPlaces.has(place)) diff.places.added.push(place);
  for (const place of oldPlaces) if (!newPlaces.has(place)) diff.places.removed.push(place);

  for (const evt of newEvents) if (!oldEvents.has(evt)) diff.events.added.push(evt);
  for (const evt of oldEvents) if (!newEvents.has(evt)) diff.events.removed.push(evt);

  return diff;
}
