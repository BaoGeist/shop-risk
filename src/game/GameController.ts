import type { MapConfig } from '../map/MapData';
import type { GameState } from './GameState';
import {
  NEUTRAL_OWNER,
  placeArmy,
  attack,
  skipAttack,
  fortify,
  skipFortify,
  draftPick,
  startGame,
  getEffectiveAdjacencies,
  categorizeTerritories,
} from './GameLoop';
import { IsometricRenderer } from '../render/IsometricRenderer';
import { HUD } from '../ui/HUD';
import { DicePanel } from '../ui/DicePanel';
import { FloorSelector } from '../ui/FloorSelector';
import { DraftScreen } from '../ui/DraftScreen';

const PICKS_PER_PLAYER = 5;

export class GameController {
  private map: MapConfig;
  private state: GameState;
  private renderer: IsometricRenderer;
  private hud: HUD;
  private dicePanel: DicePanel;
  private floorSelector: FloorSelector;
  private draftScreen: DraftScreen;
  private selectedSource: string | null = null;
  private isProcessing = false;

  // Draft state
  private isDrafting = false;
  private draftPlayerIndex = 0;
  private draftPickCount = 0;

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
    this.draftScreen = new DraftScreen();

    this.renderer.setTerritoryClickHandler((id) => this.onTerritoryClick(id));
    this.hud.setEndPhaseHandler(() => this.onEndPhase());
    this.floorSelector.setHandler((index) => this.renderer.focusFloor(index));

    // Kick off: roll for order → draft → play
    this.rollThenDraft();
  }

  private async rollThenDraft() {
    // Roll for turn order
    const orderedPlayers = await this.draftScreen.rollForOrder(this.state.players);
    this.state = { ...this.state, players: orderedPlayers };

    // Start draft
    this.isDrafting = true;
    this.draftPlayerIndex = 0;
    this.draftPickCount = 0;

    // Highlight claimable territories
    const { claimableIds } = categorizeTerritories(this.map);
    const claimable = new Set(
      claimableIds.filter((id) => {
        const t = this.state.territories.get(id);
        return t && t.ownerId === NEUTRAL_OWNER && t.armies === 0;
      }),
    );
    this.renderer.highlightTerritories(claimable, 0xffffff);

    this.showDraftPrompt();
    this.renderer.update(this.state);
    this.hud.update(this.state, this.map);
  }

  private showDraftPrompt() {
    const player = this.state.players[this.draftPlayerIndex];
    this.draftScreen.showPickPrompt(player, this.draftPickCount + 1, PICKS_PER_PLAYER);
  }

  private handleDraftClick(id: string) {
    const territory = this.state.territories.get(id);
    if (!territory) return;
    // Only allow picking unclaimed rooms (not hallways, not already claimed)
    if (territory.ownerId !== NEUTRAL_OWNER || territory.armies !== 0) return;

    const player = this.state.players[this.draftPlayerIndex];
    this.state = draftPick(this.state, id, player.id);
    this.draftPickCount++;

    this.renderer.update(this.state);
    this.renderer.clearHighlights();

    if (this.draftPickCount >= PICKS_PER_PLAYER) {
      // Move to next player
      this.draftPickCount = 0;
      this.draftPlayerIndex++;

      if (this.draftPlayerIndex >= this.state.players.length) {
        // Draft complete — start game
        this.isDrafting = false;
        this.draftScreen.remove();
        this.state = startGame(this.state, this.map);
        this.refresh();
        return;
      }
    }

    // Highlight remaining claimable
    const { claimableIds } = categorizeTerritories(this.map);
    const remaining = new Set(
      claimableIds.filter((cid) => {
        const t = this.state.territories.get(cid);
        return t && t.ownerId === NEUTRAL_OWNER && t.armies === 0;
      }),
    );
    this.renderer.highlightTerritories(remaining, 0xffffff);
    this.showDraftPrompt();
  }

  private refresh() {
    this.renderer.update(this.state);
    this.hud.update(this.state, this.map);
    this.renderer.clearHighlights();
    this.renderer.selectTerritory(this.selectedSource);
  }

  private async onTerritoryClick(id: string) {
    if (this.isProcessing) return;

    if (this.isDrafting) {
      this.handleDraftClick(id);
      return;
    }

    const territory = this.state.territories.get(id);
    if (!territory) return;
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
      if (ownerId !== currentPlayerId) return;
      const territory = this.state.territories.get(id)!;
      if (territory.armies < 2) return;

      this.selectedSource = id;
      this.renderer.selectTerritory(id);

      const adj = getEffectiveAdjacencies(this.state, id);
      const validTargets = new Set(
        adj.filter((a) => {
          const t = this.state.territories.get(a);
          return t && t.ownerId !== currentPlayerId;
        }),
      );
      this.renderer.highlightTerritories(validTargets, 0xff4444);
    } else if (this.selectedSource === id) {
      this.selectedSource = null;
      this.renderer.clearHighlights();
      this.renderer.selectTerritory(null);
    } else {
      const adj = getEffectiveAdjacencies(this.state, this.selectedSource);
      if (!adj.includes(id)) {
        this.selectedSource = null;
        this.renderer.clearHighlights();
        this.renderer.selectTerritory(null);
        if (ownerId === currentPlayerId) {
          this.handleAttack(id, ownerId, currentPlayerId);
        }
        return;
      }

      if (ownerId === currentPlayerId) return;

      const fromTerritory = this.state.territories.get(this.selectedSource)!;
      const toTerritory = this.state.territories.get(id)!;
      const fromData = this.findTerritoryData(this.selectedSource);
      const toData = this.findTerritoryData(id);

      this.isProcessing = true;

      const diceCount = await this.dicePanel.showAttackDialog(
        fromData?.name ?? this.selectedSource,
        toData?.name ?? id,
        fromTerritory.armies,
        toTerritory.armies,
        this.state.players[this.state.currentPlayerIndex].cssColor,
      );

      if (diceCount === 0) {
        this.isProcessing = false;
        this.selectedSource = null;
        this.refresh();
        return;
      }

      const result = attack(this.state, this.map, this.selectedSource, id, diceCount);
      this.state = result.state;

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
      const territory = this.state.territories.get(id)!;
      if (territory.armies < 2) return;

      this.selectedSource = id;
      this.renderer.selectTerritory(id);

      const adj = getEffectiveAdjacencies(this.state, id);
      const validTargets = new Set(
        adj.filter((a) => {
          const t = this.state.territories.get(a);
          return t && t.ownerId === currentPlayerId;
        }),
      );
      this.renderer.highlightTerritories(validTargets, 0x44ff44);
    } else if (this.selectedSource === id) {
      this.selectedSource = null;
      this.renderer.clearHighlights();
      this.renderer.selectTerritory(null);
    } else {
      const adj = getEffectiveAdjacencies(this.state, this.selectedSource);
      if (!adj.includes(id)) {
        this.selectedSource = null;
        this.refresh();
        return;
      }

      const from = this.state.territories.get(this.selectedSource)!;
      const moveable = from.armies - 1;
      if (moveable < 1) return;

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
