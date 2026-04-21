import type { MapConfig, FloorData } from './MapData';

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
