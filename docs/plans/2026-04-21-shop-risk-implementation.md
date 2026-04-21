# Shop Risk Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a simplified Risk board game with isometric 2.5D rendering on a 7-floor office building map.

**Architecture:** Data-driven map (JSON) → game state engine → PixiJS isometric renderer → DOM HUD overlay. Game loop cycles through reinforce/attack/fortify phases per player.

**Tech Stack:** Vite, TypeScript, PixiJS 8, vanilla DOM

---

### Task 1: Project Scaffold & Cleanup

**Files:**
- Delete: `src/counter.ts`, `src/assets/hero.png`, `src/assets/vite.svg`, `src/assets/typescript.svg`
- Rewrite: `src/main.ts`
- Rewrite: `src/style.css`
- Rewrite: `index.html`
- Create: `src/map/MapData.ts`
- Create: `src/game/GameState.ts`

**Step 1: Clean up starter files**

```bash
rm src/counter.ts src/assets/hero.png src/assets/vite.svg src/assets/typescript.svg
```

**Step 2: Write base index.html**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Shop Risk</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="game-container"></div>
    <div id="hud"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

**Step 3: Write base style.css**

```css
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: #1a1a2e; font-family: 'Segoe UI', system-ui, sans-serif; color: #e0e0e0; }
#game-container { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }
#hud { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
#hud > * { pointer-events: auto; }
```

**Step 4: Write type definitions**

`src/map/MapData.ts`:
```typescript
export interface TerritoryData {
  id: string;
  name: string;
  polygon: [number, number][];
  adjacencies: string[];
}

export interface FloorData {
  id: string;
  name: string;
  bonus: number;
  territories: TerritoryData[];
}

export interface MapConfig {
  name: string;
  floors: FloorData[];
}
```

`src/game/GameState.ts` — just the types for now:
```typescript
export type Phase = 'setup' | 'reinforce' | 'attack' | 'fortify';

export interface Player {
  id: number;
  name: string;
  color: number; // hex color for PixiJS
  cssColor: string; // CSS color string for DOM
}

export interface TerritoryState {
  ownerId: number;
  armies: number;
}

export interface GameState {
  players: Player[];
  territories: Map<string, TerritoryState>;
  currentPlayerIndex: number;
  phase: Phase;
  armiesToPlace: number;
  selectedTerritoryId: string | null;
}
```

**Step 5: Write minimal main.ts**

```typescript
import './style.css';

console.log('Shop Risk loading...');
```

**Step 6: Verify it runs**

```bash
npm run dev
```

Open browser — should see dark background, "Shop Risk loading..." in console.

**Step 7: Commit**

```bash
git add -A && git commit -m "chore: scaffold project structure and base types"
```

---

### Task 2: Map Data — Shopify Toronto Office

**Files:**
- Create: `src/map/maps/office.json`
- Create: `src/map/MapLoader.ts`

**Step 1: Create the office map JSON**

7 floors, ~4-6 territories each, central elevator connecting floors. Each floor is roughly 400x250 units. Territories are rectangular/L-shaped zones.

`src/map/maps/office.json` — full map with 7 floors, ~35 territories. Each floor has an elevator territory in the center that connects to floors above/below.

**Step 2: Create MapLoader**

`src/map/MapLoader.ts`:
```typescript
import type { MapConfig } from './MapData';

export async function loadMap(url: string): Promise<MapConfig> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to load map: ${resp.statusText}`);
  return resp.json() as Promise<MapConfig>;
}

export function getAllTerritoryIds(map: MapConfig): string[] {
  return map.floors.flatMap(f => f.territories.map(t => t.id));
}

export function getAdjacencies(map: MapConfig, territoryId: string): string[] {
  for (const floor of map.floors) {
    const territory = floor.territories.find(t => t.id === territoryId);
    if (territory) return territory.adjacencies;
  }
  return [];
}

export function getFloorForTerritory(map: MapConfig, territoryId: string): FloorData | undefined {
  return map.floors.find(f => f.territories.some(t => t.id === territoryId));
}
```

**Step 3: Verify map loads**

Update `main.ts` to import and load the map, log territory count.

**Step 4: Commit**

```bash
git add -A && git commit -m "feat: add Shopify Toronto office map data and loader"
```

---

### Task 3: Game State Engine

**Files:**
- Rewrite: `src/game/GameState.ts` (add full implementation)
- Create: `src/game/Rules.ts`
- Create: `src/game/Combat.ts`
- Create: `src/game/GameLoop.ts`

**Step 1: Implement GameState with initialization**

Add to `GameState.ts`:
- `createInitialState(map, playerCount)` — distribute territories randomly, assign starting armies
- Helper getters: `getCurrentPlayer()`, `getTerritoriesForPlayer()`, `getFloorsControlledBy()`

**Step 2: Implement Rules.ts**

```typescript
import type { GameState } from './GameState';
import type { MapConfig } from '../map/MapData';

export function calculateReinforcements(state: GameState, map: MapConfig): number {
  const player = state.players[state.currentPlayerIndex];
  const ownedCount = [...state.territories.entries()]
    .filter(([_, t]) => t.ownerId === player.id).length;
  
  let armies = Math.max(3, Math.floor(ownedCount / 3));
  
  // Floor bonuses
  for (const floor of map.floors) {
    const allOwned = floor.territories.every(
      t => state.territories.get(t.id)?.ownerId === player.id
    );
    if (allOwned) armies += floor.bonus;
  }
  
  return armies;
}
```

**Step 3: Implement Combat.ts**

```typescript
export interface CombatResult {
  attackerLosses: number;
  defenderLosses: number;
  attackerDice: number[];
  defenderDice: number[];
}

export function rollDice(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1)
    .sort((a, b) => b - a);
}

export function resolveCombat(attackerDiceCount: number, defenderDiceCount: number): CombatResult {
  const attackerDice = rollDice(attackerDiceCount);
  const defenderDice = rollDice(defenderDiceCount);
  
  let attackerLosses = 0;
  let defenderLosses = 0;
  const pairs = Math.min(attackerDice.length, defenderDice.length);
  
  for (let i = 0; i < pairs; i++) {
    if (attackerDice[i] > defenderDice[i]) {
      defenderLosses++;
    } else {
      attackerLosses++; // ties go to defender
    }
  }
  
  return { attackerLosses, defenderLosses, attackerDice, defenderDice };
}
```

**Step 4: Implement GameLoop.ts**

State machine that manages phase transitions:
- `startGame(map, playerCount)` → setup → first player's reinforce
- `placeArmy(territoryId)` → decrement armiesToPlace, if 0 → attack phase
- `attack(fromId, toId, diceCount)` → resolve combat, check capture, check win
- `skipAttack()` → fortify phase
- `fortify(fromId, toId, armyCount)` → next player's reinforce
- `skipFortify()` → next player's reinforce

Each method returns the new GameState (immutable updates).

**Step 5: Verify with console**

Wire up in main.ts: create game, log state, simulate a turn via console.

**Step 6: Commit**

```bash
git add -A && git commit -m "feat: game state engine with rules, combat, and turn loop"
```

---

### Task 4: Isometric Renderer — Floor Layers & Territories

**Files:**
- Create: `src/render/IsometricRenderer.ts`
- Create: `src/render/FloorLayer.ts`
- Create: `src/render/TerritoryView.ts`
- Create: `src/render/ArmySprites.ts`
- Create: `src/render/constants.ts`

**Step 1: Create rendering constants**

`src/render/constants.ts`:
```typescript
// Isometric projection: x' = (x - y) * cos(30°), y' = (x + y) * sin(30°) * 0.5
export const ISO_ANGLE = Math.PI / 6; // 30 degrees
export const FLOOR_HEIGHT_GAP = 60; // pixels between floors
export const TILE_SCALE = 1.5;

export const PLAYER_COLORS = [
  { hex: 0xe74c3c, css: '#e74c3c' }, // red
  { hex: 0x3498db, css: '#3498db' }, // blue
  { hex: 0x2ecc71, css: '#2ecc71' }, // green
  { hex: 0xf39c12, css: '#f39c12' }, // orange
];
```

**Step 2: Create IsometricRenderer**

Initialize PixiJS Application, create a main container that holds all floor layers. Add mouse wheel zoom and click-drag pan on the container.

**Step 3: Create FloorLayer**

A PixiJS Container per floor, positioned vertically based on floor index * FLOOR_HEIGHT_GAP. Contains TerritoryViews for each territory. Has `setOpacity(alpha)` method for floor focus.

**Step 4: Create TerritoryView**

A PixiJS Graphics object that draws the territory polygon with:
- Fill color = owner's player color (dimmed)
- Stroke = white border
- On hover: brighten fill
- On click: emit 'territory-selected' event
- Display territory name as small PixiJS Text

**Step 5: Create ArmySprites**

Text labels centered on each territory showing army count. Bold white text with dark shadow for readability. Updates when game state changes.

**Step 6: Apply isometric transform**

Convert 2D polygon coords to isometric:
```typescript
export function toIsometric(x: number, y: number): { x: number; y: number } {
  return {
    x: (x - y) * Math.cos(ISO_ANGLE),
    y: (x + y) * Math.sin(ISO_ANGLE) * 0.5,
  };
}
```

**Step 7: Render the map with random territory ownership**

Wire into main.ts: load map → create game state → create renderer → render all floors. Should see the isometric office building with colored territories.

**Step 8: Commit**

```bash
git add -A && git commit -m "feat: isometric renderer with floor layers and territory views"
```

---

### Task 5: HUD & UI Overlays

**Files:**
- Create: `src/ui/HUD.ts`
- Create: `src/ui/DicePanel.ts`
- Create: `src/ui/FloorSelector.ts`
- Update: `src/style.css`

**Step 1: Create HUD**

DOM overlay showing:
- Top bar: player name + colored dot, current phase, armies to place (in reinforce)
- Bottom: end phase / end turn / skip buttons
- Right side: player scoreboard (territories, armies, floors controlled)

All styled with CSS, positioned absolute over the canvas.

**Step 2: Create FloorSelector**

Vertical tab bar on the left side:
- "All" button (stacked view)
- Floor 1–7 buttons
- Clicking focuses that floor (full opacity), others fade
- Highlight current floor's button

**Step 3: Create DicePanel**

Modal/panel for attack resolution:
- Shows attacker territory name vs defender territory name
- Dice count selectors (1-3 for attacker, auto for defender)
- Roll button
- Animated dice results (simple CSS animation — dice flip to show numbers)
- Outcome text: "Attacker loses 1 army" / "Defender loses 2 armies"
- Continue / Retreat buttons

**Step 4: Style everything**

Dark theme matching the game background. Semi-transparent panels. Player colors throughout.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: HUD, floor selector, and dice panel UI"
```

---

### Task 6: Wire Everything Together — Playable Game

**Files:**
- Rewrite: `src/main.ts`
- Create: `src/game/GameController.ts`

**Step 1: Create GameController**

Central controller that connects game state ↔ renderer ↔ UI:
- Listens for territory clicks from renderer
- Based on current phase, handles the action (place army, select attacker/defender, fortify)
- Updates game state
- Re-renders affected territories
- Updates HUD

**Step 2: Implement reinforce flow**

Territory click → place 1 army → update display → when all placed, transition to attack phase.

**Step 3: Implement attack flow**

Click source territory → highlight valid targets → click target → show dice panel → roll → resolve → update map → check for capture → check for win → allow another attack or skip.

**Step 4: Implement fortify flow**

Click source → highlight adjacent owned → click target → show army slider → confirm → next player.

**Step 5: Player turn transitions**

After fortify (or skip), advance to next player. Show "Player X's Turn" interstitial. Start their reinforce phase.

**Step 6: Win condition check**

After each capture, check if current player owns all territories. If so, show victory screen.

**Step 7: Setup screen**

Simple start screen: "Shop Risk" title, player count selector (2-4), start button. On start → initialize game → begin.

**Step 8: Full playthrough test**

Run dev server, play through a few turns manually. Verify all phases work, dice combat resolves correctly, territory ownership transfers, floor bonuses apply.

**Step 9: Commit**

```bash
git add -A && git commit -m "feat: wire game controller, full playable game loop"
```

---

### Task 7: Polish & Visual Improvements

**Files:**
- Update: various render/ and ui/ files

**Step 1: Elevator shaft visual**

Draw a vertical column in the center connecting all floor layers. Subtle animated glow when cross-floor movement is possible.

**Step 2: Territory hover tooltips**

Show territory name, owner, army count on hover.

**Step 3: Turn transition animation**

Fade/slide effect between player turns with player color accent.

**Step 4: Camera auto-center**

When a floor is selected, smoothly pan camera to center that floor.

**Step 5: Commit**

```bash
git add -A && git commit -m "feat: polish — elevator visual, tooltips, animations"
```
