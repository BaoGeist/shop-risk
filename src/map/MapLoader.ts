import type { MapConfig, FloorData, TerritoryData } from './MapData';

export async function loadMap(url: string): Promise<MapConfig> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load map: ${resp.statusText}`);
  return resp.json() as Promise<MapConfig>;
}

export function getAllTerritoryIds(map: MapConfig): string[] {
  return map.floors.flatMap((f) => f.territories.map((t) => t.id));
}

export function getAdjacencies(
  map: MapConfig,
  territoryId: string,
): string[] {
  for (const floor of map.floors) {
    const territory = floor.territories.find((t) => t.id === territoryId);
    if (territory) return territory.adjacencies;
  }
  return [];
}

export function getFloorForTerritory(
  map: MapConfig,
  territoryId: string,
): FloorData | undefined {
  return map.floors.find((f) =>
    f.territories.some((t) => t.id === territoryId),
  );
}

export function findTerritory(
  map: MapConfig,
  territoryId: string,
): TerritoryData | undefined {
  for (const floor of map.floors) {
    const t = floor.territories.find((t) => t.id === territoryId);
    if (t) return t;
  }
  return undefined;
}

/**
 * Build effective adjacency map that bridges through passthrough territories.
 * If A → elevator → B, then A and B become effectively adjacent.
 */
export function buildEffectiveAdjacencies(
  map: MapConfig,
): Map<string, string[]> {
  const effective = new Map<string, string[]>();
  const allTerritories: TerritoryData[] = map.floors.flatMap((f) => f.territories);
  const passthroughIds = new Set(
    allTerritories.filter((t) => t.passthrough).map((t) => t.id),
  );

  for (const t of allTerritories) {
    if (t.passthrough) continue; // passthroughs don't appear in game state

    const adj = new Set<string>();
    for (const neighborId of t.adjacencies) {
      if (passthroughIds.has(neighborId)) {
        // Bridge through passthrough — add all non-passthrough neighbors of the passthrough
        const passthrough = allTerritories.find((pt) => pt.id === neighborId);
        if (passthrough) {
          for (const bridgedId of passthrough.adjacencies) {
            if (bridgedId !== t.id && !passthroughIds.has(bridgedId)) {
              adj.add(bridgedId);
            }
          }
        }
      } else {
        adj.add(neighborId);
      }
    }
    effective.set(t.id, [...adj]);
  }

  return effective;
}
