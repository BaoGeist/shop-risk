import type { Player } from '../game/GameState';
import { rollDice } from '../game/Combat';

export interface DraftResult {
  turnOrder: Player[];
  picks: Map<number, string[]>; // playerId -> territoryIds
}

export class DraftScreen {
  private overlay: HTMLElement;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'draft-overlay';
    document.getElementById('hud')!.appendChild(this.overlay);
  }

  /** Roll for turn order — each player rolls, highest goes first */
  async rollForOrder(players: Player[]): Promise<Player[]> {
    return new Promise((resolve) => {
      this.overlay.style.display = 'flex';

      const rolls: { player: Player; roll: number }[] = players.map((p) => ({
        player: p,
        roll: rollDice(2).reduce((a, b) => a + b, 0), // 2d6
      }));

      // Sort descending by roll (random tiebreak)
      rolls.sort((a, b) => b.roll - a.roll || Math.random() - 0.5);

      this.overlay.innerHTML = `
        <div class="draft-content">
          <h2>🎲 Roll for Turn Order</h2>
          <div class="roll-results">
            ${rolls
              .map(
                (r, i) => `
              <div class="roll-row">
                <span class="roll-position">${i + 1}.</span>
                <span class="player-dot" style="background: ${r.player.cssColor}"></span>
                <span class="roll-name">${r.player.name}</span>
                <span class="roll-dice">${r.roll}</span>
              </div>
            `,
              )
              .join('')}
          </div>
          <p class="draft-hint">${rolls[0].player.name} goes first!</p>
          <button class="draft-btn" id="draft-continue">Continue to Draft</button>
        </div>
      `;

      this.overlay.querySelector('#draft-continue')!.addEventListener('click', () => {
        this.overlay.style.display = 'none';
        resolve(rolls.map((r) => r.player));
      });
    });
  }

  /** Show draft pick prompt */
  showPickPrompt(player: Player, pickNumber: number, totalPicks: number) {
    // Remove existing prompt if any
    const existing = document.getElementById('draft-prompt');
    if (existing) existing.remove();

    const prompt = document.createElement('div');
    prompt.id = 'draft-prompt';
    prompt.innerHTML = `
      <span class="player-dot" style="background: ${player.cssColor}"></span>
      <span>${player.name}: Pick a territory (${pickNumber}/${totalPicks})</span>
    `;
    document.getElementById('hud')!.appendChild(prompt);
  }

  hidePrompt() {
    const existing = document.getElementById('draft-prompt');
    if (existing) existing.remove();
  }

  remove() {
    this.overlay.remove();
    this.hidePrompt();
  }
}
