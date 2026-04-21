import type { MapConfig } from '../map/MapData';
import type { GameState } from './GameState';
import { placeArmy, attack, skipAttack, fortify, skipFortify } from './GameLoop';
import { getAdjacencies } from '../map/MapLoader';
import { IsometricRenderer } from '../render/IsometricRenderer';
import { HUD } from '../ui/HUD';
import { DicePanel } from '../ui/DicePanel';
import { FloorSelector } from '../ui/FloorSelector';

export class GameController {
  private map: MapConfig;
  private state: GameState;
  private renderer: IsometricRenderer;
  private hud: HUD;
  private dicePanel: DicePanel;
  private floorSelector: FloorSelector;
  private selectedSource: string | null = null;
  private isProcessing = false; // prevent clicks during dice animation

  constructor(
    map: MapConfig,
    state: GameState,
    renderer: IsometricRenderer,
  ) {
    this.map = map;
    this.state = state;
    this.renderer = renderer;
    this.hud = new HUD();
    this.dicePanel = new DicePanel();
    this.floorSelector = new FloorSelector(map);

    // Wire up events
    this.renderer.setTerritoryClickHandler((id) => this.onTerritoryClick(id));
    this.hud.setEndPhaseHandler(() => this.onEndPhase());
    this.floorSelector.setHandler((index) => this.renderer.focusFloor(index));

    this.refresh();
  }

  private refresh() {
    this.renderer.update(this.state);
    this.hud.update(this.state, this.map);
    this.renderer.clearHighlights();
    this.renderer.selectTerritory(this.selectedSource);
  }

  private async onTerritoryClick(id: string) {
    if (this.isProcessing) return;

    const territory = this.state.territories.get(id)!;
    const currentPlayer = this.state.players[this.state.currentPlayerIndex];

    switch (this.state.phase) {
      case 'reinforce':
        this.handleReinforce(id, territory.ownerId, currentPlayer.id);
        break;
      case 'attack':
        await this.handleAttack(id, territory.ownerId, currentPlayer.id);
        break;
      case 'fortify':
        this.handleFortify(id, territory.ownerId, currentPlayer.id);
        break;
    }
  }

  private handleReinforce(
    id: string,
    ownerId: number,
    currentPlayerId: number,
  ) {
    if (ownerId !== currentPlayerId) return;
    if (this.state.armiesToPlace <= 0) return;

    this.state = placeArmy(this.state, id);
    this.selectedSource = null;
    this.refresh();
  }

  private async handleAttack(
    id: string,
    ownerId: number,
    currentPlayerId: number,
  ) {
    if (!this.selectedSource) {
      // Select source territory
      if (ownerId !== currentPlayerId) return;
      const territory = this.state.territories.get(id)!;
      if (territory.armies < 2) return; // need at least 2

      this.selectedSource = id;
      this.renderer.selectTerritory(id);

      // Highlight valid targets
      const adj = getAdjacencies(this.map, id);
      const validTargets = new Set(
        adj.filter((a) => {
          const t = this.state.territories.get(a);
          return t && t.ownerId !== currentPlayerId;
        }),
      );
      this.renderer.highlightTerritories(validTargets, 0xff4444);
    } else if (this.selectedSource === id) {
      // Deselect
      this.selectedSource = null;
      this.renderer.clearHighlights();
      this.renderer.selectTerritory(null);
    } else {
      // Attack target
      const adj = getAdjacencies(this.map, this.selectedSource);
      if (!adj.includes(id)) {
        // Clicked non-adjacent or own territory — reset selection
        this.selectedSource = null;
        this.renderer.clearHighlights();
        this.renderer.selectTerritory(null);
        // If it's our territory, start new selection
        if (ownerId === currentPlayerId) {
          this.handleAttack(id, ownerId, currentPlayerId);
        }
        return;
      }

      if (ownerId === currentPlayerId) return; // can't attack own

      const fromTerritory = this.state.territories.get(this.selectedSource)!;
      const toTerritory = this.state.territories.get(id)!;
      const fromData = this.findTerritoryData(this.selectedSource);
      const toData = this.findTerritoryData(id);

      this.isProcessing = true;

      // Show dice dialog
      const diceCount = await this.dicePanel.showAttackDialog(
        fromData?.name ?? this.selectedSource,
        toData?.name ?? id,
        fromTerritory.armies,
        toTerritory.armies,
        this.state.players[this.state.currentPlayerIndex].cssColor,
      );

      if (diceCount === 0) {
        // Cancelled
        this.isProcessing = false;
        this.selectedSource = null;
        this.refresh();
        return;
      }

      // Resolve combat
      const result = attack(this.state, this.map, this.selectedSource, id, diceCount);
      this.state = result.state;

      // Show result
      await this.dicePanel.showResult(result.result, result.result.captured);

      this.isProcessing = false;

      if (result.result.gameOver && result.result.winner) {
        this.hud.showVictory(result.result.winner);
        return;
      }

      this.selectedSource = null;
      this.refresh();
    }
  }

  private handleFortify(
    id: string,
    ownerId: number,
    currentPlayerId: number,
  ) {
    if (ownerId !== currentPlayerId) return;

    if (!this.selectedSource) {
      // Select source
      const territory = this.state.territories.get(id)!;
      if (territory.armies < 2) return;

      this.selectedSource = id;
      this.renderer.selectTerritory(id);

      // Highlight valid targets (adjacent own territories)
      const adj = getAdjacencies(this.map, id);
      const validTargets = new Set(
        adj.filter((a) => {
          const t = this.state.territories.get(a);
          return t && t.ownerId === currentPlayerId;
        }),
      );
      this.renderer.highlightTerritories(validTargets, 0x44ff44);
    } else if (this.selectedSource === id) {
      // Deselect
      this.selectedSource = null;
      this.renderer.clearHighlights();
      this.renderer.selectTerritory(null);
    } else {
      // Fortify to target
      const adj = getAdjacencies(this.map, this.selectedSource);
      if (!adj.includes(id)) {
        this.selectedSource = null;
        this.refresh();
        return;
      }

      const from = this.state.territories.get(this.selectedSource)!;
      const moveable = from.armies - 1;
      if (moveable < 1) return;

      // Move half (rounded up) for simplicity, or all if only 1
      const toMove = Math.ceil(moveable / 2);
      this.state = fortify(this.state, this.map, this.selectedSource, id, toMove);
      this.selectedSource = null;
      this.refresh();
    }
  }

  private onEndPhase() {
    if (this.state.phase === 'attack') {
      this.state = skipAttack(this.state);
    } else if (this.state.phase === 'fortify') {
      this.state = skipFortify(this.state, this.map);
    }
    this.selectedSource = null;
    this.refresh();
  }

  private findTerritoryData(id: string) {
    for (const floor of this.map.floors) {
      const t = floor.territories.find((t) => t.id === id);
      if (t) return t;
    }
    return null;
  }
}
