export class StartScreen {
  private overlay: HTMLElement;

  constructor() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'start-overlay';
    document.getElementById('hud')!.appendChild(this.overlay);
  }

  async show(): Promise<number> {
    return new Promise((resolve) => {
      this.overlay.innerHTML = `
        <div class="start-content">
          <h1 class="start-title">🏢 Shop Risk</h1>
          <p class="start-subtitle">Conquer the office, floor by floor</p>
          <div class="start-players">
            <label>Players:</label>
            <div class="player-btns">
              <button class="player-count-btn" data-count="2">2 Players</button>
              <button class="player-count-btn" data-count="3">3 Players</button>
              <button class="player-count-btn selected" data-count="4">4 Players</button>
            </div>
          </div>
          <button class="start-btn" id="start-game-btn">Start Game</button>
        </div>
      `;

      let selectedCount = 4;

      // Player count buttons
      const countBtns = this.overlay.querySelectorAll('.player-count-btn');
      countBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          countBtns.forEach((b) => b.classList.remove('selected'));
          btn.classList.add('selected');
          selectedCount = parseInt((btn as HTMLElement).dataset.count!);
        });
      });

      // Start button
      this.overlay.querySelector('#start-game-btn')!.addEventListener('click', () => {
        this.overlay.remove();
        resolve(selectedCount);
      });
    });
  }
}
