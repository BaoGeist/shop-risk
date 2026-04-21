import type { GameState, Player } from '../game/GameState';
import type { MapConfig } from '../map/MapData';
import { getTerritoriesForPlayer, getFloorsControlledBy } from '../game/Rules';

export class HUD {
  private container: HTMLElement;
  private topBar: HTMLElement;
  private phaseControls: HTMLElement;
  private scoreboard: HTMLElement;
  private onEndPhase: (() => void) | null = null;

  constructor() {
    this.container = document.getElementById('hud')!;

    // Top bar
    this.topBar = document.createElement('div');
    this.topBar.id = 'top-bar';
    this.container.appendChild(this.topBar);

    // Phase controls (bottom center)
    this.phaseControls = document.createElement('div');
    this.phaseControls.id = 'phase-controls';
    this.container.appendChild(this.phaseControls);

    // Scoreboard (right side)
    this.scoreboard = document.createElement('div');
    this.scoreboard.id = 'scoreboard';
    this.container.appendChild(this.scoreboard);
  }

  setEndPhaseHandler(handler: () => void) {
    this.onEndPhase = handler;
  }

  update(state: GameState, map: MapConfig) {
    const player = state.players[state.currentPlayerIndex];

    // Top bar
    this.topBar.innerHTML = `
      <div class="player-indicator">
        <span class="player-dot" style="background: ${player.cssColor}"></span>
        <span class="player-name">${player.name}'s Turn</span>
      </div>
      <div class="phase-name">${this.phaseLabel(state)}</div>
    `;

    // Phase controls
    this.phaseControls.innerHTML = '';
    if (state.phase === 'reinforce') {
      this.phaseControls.innerHTML = `
        <div class="phase-info">Place armies: <strong>${state.armiesToPlace}</strong> remaining</div>
        <div class="phase-hint">Click your territories to reinforce</div>
      `;
    } else if (state.phase === 'attack') {
      const btn = document.createElement('button');
      btn.className = 'phase-btn';
      btn.textContent = 'Skip Attack → Fortify';
      btn.addEventListener('click', () => this.onEndPhase?.());
      this.phaseControls.appendChild(btn);
      const hint = document.createElement('div');
      hint.className = 'phase-hint';
      hint.textContent = 'Click your territory, then an adjacent enemy';
      this.phaseControls.appendChild(hint);
    } else if (state.phase === 'fortify') {
      const btn = document.createElement('button');
      btn.className = 'phase-btn';
      btn.textContent = 'End Turn';
      btn.addEventListener('click', () => this.onEndPhase?.());
      this.phaseControls.appendChild(btn);
      const hint = document.createElement('div');
      hint.className = 'phase-hint';
      hint.textContent = 'Move armies between adjacent territories, or end turn';
      this.phaseControls.appendChild(hint);
    }

    // Scoreboard
    this.scoreboard.innerHTML = '<div class="sb-title">Players</div>';
    for (const p of state.players) {
      const territories = getTerritoriesForPlayer(state, p.id);
      const floors = getFloorsControlledBy(state, map, p.id);
      const armies = territories.reduce(
        (sum, id) => sum + (state.territories.get(id)?.armies ?? 0),
        0,
      );
      const isActive = p.id === state.players[state.currentPlayerIndex].id;

      this.scoreboard.innerHTML += `
        <div class="sb-player ${isActive ? 'active' : ''} ${territories.length === 0 ? 'eliminated' : ''}">
          <span class="player-dot" style="background: ${p.cssColor}"></span>
          <span class="sb-name">${p.name}</span>
          <span class="sb-stats">${territories.length}T / ${armies}A${floors.length > 0 ? ` / ${floors.length}F` : ''}</span>
        </div>
      `;
    }
  }

  showVictory(winner: Player) {
    const overlay = document.createElement('div');
    overlay.id = 'victory-overlay';
    overlay.innerHTML = `
      <div class="victory-content">
        <h1 style="color: ${winner.cssColor}">${winner.name} Wins!</h1>
        <p>All territories conquered</p>
        <button onclick="location.reload()">Play Again</button>
      </div>
    `;
    this.container.appendChild(overlay);
  }

  private phaseLabel(state: GameState): string {
    switch (state.phase) {
      case 'reinforce':
        return `Reinforce (${state.armiesToPlace} left)`;
      case 'attack':
        return 'Attack';
      case 'fortify':
        return 'Fortify';
      default:
        return state.phase;
    }
  }
}
