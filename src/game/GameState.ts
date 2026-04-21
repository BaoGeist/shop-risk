export type Phase = 'setup' | 'reinforce' | 'attack' | 'fortify';

export interface Player {
  id: number;
  name: string;
  color: number; // hex color for PixiJS
  cssColor: string; // CSS color string for DOM
}

export interface TerritoryState {
  ownerId: number;
  armies: number;
}

export interface GameState {
  players: Player[];
  territories: Map<string, TerritoryState>;
  adjacencies: Map<string, string[]>; // effective adjacencies (bridges through elevators)
  currentPlayerIndex: number;
  phase: Phase;
  armiesToPlace: number;
  selectedTerritoryId: string | null;
}
