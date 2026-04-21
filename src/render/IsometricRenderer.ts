import { Application, Container } from 'pixi.js';
import type { MapConfig } from '../map/MapData';
import type { GameState } from '../game/GameState';
import { FloorLayer } from './FloorLayer';
import { FLOOR_HEIGHT_GAP } from './constants';

export class IsometricRenderer {
  app: Application;
  world: Container;
  floorLayers: FloorLayer[] = [];
  private isDragging = false;
  private lastPointer = { x: 0, y: 0 };
  private onTerritoryClick: ((id: string) => void) | null = null;


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

    this.app.stage.addChild(this.world);

    // Center the world
    this.world.x = this.app.screen.width / 2 - 100;
    this.world.y = this.app.screen.height / 2 + 150;

    this.setupPanZoom(container);
  }

  buildMap(map: MapConfig, state: GameState) {
    // Clear existing
    this.world.removeChildren();
    this.floorLayers = [];

    // Build floors from bottom to top
    for (let i = 0; i < map.floors.length; i++) {
      const floor = map.floors[i];
      const layer = new FloorLayer(floor, i, state, (id: string) => {
        this.onTerritoryClick?.(id);
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
        // Show all floors
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

    canvas.addEventListener('pointerdown', (e) => {
      this.isDragging = true;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.world.x += dx;
      this.world.y += dy;
      this.lastPointer = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('pointerup', () => {
      this.isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newScale = Math.max(0.3, Math.min(3, this.world.scale.x * scaleFactor));
      this.world.scale.set(newScale);
    }, { passive: false });
  }
}
