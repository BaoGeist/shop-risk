import type { AttackResult } from '../game/GameLoop';

export class DicePanel {
  private overlay: HTMLElement;
  private panel: HTMLElement;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'dice-overlay';
    this.overlay.style.display = 'none';
    document.getElementById('hud')!.appendChild(this.overlay);

    this.panel = document.createElement('div');
    this.panel.id = 'dice-panel';
    this.overlay.appendChild(this.panel);
  }

  async showAttackDialog(
    attackerName: string,
    defenderName: string,
    attackerArmies: number,
    defenderArmies: number,
    attackerColor: string,
  ): Promise<number> {
    return new Promise((resolve) => {
      const maxDice = Math.min(3, attackerArmies - 1);

      this.panel.innerHTML = `
        <div class="dice-header">
          <span style="color: ${attackerColor}; font-weight: bold">${attackerName}</span>
          <span class="dice-vs">⚔️</span>
          <span>${defenderName}</span>
        </div>
        <div class="dice-armies">
          <span>Attackers: ${attackerArmies}</span>
          <span>Defenders: ${defenderArmies}</span>
        </div>
        <div class="dice-select">
          <label>Dice to roll:</label>
          <div class="dice-buttons" id="dice-buttons"></div>
        </div>
      `;

      const btnContainer = this.panel.querySelector('#dice-buttons')!;
      for (let i = 1; i <= maxDice; i++) {
        const btn = document.createElement('button');
        btn.className = 'dice-count-btn';
        btn.textContent = `${i} 🎲`;
        btn.addEventListener('click', () => {
          this.overlay.style.display = 'none';
          resolve(i);
        });
        btnContainer.appendChild(btn);
      }

      // Cancel button
      const cancel = document.createElement('button');
      cancel.className = 'dice-cancel-btn';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', () => {
        this.overlay.style.display = 'none';
        resolve(0); // 0 = cancelled
      });
      this.panel.appendChild(cancel);

      this.overlay.style.display = 'flex';
    });
  }

  async showResult(result: AttackResult, captured: boolean): Promise<void> {
    return new Promise((resolve) => {
      this.panel.innerHTML = `
        <div class="dice-result">
          <div class="dice-row">
            <span class="dice-label">Attacker:</span>
            ${result.attackerDice.map((d) => `<span class="die attacker">${d}</span>`).join('')}
          </div>
          <div class="dice-row">
            <span class="dice-label">Defender:</span>
            ${result.defenderDice.map((d) => `<span class="die defender">${d}</span>`).join('')}
          </div>
          <div class="dice-outcome">
            ${result.attackerLosses > 0 ? `<div class="loss">Attacker loses ${result.attackerLosses}</div>` : ''}
            ${result.defenderLosses > 0 ? `<div class="win">Defender loses ${result.defenderLosses}</div>` : ''}
            ${captured ? '<div class="capture">🏴 Territory Captured!</div>' : ''}
          </div>
        </div>
      `;

      const btn = document.createElement('button');
      btn.className = 'dice-continue-btn';
      btn.textContent = 'Continue';
      btn.addEventListener('click', () => {
        this.overlay.style.display = 'none';
        resolve();
      });
      this.panel.appendChild(btn);

      this.overlay.style.display = 'flex';
    });
  }
}
