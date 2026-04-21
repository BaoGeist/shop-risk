export const FLOOR_HEIGHT_GAP = 180;
export const TILE_SCALE = 1.5;

/**
 * Convert 2D map coordinates to isometric screen coordinates.
 * Classic 2:1 isometric projection.
 */
export function toIsometric(x: number, y: number): { x: number; y: number } {
  return {
    x: (x - y),
    y: (x + y) * 0.5,
  };
}

export const PLAYER_COLORS = [
  { hex: 0xe74c3c, css: '#e74c3c' }, // red
  { hex: 0x3498db, css: '#3498db' }, // blue
  { hex: 0x2ecc71, css: '#2ecc71' }, // green
  { hex: 0xf39c12, css: '#f39c12' }, // orange
];
