import { createMapBuilder } from './builder';
import type { GameMapDef, Hazard } from './types';

/**
 * MAP 3 — Backwater Village. Canals, boats, paddy fields and narrow laterite
 * lanes. Built for visibility play: open fields where everyone is seen, a dense
 * sacred grove and coconut grove where nobody is, and water routes — two
 * bridges plus a slow wading ford across the river, a bridge plus a ford across
 * the canal.
 *
 *   north-west : Kavu (shrine grove) · Toddy Shop · Tea Stall · Pump House
 *   north-east : Coir Factory · Boat Jetty (bell) · Ration Shop — past the canal
 *   river      : two bridges + a shallow ford
 *   south      : Panchayat (bell) · Village Square (spawn) · Huts · Paddy Fields ·
 *                Fishermen's Shed · Coconut Grove · Lake Shore (mud flats)
 */

const W = 2600;
const H = 1800;
const b = createMapBuilder();

// ── Buildings ──────────────────────────────────────────────────────────────
b.building({
  id: 'bw_shrine', zoneId: 'bw_kavu', x: 180, y: 90, w: 220, h: 180,
  floorStyle: 'wood', roof: 'tile', signKey: 'sign.bw_shrine', lockable: false,
  doors: [{ side: 's', at: 70, size: 80 }],
});
b.building({
  id: 'bw_toddy', zoneId: 'bw_toddy', x: 620, y: 120, w: 300, h: 240,
  floorStyle: 'concrete', roof: 'tin', signKey: 'sign.bw_toddy', lockable: true,
  doors: [{ side: 's', at: 110, size: 80 }, { side: 'e', at: 90, size: 72 }],
});
b.building({
  id: 'bw_pumphouse', zoneId: 'bw_pumphouse', x: 900, y: 560, w: 220, h: 170,
  floorStyle: 'concrete', roof: 'concrete', signKey: 'sign.bw_pumphouse', lockable: true,
  doors: [{ side: 'n', at: 70, size: 80 }],
});
b.building({
  id: 'bw_coir', zoneId: 'bw_coir', x: 1760, y: 80, w: 420, h: 330,
  floorStyle: 'concrete', roof: 'tin', signKey: 'sign.bw_coir', lockable: true,
  doors: [{ side: 's', at: 170, size: 90 }, { side: 'w', at: 130, size: 72 }],
});
b.building({
  id: 'bw_ration', zoneId: 'bw_ration', x: 2260, y: 430, w: 300, h: 230,
  floorStyle: 'concrete', roof: 'tin', signKey: 'sign.bw_ration', lockable: true,
  doors: [{ side: 'w', at: 80, size: 72 }, { side: 's', at: 110, size: 80 }],
});
b.building({
  id: 'bw_panchayat', zoneId: 'bw_panchayat', x: 80, y: 1000, w: 360, h: 280,
  floorStyle: 'tile', roof: 'tile', signKey: 'sign.bw_panchayat', lockable: true,
  doors: [{ side: 'e', at: 100, size: 80 }, { side: 'n', at: 140, size: 80 }],
});
b.building({
  id: 'bw_fishshed', zoneId: 'bw_fishermen', x: 1900, y: 1060, w: 360, h: 260,
  floorStyle: 'wood', roof: 'thatch', signKey: 'sign.bw_fishshed', lockable: true,
  doors: [{ side: 'w', at: 90, size: 80 }, { side: 'n', at: 140, size: 72 }],
});

// ── Interiors ──────────────────────────────────────────────────────────────
b.deco('counter', 660, 160, 150, 24, true);
b.deco('bench', 660, 250, 100, 20, true);
b.deco('pump', 1000, 600, 80, 50, true);
b.deco('workbench', 1800, 120, 160, 30, true);
b.deco('haystack', 2020, 120, 120, 60, true); // coir bales
b.deco('generator', 2100, 260, 70, 60, true);
b.deco('shelf', 2300, 470, 200, 22, true);
b.deco('desk', 130, 1060, 100, 26, true);
b.deco('bench', 300, 1200, 100, 20, true);
b.deco('radio', 390, 1220, 32, 24, false);
b.deco('net', 1960, 1120, 120, 50, false);
b.deco('boat', 2120, 1240, 90, 30, false);

// ── Outdoors ──────────────────────────────────────────────────────────────
b.deco('stall', 1050, 150, 120, 50, true); // tea stall
b.deco('stall', 1250, 150, 120, 50, true);
b.deco('bench', 1060, 260, 100, 18, true);
b.deco('bench', 1260, 260, 100, 18, true);
b.deco('bicycle', 1420, 300, 44, 16, true);
b.deco('auto', 1450, 360, 70, 44, true);
b.deco('panel', 2330, 150, 50, 40, true); // transformer
b.deco('crate', 1720, 580, 50, 50, true);
b.deco('bell', 1940, 680, 20, 20, true); // jetty bell
b.deco('bell', 550, 1030, 20, 20, true); // panchayat bell
b.deco('hut', 60, 1360, 160, 120, true);
b.deco('hut', 280, 1360, 160, 120, true);
b.deco('hut', 60, 1560, 160, 120, true);
b.deco('hut', 280, 1560, 160, 120, true);
b.deco('well', 500, 1500, 50, 50, true);
b.deco('banana', 230, 1500, 40, 40, false);
b.deco('haystack', 1000, 1300, 60, 40, true);
b.deco('haystack', 1550, 1050, 60, 40, true);

// Boats moored on the water (drawn on the river, water itself is the collider).
b.deco('houseboat', 1750, 790, 200, 60, false);
b.deco('boat', 2300, 800, 90, 30, false);
b.deco('boat', 600, 820, 90, 30, false);
b.deco('boat', 2250, 1600, 90, 30, false);

// Kavu: the sacred grove is dense — a place to lose sight of people.
b.trees([
  [100, 120], [100, 300], [460, 110], [470, 320], [160, 400], [380, 400], [60, 210], [520, 220],
  // tea stall & lanes
  [1100, 400], [1500, 110], [580, 440], [980, 440],
  // coir / jetty
  [2450, 330], [2530, 100], [1720, 470],
  // village
  [620, 1400], [720, 1700], [480, 1760], [40, 1300],
  // coconut grove (isolated)
  [920, 1480], [1030, 1540], [1150, 1470], [1260, 1520], [1390, 1480], [1500, 1540], [1620, 1470], [1720, 1530],
  [960, 1650], [1080, 1720], [1200, 1660], [1400, 1700], [1530, 1650], [1660, 1720], [1180, 1760], [1760, 1680],
  // fishermen / lake
  [1820, 1350], [2380, 1100], [2520, 1300],
]);
b.lamps([[300, 540], [900, 540], [1450, 540], [700, 1000], [1200, 1000], [1800, 1000], [2400, 520], [1950, 460]]);
b.puddles([[850, 950, 80, 24], [1760, 1100, 70, 22], [400, 540, 90, 24]]);

// ── Water ─────────────────────────────────────────────────────────────────
const river = { x: 0, y: 760, w: W, h: 140 };
const canal = { x: 1600, y: 0, w: 80, h: 760 };
const lake = { x: 2000, y: 1480, w: 600, h: 320 };
const bridges = [
  { x: 380, y: 750, w: 90, h: 160 },
  { x: 2050, y: 750, w: 90, h: 160 },
  { x: 1590, y: 150, w: 100, h: 80 },
];
// Wading routes: open water you can walk through, slowly.
const riverFord = { x: 1250, y: 760, w: 120, h: 140 };
const canalFord = { x: 1600, y: 460, w: 80, h: 80 };
b.water(river, [...bridges, riverFord]);
b.water(canal, [...bridges, canalFord]);
b.water(lake);

const hazards: Hazard[] = [
  { kind: 'shallow_water', ...riverFord, speedMultiplier: 0.55 },
  { kind: 'shallow_water', ...canalFord, speedMultiplier: 0.55 },
  { kind: 'paddy', x: 900, y: 990, w: 800, h: 175, speedMultiplier: 0.75 },
  { kind: 'paddy', x: 900, y: 1245, w: 800, h: 190, speedMultiplier: 0.75 },
  { kind: 'mud', x: 1790, y: 1420, w: 210, h: 380, speedMultiplier: 0.7 },
];

export const BACKWATER_VILLAGE: GameMapDef = b.finish({
  id: 'backwater_village',
  nameKey: 'map.backwater_village',
  descriptionKey: 'map.backwater_village.desc',
  theme: {
    id: 'backwater',
    palette: {
      grass: 0x1b3a22, grassDark: 0x153019, grassLight: 0x24492b,
      road: 0x5b3b2a, roadWet: 0x6a4632, roadEdge: 0x3a2618, dash: 0x8a6a4a,
      water: 0x123a36, waterLight: 0x2a6158, bridge: 0x5a4230, rail: 0x7a5a3a,
    },
    background: '#0c1610',
    rain: true,
    lightning: true,
  },
  width: W,
  height: H,
  spawn: { x: 690, y: 1170 },
  spawnRadius: 95,
  outdoorZoneId: 'bw_lanes',
  roads: [
    { x: 0, y: 470, w: 1600, h: 60 },
    { x: 1680, y: 440, w: 580, h: 60 },
    { x: 0, y: 930, w: W, h: 50 },
    { x: 900, y: 1170, w: 800, h: 70 },
    { x: 800, y: 980, w: 60, h: 820 },
    { x: 1700, y: 980, w: 60, h: 460 },
  ],
  water: [river, canal, lake],
  bridges,
  hazards,
  zones: [
    { id: 'bw_kavu', nameKey: 'zone.bw_kavu', x: 40, y: 40, w: 520, h: 400 },
    { id: 'bw_toddy', nameKey: 'zone.bw_toddy', x: 600, y: 100, w: 340, h: 280 },
    { id: 'bw_teastall', nameKey: 'zone.bw_teastall', x: 980, y: 60, w: 600, h: 380 },
    { id: 'bw_pumphouse', nameKey: 'zone.bw_pumphouse', x: 880, y: 540, w: 260, h: 210 },
    { id: 'bw_coir', nameKey: 'zone.bw_coir', x: 1700, y: 0, w: 900, h: 420 },
    { id: 'bw_jetty', nameKey: 'zone.bw_jetty', x: 1700, y: 500, w: 540, h: 260 },
    { id: 'bw_ration', nameKey: 'zone.bw_ration', x: 2240, y: 420, w: 360, h: 340 },
    { id: 'bw_river', nameKey: 'zone.bw_river', x: 0, y: 740, w: W, h: 180 },
    { id: 'bw_panchayat', nameKey: 'zone.bw_panchayat', x: 60, y: 980, w: 400, h: 320 },
    { id: 'bw_square', nameKey: 'zone.bw_square', x: 480, y: 990, w: 400, h: 340 },
    { id: 'bw_huts', nameKey: 'zone.bw_huts', x: 0, y: 1320, w: 780, h: 480 },
    { id: 'bw_paddy', nameKey: 'zone.bw_paddy', x: 880, y: 980, w: 840, h: 460 },
    { id: 'bw_fishermen', nameKey: 'zone.bw_fishermen', x: 1760, y: 980, w: 840, h: 420 },
    { id: 'bw_grove', nameKey: 'zone.bw_grove', x: 880, y: 1440, w: 900, h: 360 },
    { id: 'bw_lake', nameKey: 'zone.bw_lake', x: 1780, y: 1400, w: 820, h: 400 },
  ],
  taskStations: [
    { id: 'bw_st_lamp', taskType: 'restore_streetlight', x: 290, y: 200, zoneId: 'bw_kavu' },
    { id: 'bw_st_fuse', taskType: 'repair_fuse', x: 860, y: 300, zoneId: 'bw_toddy' },
    { id: 'bw_st_auto', taskType: 'repair_auto_battery', x: 1420, y: 382, zoneId: 'bw_teastall' },
    { id: 'bw_st_generator', taskType: 'restart_generator', x: 2080, y: 350, zoneId: 'bw_coir' },
    { id: 'bw_st_ration', taskType: 'arrange_shop', x: 2400, y: 520, zoneId: 'bw_ration' },
    { id: 'bw_st_fuel', taskType: 'fuel_boat', x: 1800, y: 700, zoneId: 'bw_jetty' },
    { id: 'bw_st_pole', taskType: 'pole_boat', x: 2150, y: 720, zoneId: 'bw_jetty' },
    { id: 'bw_st_paddy', taskType: 'drain_paddy', x: 1300, y: 1100, zoneId: 'bw_paddy' },
    { id: 'bw_st_net', taskType: 'mend_net', x: 2100, y: 1180, zoneId: 'bw_fishermen' },
    { id: 'bw_st_well', taskType: 'repair_pump', x: 525, y: 1580, zoneId: 'bw_huts' },
    { id: 'bw_st_grove', taskType: 'clear_blockage', x: 1300, y: 1600, zoneId: 'bw_grove' },
    { id: 'bw_st_wires', taskType: 'connect_wires', x: 180, y: 1150, zoneId: 'bw_panchayat' },
  ],
  sabotageStations: [
    { id: 'bw_transformer', sabotage: 'POWER_FAILURE', x: 2355, y: 215, zoneId: 'bw_coir' },
    { id: 'bw_radio', sabotage: 'COMMS_FAILURE', x: 406, y: 1232, zoneId: 'bw_panchayat' },
    { id: 'bw_sluice_a', sabotage: 'PUMP_FAILURE', x: 940, y: 690, zoneId: 'bw_pumphouse' },
    { id: 'bw_sluice_b', sabotage: 'PUMP_FAILURE', x: 1970, y: 1520, zoneId: 'bw_lake' },
  ],
  meetingLocations: [
    { id: 'bw_panchayat_bell', x: 560, y: 1040, zoneId: 'bw_square' },
    { id: 'bw_jetty_bell', x: 1950, y: 690, zoneId: 'bw_jetty' },
  ],
  objectives: [],
  cameras: [],
  securityConsoles: [],
  specialRules: { visionMultiplier: 0.85, ruleKeys: ['maprule.fog', 'maprule.fords', 'maprule.paddy'] },
  supportedModes: ['hunt', 'classic'],
});
