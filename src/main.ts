import './style.css';
import { createPlayers, createDraftState } from './game/GameLoop';
import officeMap from './map/maps/office.json';
import type { MapConfig } from './map/MapData';
import { IsometricRenderer } from './render/IsometricRenderer';
import { GameController } from './game/GameController';
import { StartScreen } from './ui/StartScreen';

async function boot() {
  const map = officeMap as MapConfig;

  // Start screen — pick player count
  const startScreen = new StartScreen();
  const playerCount = await startScreen.show();
  const players = createPlayers(playerCount);

  // Create draft state (nothing owned yet — controller will handle roll + draft)
  const state = createDraftState(map, players);

  // Init renderer
  const container = document.getElementById('game-container')!;
  const renderer = new IsometricRenderer();
  await renderer.init(container);
  renderer.buildMap(map, state);

  // Game controller handles roll → draft → gameplay
  new GameController(map, state, renderer);
}

boot();
