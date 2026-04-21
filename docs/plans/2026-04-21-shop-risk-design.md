# Shop Risk — 3D Office Building Risk Game

## Overview

A simplified Risk board game played on an isometric 2.5D map of the Shopify Toronto office building. 7 floors act as continents, rooms/zones within each floor are territories. Local hotseat multiplayer for 2-4 players. Maps are data-driven (JSON) and swappable.

## Tech Stack

- **Vite + TypeScript** — build tooling, module system, HMR
- **PixiJS** — 2D rendering with isometric projection
- **Vanilla DOM** — UI overlays (HUD, dialogs)

## Architecture

```
src/
├── main.ts                    # Entry point
├── game/
│   ├── GameState.ts           # Players, territories, turn phase
│   ├── GameLoop.ts            # Turn flow: reinforce → attack → fortify
│   ├── Combat.ts              # Dice rolling, army resolution
│   └── Rules.ts               # Continent bonuses, reinforcement calc
├── map/
│   ├── MapLoader.ts           # Parse map JSON
│   ├── MapData.ts             # Types: Territory, Continent, Adjacency
│   └── maps/
│       └── office.json        # Default Shopify Toronto map
├── render/
│   ├── IsometricRenderer.ts   # PixiJS isometric canvas
│   ├── TerritoryView.ts       # Territory polygon rendering
│   ├── FloorLayer.ts          # Per-floor layer with toggle
│   └── ArmySprites.ts        # Army count display
└── ui/
    ├── HUD.ts                 # Player info, phase, controls
    ├── DicePanel.ts           # Attack dice animation
    └── FloorSelector.ts       # Floor tab navigation
```

## Map Data Format

Maps are JSON files defining floors (continents) with territories (polygon shapes + adjacencies).

```jsonc
{
  "name": "Shopify Toronto",
  "floors": [
    {
      "id": "floor-1",
      "name": "Floor 1",
      "bonus": 2,
      "territories": [
        {
          "id": "f1-lobby",
          "name": "Lobby",
          "polygon": [[0,0],[120,0],[120,80],[0,80]],
          "adjacencies": ["f1-reception", "f1-elevator"]
        }
      ]
    }
  ]
}
```

- Cross-floor adjacencies via elevator territories (e.g., `f1-elevator → f2-elevator`)
- Polygons are 2D coords; renderer applies isometric transform + vertical floor offset
- Swap maps by loading a different JSON file

## Default Map: Shopify Toronto (7 Floors)

Each floor has 4-6 territories. Central elevator on every floor connects to adjacent floors. ~35 territories total.

| Floor | Theme | Territories |
|-------|-------|-------------|
| 1 | Lobby & Reception | Lobby, Reception, Security, Mailroom, Elevator |
| 2 | Event & Community | Event Space, Café, Lounge, Phone Booths, Elevator |
| 3 | Engineering East | Open Workspace, Team Pods, Quiet Zone, Kitchenette, Elevator |
| 4 | Engineering West | Open Workspace, War Room, Collaboration Area, Kitchenette, Elevator |
| 5 | Product & Design | Design Studio, Product Den, Meeting Rooms, Break Area, Elevator |
| 6 | Leadership | Executive Suite, Board Room, Lounge, Admin Area, Elevator |
| 7 | Rooftop & Social | Rooftop Terrace, Game Room, Kitchen, Dining Hall, Elevator |

Elevators are adjacent to their own floor's territories + the elevator on floors directly above/below.

## Game Rules (Simplified Risk)

### Setup
- 2-4 players, each assigned a color
- Territories distributed randomly and evenly
- Each territory starts with 1 army; remaining armies placed round-robin

### Turn Phases

1. **Reinforce** — Receive `max(3, floor(territories / 3))` + floor bonuses. Place on owned territories.
2. **Attack** — Pick owned territory (2+ armies) → adjacent enemy → roll dice. Attacker: 1-3 dice (≤ armies-1). Defender: 1-2 dice (≤ armies). Compare highest pairs, ties to defender. Capture when defender hits 0; move in ≥ dice rolled. Repeat or pass.
3. **Fortify** — Move armies from one owned territory to one adjacent owned territory. Turn ends.

### Win Condition
Control all territories.

### Omitted from Full Risk
- No territory cards / card trading
- No mission objectives
- No mandatory starting army counts by player count

## Rendering

- **Isometric 2.5D**: floors as flat layers stacked with ~60px vertical gap
- **Territory rendering**: colored polygons per owner, highlight on hover, brighten on select
- **Army display**: numbers centered on territories
- **Floor navigation**: side tabs (Floor 1-7), active floor opaque, others at 20% opacity, "All" mode for stacked view
- **Elevator shaft**: vertical column visual connecting all floors

## UI (DOM Overlay)

- **Top bar**: current player + color, phase name, armies to place
- **Attack dialog**: attacker vs defender, dice count selector, roll button, animated results
- **Phase controls**: end phase / end turn buttons
- **Scoreboard**: territories owned, total armies, floors controlled per player

## Interaction Flow

- **Reinforce**: click owned territory → +1 army (repeat until placed all)
- **Attack**: click source → click adjacent enemy → dice dialog → resolve → repeat or pass
- **Fortify**: click source → click adjacent owned → army count slider → confirm
