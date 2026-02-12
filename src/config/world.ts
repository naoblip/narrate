import { WorldConfig } from "./validate";

export function buildAdjacency(world: WorldConfig): Map<string, Set<string>> {
  const adjacency = new Map<string, Set<string>>();
  for (const region of world.regions) {
    if (!adjacency.has(region.name)) {
      adjacency.set(region.name, new Set());
    }
    for (const connected of region.connected_to ?? []) {
      adjacency.get(region.name)?.add(connected);
    }
  }
  // Symmetrize
  for (const [region, neighbors] of adjacency) {
    for (const neighbor of neighbors) {
      if (!adjacency.has(neighbor)) {
        adjacency.set(neighbor, new Set());
      }
      adjacency.get(neighbor)?.add(region);
    }
  }
  return adjacency;
}

export function findWorldName(world: WorldConfig): string {
  return world.regions[0]?.name ?? "Unknown";
}
