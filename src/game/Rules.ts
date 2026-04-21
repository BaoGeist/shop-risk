import type { GameState } from './GameState';
import type { MapConfig } from '../map/MapData';

export function calculateReinforcements(
  state: GameState,
  map: MapConfig,
): number {
  const player = state.players[state.currentPlayerIndex];
  const ownedCount = [...state.territories.entries()].filter(
    ([_, t]) => t.ownerId === player.id,
  ).length;

  let armies = Math.max(3, Math.floor(ownedCount / 3));

  // Floor bonuses — control all territories on a floor
  for (const floor of map.floors) {
    const allOwned = floor.territories.every(
      (t) => state.territories.get(t.id)?.ownerId === player.id,
    );
    if (allOwned) armies += floor.bonus;
  }

  return armies;
}

export function getTerritoriesForPlayer(
  state: GameState,
  playerId: number,
): string[] {
  return [...state.territories.entries()]
    .filter(([_, t]) => t.ownerId === playerId)
    .map(([id]) => id);
}

export function getFloorsControlledBy(
  state: GameState,
  map: MapConfig,
  playerId: number,
): string[] {
  return map.floors
    .filter((floor) =>
      floor.territories.every(
        (t) => state.territories.get(t.id)?.ownerId === playerId,
      ),
    )
    .map((f) => f.id);
}
