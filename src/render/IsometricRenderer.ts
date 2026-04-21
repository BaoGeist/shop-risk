import { Application, Container } from 'pixi.js';
import type { MapConfig } from '../map/MapData';
import type { GameState } from '../game/GameState';
import { FloorLayer } from './FloorLayer';
import { FLOOR_HEIGHT_GAP } from './constants';

const DRAG_THRESHOLD = 5; // pixels moved before it's a drag, not a click

export class IsometricRenderer {
  app: Application;
  world: Container;
  floorLayers: FloorLayer[] = [];
  private onTerritoryClick: ((id: string) => void) | null = null;

  // Pan/zoom state
  private pointerDown = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private hasDragged = false;

  constructor() {
    this.app = new Application();
    this.world = new Container();
  }

  async init(container: HTMLElement) {
    await this.app.init({
      resizeTo: container,
      background: 0x1a1a2e,
      antialias: true,
    });
    container.appendChild(this.app.canvas as HTMLCanvasElement);

    // Make stage interactive for pan
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.addChild(this.world);

    // Center the world — offset to account for 7 stacked floors
    this.world.x = this.app.screen.width / 2;
    this.world.y = this.app.screen.height / 2 + 400;

    this.setupPanZoom(container);
  }

  buildMap(map: MapConfig, state: GameState) {
    this.world.removeChildren();
    this.floorLayers = [];

    for (let i = 0; i < map.floors.length; i++) {
      const floor = map.floors[i];
      const layer = new FloorLayer(floor, i, state, (id: string) => {
        // Only fire click if we didn't drag
        if (!this.hasDragged) {
          this.onTerritoryClick?.(id);
        }
      });
      layer.container.y = -i * FLOOR_HEIGHT_GAP;
      this.world.addChild(layer.container);
      this.floorLayers.push(layer);
    }
  }

  update(state: GameState) {
    for (const layer of this.floorLayers) {
      layer.update(state);
    }
  }

  setTerritoryClickHandler(handler: (id: string) => void) {
    this.onTerritoryClick = handler;
  }

  highlightTerritories(ids: Set<string>, highlightColor: number = 0xffffff) {
    for (const layer of this.floorLayers) {
      layer.highlightTerritories(ids, highlightColor);
    }
  }

  clearHighlights() {
    for (const layer of this.floorLayers) {
      layer.clearHighlights();
    }
  }

  selectTerritory(id: string | null) {
    for (const layer of this.floorLayers) {
      layer.selectTerritory(id);
    }
  }

  focusFloor(floorIndex: number | null) {
    for (let i = 0; i < this.floorLayers.length; i++) {
      const layer = this.floorLayers[i];
      if (floorIndex === null) {
        layer.container.alpha = 1;
        layer.container.visible = true;
      } else {
        layer.container.visible = true;
        layer.container.alpha = i === floorIndex ? 1 : 0.15;
      }
    }
  }

  private setupPanZoom(container: HTMLElement) {
    const canvas = container.querySelector('canvas')!;

    // Use window-level events so drag works even when pointer leaves canvas
    canvas.addEventListener('pointerdown', (e) => {
      this.pointerDown = true;
      this.hasDragged = false;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.pointerDown) return;

      const dx = e.clientX - this.lastPointerX;
      const dy = e.clientY - this.lastPointerY;

      // Check if we've moved enough to count as a drag
      const totalDx = e.clientX - this.dragStartX;
      const totalDy = e.clientY - this.dragStartY;
      if (Math.abs(totalDx) > DRAG_THRESHOLD || Math.abs(totalDy) > DRAG_THRESHOLD) {
        this.hasDragged = true;
      }

      if (this.hasDragged) {
        this.world.x += dx;
        this.world.y += dy;
      }

      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
    });

    canvas.addEventListener('pointerup', () => {
      this.pointerDown = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();

      // Zoom toward cursor position
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const oldScale = this.world.scale.x;
      const newScale = Math.max(0.2, Math.min(4, oldScale * scaleFactor));

      // Adjust position so zoom centers on cursor
      const worldMouseX = (mouseX - this.world.x) / oldScale;
      const worldMouseY = (mouseY - this.world.y) / oldScale;
      this.world.scale.set(newScale);
      this.world.x = mouseX - worldMouseX * newScale;
      this.world.y = mouseY - worldMouseY * newScale;
    }, { passive: false });
  }
}
