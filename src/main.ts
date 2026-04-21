import './style.css';
import { loadMap } from './map/MapLoader';
import { createInitialState } from './game/GameLoop';
import { IsometricRenderer } from './render/IsometricRenderer';

async function boot() {
  console.log('Shop Risk loading...');

  const map = await loadMap('/src/map/maps/office.json');
  const state = createInitialState(map, 4);

  console.log(
    `Loaded: ${map.name} — ${map.floors.length} floors, ${state.territories.size} territories`,
  );

  const container = document.getElementById('game-container')!;
  const renderer = new IsometricRenderer();
  await renderer.init(container);
  renderer.buildMap(map, state);

  // Store globally for debugging
  Object.assign(window, { map, state, renderer });
}

boot();
