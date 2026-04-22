import type { AttackResult } from '../game/GameLoop';

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
const ROLL_DURATION = 800; // ms
const ROLL_INTERVAL = 50; // ms between face changes

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
          <span>⚔️ ${attackerArmies}</span>
          <span>🛡️ ${defenderArmies}</span>
        </div>
        <div class="dice-select">
          <label>How many dice?</label>
          <div class="dice-buttons" id="dice-buttons"></div>
        </div>
      `;

      const btnContainer = this.panel.querySelector('#dice-buttons')!;
      for (let i = 1; i <= maxDice; i++) {
        const btn = document.createElement('button');
        btn.className = 'dice-count-btn';
        btn.innerHTML = DICE_FACES.slice(0, i).join(' ');
        btn.title = `Roll ${i} dice`;
        btn.addEventListener('click', () => {
          this.overlay.style.display = 'none';
          resolve(i);
        });
        btnContainer.appendChild(btn);
      }

      const cancel = document.createElement('button');
      cancel.className = 'dice-cancel-btn';
      cancel.textContent = 'Retreat';
      cancel.addEventListener('click', () => {
        this.overlay.style.display = 'none';
        resolve(0);
      });
      this.panel.appendChild(cancel);

      this.overlay.style.display = 'flex';
    });
  }

  async showResult(result: AttackResult, captured: boolean): Promise<void> {
    this.overlay.style.display = 'flex';

    // Build the dice elements (start blank)
    const attackerDiceHtml = result.attackerDice
      .map((_, i) => `<span class="die attacker rolling" id="atk-die-${i}">${DICE_FACES[0]}</span>`)
      .join('');
    const defenderDiceHtml = result.defenderDice
      .map((_, i) => `<span class="die defender rolling" id="def-die-${i}">${DICE_FACES[0]}</span>`)
      .join('');

    this.panel.innerHTML = `
      <div class="dice-result">
        <div class="dice-row">
          <span class="dice-label">⚔️ Attack</span>
          ${attackerDiceHtml}
        </div>
        <div class="dice-row">
          <span class="dice-label">🛡️ Defend</span>
          ${defenderDiceHtml}
        </div>
        <div class="dice-outcome" id="dice-outcome" style="opacity: 0"></div>
      </div>
    `;

    // Animate rolling
    await this.animateRoll(result);

    // Show outcome
    await this.showOutcome(result, captured);

    // Wait for continue
    return new Promise((resolve) => {
      const btn = document.createElement('button');
      btn.className = 'dice-continue-btn';
      btn.textContent = captured ? '🏴 Claim Territory' : 'Continue';
      btn.addEventListener('click', () => {
        this.overlay.style.display = 'none';
        resolve();
      });
      this.panel.appendChild(btn);
      btn.focus();
    });
  }

  private animateRoll(result: AttackResult): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();

      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;

        // Randomize faces during roll
        for (let i = 0; i < result.attackerDice.length; i++) {
          const el = document.getElementById(`atk-die-${i}`);
          if (el) el.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
        }
        for (let i = 0; i < result.defenderDice.length; i++) {
          const el = document.getElementById(`def-die-${i}`);
          if (el) el.textContent = DICE_FACES[Math.floor(Math.random() * 6)];
        }

        if (elapsed >= ROLL_DURATION) {
          clearInterval(interval);

          // Land on final values with staggered timing
          result.attackerDice.forEach((val, i) => {
            setTimeout(() => {
              const el = document.getElementById(`atk-die-${i}`);
              if (el) {
                el.textContent = DICE_FACES[val - 1];
                el.classList.remove('rolling');
                el.classList.add('landed');
              }
            }, i * 120);
          });

          result.defenderDice.forEach((val, i) => {
            setTimeout(() => {
              const el = document.getElementById(`def-die-${i}`);
              if (el) {
                el.textContent = DICE_FACES[val - 1];
                el.classList.remove('rolling');
                el.classList.add('landed');
              }
            }, i * 120 + 200);
          });

          // Resolve after all dice have landed
          const totalDelay = Math.max(
            result.attackerDice.length * 120,
            result.defenderDice.length * 120 + 200,
          ) + 300;
          setTimeout(resolve, totalDelay);
        }
      }, ROLL_INTERVAL);
    });
  }

  private async showOutcome(result: AttackResult, captured: boolean): Promise<void> {
    // Highlight winning/losing dice pairs
    const pairs = Math.min(result.attackerDice.length, result.defenderDice.length);
    for (let i = 0; i < pairs; i++) {
      const atkEl = document.getElementById(`atk-die-${i}`);
      const defEl = document.getElementById(`def-die-${i}`);
      if (result.attackerDice[i] > result.defenderDice[i]) {
        atkEl?.classList.add('winner');
        defEl?.classList.add('loser');
      } else {
        atkEl?.classList.add('loser');
        defEl?.classList.add('winner');
      }
    }

    // Show outcome text
    const outcomeEl = document.getElementById('dice-outcome');
    if (outcomeEl) {
      let html = '';
      if (result.attackerLosses > 0) {
        html += `<div class="loss">⚔️ Attacker loses ${result.attackerLosses} ${result.attackerLosses === 1 ? 'army' : 'armies'}</div>`;
      }
      if (result.defenderLosses > 0) {
        html += `<div class="win">🛡️ Defender loses ${result.defenderLosses} ${result.defenderLosses === 1 ? 'army' : 'armies'}</div>`;
      }
      if (captured) {
        html += '<div class="capture">🏴 Territory Captured!</div>';
      }
      outcomeEl.innerHTML = html;
      outcomeEl.style.opacity = '1';
    }
  }
}
