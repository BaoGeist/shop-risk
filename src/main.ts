import './style.css';
import { loadMap } from './map/MapLoader';
import { createInitialState } from './game/GameLoop';
import { IsometricRenderer } from './render/IsometricRenderer';
import { GameController } from './game/GameController';
import { StartScreen } from './ui/StartScreen';

async function boot() {
  const map = await loadMap('/src/map/maps/office.json');

  // Show start screen
  const startScreen = new StartScreen();
  const playerCount = await startScreen.show();

  // Initialize game
  const state = createInitialState(map, playerCount);
  const container = document.getElementById('game-container')!;
  const renderer = new IsometricRenderer();
  await renderer.init(container);
  renderer.buildMap(map, state);

  // Start game controller
  new GameController(map, state, renderer);
}

boot();
