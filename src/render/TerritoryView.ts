import { Container, Graphics, Text } from 'pixi.js';
import type { TerritoryData } from '../map/MapData';
import type { Player, TerritoryState } from '../game/GameState';

export class TerritoryView {
  container: Container;
  private bg: Graphics;
  private armyText: Text;
  private nameText: Text;
  private highlight: Graphics;
  private territoryId: string;
  private isSelected = false;
  private isHighlighted = false;

  constructor(
    data: TerritoryData,
    state: TerritoryState | undefined,
    players: Player[],
    onClick: (id: string) => void,
  ) {
    this.territoryId = data.id;
    this.container = new Container();
    this.container.eventMode = 'static';
    this.container.cursor = 'pointer';

    // Background polygon
    this.bg = new Graphics();
    this.container.addChild(this.bg);

    // Highlight overlay
    this.highlight = new Graphics();
    this.highlight.visible = false;
    this.container.addChild(this.highlight);

    // Draw the polygon shape
    this.drawPolygon(data.polygon, state, players);
    this.drawHighlightPolygon(data.polygon);

    // Territory name
    const center = this.getCenter(data.polygon);
    this.nameText = new Text({
      text: data.name,
      style: {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: 9,
        fill: 0xffffff,
        fontWeight: '400',
      },
    });
    this.nameText.anchor.set(0.5);
    this.nameText.x = center.x;
    this.nameText.y = center.y - 8;
    this.container.addChild(this.nameText);

    // Army count
    this.armyText = new Text({
      text: state ? String(state.armies) : '0',
      style: {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: 14,
        fill: 0xffffff,
        fontWeight: 'bold',
        dropShadow: {
          color: 0x000000,
          blur: 2,
          distance: 1,
        },
      },
    });
    this.armyText.anchor.set(0.5);
    this.armyText.x = center.x;
    this.armyText.y = center.y + 8;
    this.container.addChild(this.armyText);

    // Hover effects
    this.container.on('pointerover', () => {
      if (!this.isSelected && !this.isHighlighted) {
        this.bg.alpha = 0.9;
      }
    });
    this.container.on('pointerout', () => {
      if (!this.isSelected && !this.isHighlighted) {
        this.bg.alpha = 0.7;
      }
    });

    // Click
    this.container.on('pointertap', () => {
      onClick(this.territoryId);
    });
  }

  update(state: TerritoryState | undefined, players: Player[]) {
    if (!state) return;
    const owner = players.find((p) => p.id === state.ownerId);
    const color = owner ? owner.color : 0x444444;

    this.bg.clear();
    // We need the polygon data to redraw, but we store it via the initial draw
    // Instead, we'll just tint
    this.bg.tint = color;
    this.armyText.text = String(state.armies);
  }

  setHighlight(on: boolean, color: number = 0xffffff) {
    this.isHighlighted = on;
    this.highlight.visible = on;
    if (on) {
      this.highlight.tint = color;
      this.bg.alpha = 0.95;
    } else {
      this.bg.alpha = 0.7;
    }
  }

  setSelected(selected: boolean) {
    this.isSelected = selected;
    this.bg.alpha = selected ? 1 : 0.7;
    if (selected) {
      this.container.scale.set(1.02);
    } else {
      this.container.scale.set(1);
    }
  }

  private drawPolygon(
    polygon: [number, number][],
    state: TerritoryState | undefined,
    players: Player[],
  ) {
    const owner = state ? players.find((p) => p.id === state.ownerId) : null;
    const color = owner ? owner.color : 0x444444;

    this.bg.poly(polygon.flat());
    this.bg.fill({ color: 0xffffff, alpha: 0.7 });
    this.bg.stroke({ color: 0xffffff, width: 1.5, alpha: 0.8 });
    this.bg.tint = color;
  }

  private drawHighlightPolygon(polygon: [number, number][]) {
    this.highlight.poly(polygon.flat());
    this.highlight.stroke({ color: 0xffffff, width: 3, alpha: 0.9 });
  }

  private getCenter(polygon: [number, number][]): { x: number; y: number } {
    const x = polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length;
    const y = polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length;
    return { x, y };
  }
}
