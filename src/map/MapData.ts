export interface TerritoryData {
  id: string;
  name: string;
  polygon: [number, number][];
  adjacencies: string[];
  neutral?: boolean; // hallways/corridors — unowned at start
  passthrough?: boolean; // elevators — can't be owned, just connects adjacencies
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
