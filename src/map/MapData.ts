export interface TerritoryData {
  id: string;
  name: string;
  polygon: [number, number][];
  adjacencies: string[];
}

export interface FloorData {
  id: string;
  name: string;
  bonus: number;
  territories: TerritoryData[];
}

export interface MapConfig {
  name: string;
  floors: FloorData[];
}
