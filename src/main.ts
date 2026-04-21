import './style.css';
import { loadMap, getAllTerritoryIds } from './map/MapLoader';

async function boot() {
  console.log('Shop Risk loading...');
  const map = await loadMap('/src/map/maps/office.json');
  const ids = getAllTerritoryIds(map);
  console.log(`Loaded map: ${map.name} — ${map.floors.length} floors, ${ids.length} territories`);
}

boot();
