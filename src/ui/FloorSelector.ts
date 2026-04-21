import type { MapConfig } from '../map/MapData';

export class FloorSelector {
  private container: HTMLElement;
  private onFloorSelect: ((index: number | null) => void) | null = null;
  private activeIndex: number | null = null;

  constructor(map: MapConfig) {
    this.container = document.createElement('div');
    this.container.id = 'floor-selector';
    document.getElementById('hud')!.appendChild(this.container);

    // "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'floor-btn active';
    allBtn.textContent = 'All';
    allBtn.dataset.index = 'all';
    allBtn.addEventListener('click', () => this.select(null));
    this.container.appendChild(allBtn);

    // Floor buttons (top floor first)
    for (let i = map.floors.length - 1; i >= 0; i--) {
      const floor = map.floors[i];
      const btn = document.createElement('button');
      btn.className = 'floor-btn';
      btn.textContent = `F${i + 1}`;
      btn.title = floor.name;
      btn.dataset.index = String(i);
      btn.addEventListener('click', () => this.select(i));
      this.container.appendChild(btn);
    }
  }

  setHandler(handler: (index: number | null) => void) {
    this.onFloorSelect = handler;
  }

  private select(index: number | null) {
    // Toggle: clicking same floor again goes to "All"
    if (index === this.activeIndex) {
      index = null;
    }
    this.activeIndex = index;

    // Update button states
    const buttons = this.container.querySelectorAll('.floor-btn');
    buttons.forEach((btn) => {
      const el = btn as HTMLElement;
      const btnIndex = el.dataset.index;
      if (index === null && btnIndex === 'all') {
        el.classList.add('active');
      } else if (btnIndex === String(index)) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    this.onFloorSelect?.(index);
  }
}
