import './style.css';
import { loadMap } from './map/MapLoader';
import { createPlayers, createDraftState } from './game/GameLoop';
import { IsometricRenderer } from './render/IsometricRenderer';
import { GameController } from './game/GameController';
import { StartScreen } from './ui/StartScreen';
import { DraftScreen } from './ui/DraftScreen';

async function boot() {
  const map = await loadMap('/src/map/maps/office.json');

  // Start screen — pick player count
  const startScreen = new StartScreen();
  const playerCount = await startScreen.show();

  // Roll for turn order
  const players = createPlayers(playerCount);
  const draftScreen = new DraftScreen();
  const orderedPlayers = await draftScreen.rollForOrder(players);
  draftScreen.remove();

  // Create draft state (nothing owned yet)
  const state = createDraftState(map, orderedPlayers);

  // Init renderer
  const container = document.getElementById('game-container')!;
  const renderer = new IsometricRenderer();
  await renderer.init(container);
  renderer.buildMap(map, state);

  // Game controller handles draft + gameplay
  new GameController(map, state, renderer);
}

boot();
