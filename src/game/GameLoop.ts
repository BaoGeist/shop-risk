import type { GameState, Player, TerritoryState } from './GameState';
import type { MapConfig } from '../map/MapData';
import { resolveCombat } from './Combat';
import { calculateReinforcements } from './Rules';
import { PLAYER_COLORS } from '../render/constants';
import { buildEffectiveAdjacencies } from '../map/MapLoader';

/** Helper to get adjacencies from state */
export function getEffectiveAdjacencies(state: GameState, id: string): string[] {
  return state.adjacencies.get(id) ?? [];
}

// ── Initialization ──────────────────────────────────────────────

export function createPlayers(count: number): Player[] {
  const names = ['Red', 'Blue', 'Green', 'Orange'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: names[i],
    color: PLAYER_COLORS[i].hex,
    cssColor: PLAYER_COLORS[i].css,
  }));
}

/** Neutral owner sentinel — no player owns this territory */
export const NEUTRAL_OWNER = -1;

/** Get all territory categories from a map */
export function categorizeTerritories(map: MapConfig) {
  const neutralIds: string[] = [];
  const claimableIds: string[] = [];
  for (const floor of map.floors) {
    for (const t of floor.territories) {
      if (t.passthrough) continue;
      else if (t.neutral) neutralIds.push(t.id);
      else claimableIds.push(t.id);
    }
  }
  return { neutralIds, claimableIds };
}

/** Create initial state for draft phase — no territories owned yet */
export function createDraftState(
  map: MapConfig,
  orderedPlayers: Player[],
): GameState {
  const { neutralIds } = categorizeTerritories(map);
  const adjacencies = buildEffectiveAdjacencies(map);
  const territories = new Map<string, TerritoryState>();

  // Neutral hallways get a small garrison
  for (const id of neutralIds) {
    territories.set(id, { ownerId: NEUTRAL_OWNER, armies: 2 });
  }

  // Claimable territories start unowned (NEUTRAL_OWNER with 0 armies)
  const { claimableIds } = categorizeTerritories(map);
  for (const id of claimableIds) {
    territories.set(id, { ownerId: NEUTRAL_OWNER, armies: 0 });
  }

  return {
    players: orderedPlayers,
    territories,
    adjacencies,
    currentPlayerIndex: 0,
    phase: 'setup',
    armiesToPlace: 0,
    selectedTerritoryId: null,
  };
}

/** Claim a territory during draft — sets owner and gives 1 army */
export function draftPick(
  state: GameState,
  territoryId: string,
  playerId: number,
): GameState {
  const territory = state.territories.get(territoryId);
  if (!territory) throw new Error(`Unknown territory: ${territoryId}`);
  if (territory.ownerId !== NEUTRAL_OWNER || territory.armies !== 0) {
    throw new Error('Territory already claimed');
  }
  const newTerritories = new Map(state.territories);
  newTerritories.set(territoryId, { ownerId: playerId, armies: 3 });
  return { ...state, territories: newTerritories };
}

/** Transition from draft to first player's reinforce phase */
export function startGame(state: GameState, map: MapConfig): GameState {
  // Remaining unclaimed rooms become neutral with garrison
  const newTerritories = new Map(state.territories);
  for (const [id, t] of newTerritories) {
    if (t.ownerId === NEUTRAL_OWNER && t.armies === 0) {
      newTerritories.set(id, { ownerId: NEUTRAL_OWNER, armies: 2 });
    }
  }

  const newState: GameState = {
    ...state,
    territories: newTerritories,
    currentPlayerIndex: 0,
    phase: 'reinforce',
    armiesToPlace: 0,
    selectedTerritoryId: null,
  };

  return {
    ...newState,
    armiesToPlace: calculateReinforcements(newState, map),
  };
}

// ── Phase Actions ───────────────────────────────────────────────

export interface AttackResult {
  captured: boolean;
  attackerDice: number[];
  defenderDice: number[];
  attackerLosses: number;
  defenderLosses: number;
  gameOver: boolean;
  winner: Player | null;
}

export function placeArmy(state: GameState, territoryId: string): GameState {
  const territory = state.territories.get(territoryId);
  if (!territory) throw new Error(`Unknown territory: ${territoryId}`);
  if (territory.ownerId !== state.players[state.currentPlayerIndex].id) {
    throw new Error('Cannot place army on enemy territory');
  }
  if (state.phase !== 'reinforce' || state.armiesToPlace <= 0) {
    throw new Error('Cannot place army in current phase');
  }

  const newTerritories = new Map(state.territories);
  newTerritories.set(territoryId, {
    ...territory,
    armies: territory.armies + 1,
  });

  const armiesToPlace = state.armiesToPlace - 1;
  return {
    ...state,
    territories: newTerritories,
    armiesToPlace,
    phase: armiesToPlace === 0 ? 'attack' : 'reinforce',
  };
}

export function attack(
  state: GameState,
  _map: MapConfig,
  fromId: string,
  toId: string,
  diceCount: number,
): { state: GameState; result: AttackResult } {
  if (state.phase !== 'attack') throw new Error('Not in attack phase');

  const from = state.territories.get(fromId)!;
  const to = state.territories.get(toId)!;
  const currentPlayer = state.players[state.currentPlayerIndex];

  if (from.ownerId !== currentPlayer.id) throw new Error('Not your territory');
  if (to.ownerId === currentPlayer.id) throw new Error('Cannot attack own territory');
  if (from.armies < 2) throw new Error('Need at least 2 armies to attack');
  if (diceCount > from.armies - 1) throw new Error('Too many dice');
  if (diceCount < 1 || diceCount > 3) throw new Error('Invalid dice count');

  // Check adjacency (using effective adjacencies that bridge through elevators)
  const adj = state.adjacencies.get(fromId) ?? [];
  if (!adj.includes(toId)) throw new Error('Territories not adjacent');

  const defenderDiceCount = Math.min(2, to.armies);
  const combat = resolveCombat(diceCount, defenderDiceCount);

  const newTerritories = new Map(state.territories);
  const newFrom = { ...from, armies: from.armies - combat.attackerLosses };
  const newTo = { ...to, armies: to.armies - combat.defenderLosses };

  let captured = false;
  if (newTo.armies <= 0) {
    // Capture territory
    captured = true;
    const movedArmies = diceCount; // move in at least dice count
    newFrom.armies -= movedArmies;
    newTo.ownerId = currentPlayer.id;
    newTo.armies = movedArmies;
  }

  newTerritories.set(fromId, newFrom);
  newTerritories.set(toId, newTo);

  // Check win condition
  const allOwned = [...newTerritories.values()].every(
    (t) => t.ownerId === currentPlayer.id,
  );

  return {
    state: { ...state, territories: newTerritories },
    result: {
      captured,
      attackerDice: combat.attackerDice,
      defenderDice: combat.defenderDice,
      attackerLosses: combat.attackerLosses,
      defenderLosses: combat.defenderLosses,
      gameOver: allOwned,
      winner: allOwned ? currentPlayer : null,
    },
  };
}

export function skipAttack(state: GameState): GameState {
  if (state.phase !== 'attack') throw new Error('Not in attack phase');
  return { ...state, phase: 'fortify', selectedTerritoryId: null };
}

export function fortify(
  state: GameState,
  _map: MapConfig,
  fromId: string,
  toId: string,
  armyCount: number,
): GameState {
  if (state.phase !== 'fortify') throw new Error('Not in fortify phase');

  const from = state.territories.get(fromId)!;
  const to = state.territories.get(toId)!;
  const currentPlayer = state.players[state.currentPlayerIndex];

  if (from.ownerId !== currentPlayer.id || to.ownerId !== currentPlayer.id) {
    throw new Error('Both territories must be owned by you');
  }
  if (armyCount >= from.armies) throw new Error('Must leave at least 1 army');
  if (armyCount < 1) throw new Error('Must move at least 1 army');

  const adj = state.adjacencies.get(fromId) ?? [];
  if (!adj.includes(toId)) throw new Error('Territories not adjacent');

  const newTerritories = new Map(state.territories);
  newTerritories.set(fromId, { ...from, armies: from.armies - armyCount });
  newTerritories.set(toId, { ...to, armies: to.armies + armyCount });

  return advanceTurn({ ...state, territories: newTerritories }, _map);
}

export function skipFortify(state: GameState, map: MapConfig): GameState {
  if (state.phase !== 'fortify') throw new Error('Not in fortify phase');
  return advanceTurn(state, map);

}

function advanceTurn(state: GameState, map: MapConfig): GameState {
  // Skip eliminated players
  let nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
  let attempts = 0;
  while (attempts < state.players.length) {
    const nextPlayer = state.players[nextIndex];
    const hasTerritory = [...state.territories.values()].some(
      (t) => t.ownerId === nextPlayer.id,
    );
    if (hasTerritory) break;
    nextIndex = (nextIndex + 1) % state.players.length;
    attempts++;
  }

  const tempState: GameState = {
    ...state,
    currentPlayerIndex: nextIndex,
    phase: 'reinforce',
    armiesToPlace: 0,
    selectedTerritoryId: null,
  };

  return {
    ...tempState,
    armiesToPlace: calculateReinforcements(tempState, map),
  };
}
