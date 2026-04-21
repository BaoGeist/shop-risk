import { Container, Graphics, Text } from 'pixi.js';
import type { FloorData } from '../map/MapData';
import type { GameState } from '../game/GameState';
import { TerritoryView } from './TerritoryView';
import { toIsometric } from './constants';

export class FloorLayer {
  container: Container;
  territoryViews: Map<string, TerritoryView> = new Map();
  private floorLabel: Text;

  constructor(
    floor: FloorData,
    _floorIndex: number,
    state: GameState,
    onTerritoryClick: (id: string) => void,
  ) {
    this.container = new Container();

    // Floor base — isometric diamond background
    const base = new Graphics();
    // Map bounds: roughly 0,0 to 300,180. Draw isometric quad for those corners.
    const corners: [number, number][] = [
      [-15, -15], [530, -15], [530, 260], [-15, 260],
    ];
    const isoCorners = corners.map(([x, y]) => {
      const p = toIsometric(x, y);
      return [p.x, p.y] as [number, number];
    });
    base.poly(isoCorners.flat());
    base.fill({ color: 0x16213e, alpha: 0.3 });
    base.stroke({ color: 0x0f3460, width: 1, alpha: 0.5 });
    this.container.addChild(base);

    // Floor label — position at top-left iso corner
    const labelPos = toIsometric(-10, -10);
    this.floorLabel = new Text({
      text: floor.name,
      style: {
        fontFamily: 'Segoe UI, system-ui, sans-serif',
        fontSize: 11,
        fill: 0x8888aa,
        fontWeight: 'bold',
      },
    });
    this.floorLabel.x = labelPos.x;
    this.floorLabel.y = labelPos.y - 14;
    this.container.addChild(this.floorLabel);

    // Territory views
    for (const territory of floor.territories) {
      const territoryState = state.territories.get(territory.id);
      const view = new TerritoryView(
        territory,
        territoryState,
        state.players,
        onTerritoryClick,
        territory.neutral ?? false,
        territory.passthrough ?? false,
      );
      this.territoryViews.set(territory.id, view);
      this.container.addChild(view.container);
    }
  }

  update(state: GameState) {
    for (const [id, view] of this.territoryViews) {
      const territoryState = state.territories.get(id);
      view.update(territoryState, state.players);
    }
  }

  highlightTerritories(ids: Set<string>, color: number) {
    for (const [id, view] of this.territoryViews) {
      if (ids.has(id)) {
        view.setHighlight(true, color);
      }
    }
  }

  clearHighlights() {
    for (const [_, view] of this.territoryViews) {
      view.setHighlight(false);
    }
  }

  selectTerritory(id: string | null) {
    for (const [tId, view] of this.territoryViews) {
      view.setSelected(tId === id);
    }
  }
}
