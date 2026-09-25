import { createMapBuilder } from './builder';
import type { GameMapDef } from './types';

/**
 * MAP 4 — Neo Kerala. A believable future Kerala: solar fields, vertical farms,
 * a hyperloop terminal, an AI command centre watching CCTV, and patrol drones
 * sweeping the streets. A maglev track splits the town; it can only be crossed
 * at three level crossings.
 *
 *   north  : Hyperloop Terminal · Vertical Farm · Solar Field · AI Command Centre · Drone Hub
 *   maglev : three crossings
 *   south  : Smart Market · Central Plaza (spawn) · Research Lab · Eco Pods ·
 *            Water Plant · Transit Hub · Data Centre · Eco Park
 */

const W = 2400;
const H = 1600;
const b = createMapBuilder();

// ── Buildings ──────────────────────────────────────────────────────────────
b.building({
  id: 'nk_hyperloop', zoneId: 'nk_hyperloop', x: 60, y: 60, w: 480, h: 340,
  floorStyle: 'metal', roof: 'glass', signKey: 'sign.nk_hyperloop', lockable: true,
  doors: [{ side: 's', at: 200, size: 90 }, { side: 'e', at: 130, size: 72 }],
});
b.building({
  id: 'nk_farm', zoneId: 'nk_farm', x: 640, y: 60, w: 380, h: 380,
  floorStyle: 'tile', roof: 'glass', signKey: 'sign.nk_farm', lockable: true,
  doors: [{ side: 's', at: 150, size: 80 }, { side: 'w', at: 160, size: 72 }],
});
b.building({
  id: 'nk_command', zoneId: 'nk_command', x: 1620, y: 80, w: 480, h: 400,
  floorStyle: 'metal', roof: 'glass', signKey: 'sign.nk_command', lockable: true,
  doors: [{ side: 's', at: 190, size: 90 }, { side: 'w', at: 160, size: 72 }],
});
b.building({
  id: 'nk_lab', zoneId: 'nk_lab', x: 1320, y: 790, w: 520, h: 230,
  floorStyle: 'metal', roof: 'glass', signKey: 'sign.nk_lab', lockable: true,
  doors: [{ side: 'w', at: 80, size: 72 }, { side: 's', at: 200, size: 90 }],
});
b.building({
  id: 'nk_waterplant', zoneId: 'nk_waterplant', x: 80, y: 1180, w: 440, h: 300,
  floorStyle: 'concrete', roof: 'concrete', signKey: 'sign.nk_waterplant', lockable: true,
  doors: [{ side: 'n', at: 170, size: 90 }, { side: 'e', at: 120, size: 72 }],
});
b.building({
  id: 'nk_datacenter', zoneId: 'nk_datacenter', x: 1320, y: 1170, w: 480, h: 300,
  floorStyle: 'metal', roof: 'concrete', signKey: 'sign.nk_datacenter', lockable: true,
  doors: [{ side: 'n', at: 200, size: 90 }, { side: 'e', at: 130, size: 72 }],
});

// ── Interiors ──────────────────────────────────────────────────────────────
b.deco('console', 100, 100, 160, 26, true); // departure board
b.deco('bench', 300, 200, 160, 18, true);
for (const y of [120, 220, 320]) b.deco('shelf', 690, y, 280, 22, true); // grow racks
b.deco('console', 1680, 110, 160, 26, true); // CCTV wall
b.deco('server_rack', 2050, 110, 30, 70, true);
b.deco('bell', 1690, 390, 20, 20, true); // command alarm
b.deco('bio_tank', 1380, 830, 50, 50, true);
b.deco('bio_tank', 1460, 830, 50, 50, true);
b.deco('desk', 1600, 830, 160, 26, true);
b.deco('pump', 140, 1240, 90, 60, true);
b.deco('server_rack', 1370, 1220, 30, 120, true);
b.deco('server_rack', 1440, 1220, 30, 120, true);
b.deco('server_rack', 1510, 1220, 30, 120, true);
b.deco('console', 1600, 1380, 150, 26, true);

// ── Solar field & drone hub ──────────────────────────────────────────────
for (const x of [1110, 1240, 1370]) for (const y of [100, 190, 280, 370]) b.deco('solar_panel', x, y, 100, 40, true);
b.deco('drone_pad', 2180, 120, 80, 80, false);
b.deco('drone_pad', 2280, 260, 80, 80, false);
b.deco('drone_pad', 2180, 400, 80, 80, false);
b.deco('panel', 2330, 610, 40, 34, true); // grid node

// ── Maglev track (solid except three level crossings) ────────────────────
for (const [x, w] of [[0, 560], [680, 480], [1280, 600], [2000, 400]] as const) b.deco('rail', x, 700, w, 40, true);

// ── South ─────────────────────────────────────────────────────────────────
for (const [x, y] of [[100, 820], [220, 820], [340, 820], [100, 940], [340, 940]] as const) b.deco('kiosk', x, y, 60, 50, true);
b.deco('bell', 1070, 990, 20, 20, true); // plaza holo-siren
b.deco('apartment', 2040, 780, 140, 90, true);
b.deco('apartment', 2220, 780, 140, 90, true);
b.deco('apartment', 2040, 930, 140, 90, true);
b.deco('charger', 2340, 950, 20, 30, true);
b.deco('bus', 800, 1200, 160, 50, true); // transit pods
b.deco('bus', 800, 1320, 160, 50, true);
b.deco('shelter', 980, 1440, 140, 14, true);
b.deco('well', 2150, 1300, 80, 80, true); // eco pond
b.deco('panel', 2330, 1470, 40, 34, false); // floodgate B
b.deco('hoarding', 700, 1560, 160, 16, true);

// ── CCTV poles ────────────────────────────────────────────────────────────
for (const [x, y] of [[1000, 900], [300, 900], [1600, 1060], [300, 460], [1300, 470], [2200, 1100]] as const) b.deco('cctv', x - 7, y - 7, 14, 14, false);

b.trees([
  [2080, 1200], [2350, 1220], [2300, 1400], [2080, 1520], [2380, 1560],
  [600, 460], [1060, 520], [640, 1100], [1240, 1560], [1880, 560], [40, 640],
]);
b.lamps([
  [300, 610], [900, 610], [1500, 610], [2100, 660],
  [400, 1130], [1000, 1130], [1600, 1130], [2200, 1130], [620, 1450], [1940, 1450],
]);

export const NEO_KERALA: GameMapDef = b.finish({
  id: 'neo_kerala',
  nameKey: 'map.neo_kerala',
  descriptionKey: 'map.neo_kerala.desc',
  theme: {
    id: 'future_city',
    palette: {
      grass: 0x14231f, grassDark: 0x101c19, grassLight: 0x1a2d28,
      road: 0x1c2126, roadWet: 0x252c33, roadEdge: 0x2e6f7a, dash: 0x55d6e6,
      water: 0x10303d, waterLight: 0x2d8aa0, bridge: 0x4d5a63, rail: 0x55d6e6,
      wall: 0xd7dde2, wallTop: 0xf4f7f9, wallBase: 0x2f7f8a,
      woodFloor: 0x3a3f44, woodLine: 0x31363a, concrete: 0x3d4449, concreteLine: 0x4a545b,
      tileFloor: 0x2d4a3e, tileLight: 0x355646,
      roof: 0x2c3e50, roofDark: 0x22313f, roofRidge: 0x55d6e6, lamp: 0x9fe8ff,
    },
    background: '#0a1114',
    rain: true,
    lightning: false,
  },
  width: W,
  height: H,
  spawn: { x: 930, y: 900 },
  spawnRadius: 95,
  outdoorZoneId: 'nk_streets',
  roads: [
    { x: 0, y: 520, w: W, h: 80 },
    { x: 1160, y: 520, w: 120, h: H - 520 },
    { x: 0, y: 1040, w: W, h: 80 },
    { x: 560, y: 600, w: 120, h: 1000 },
    { x: 1880, y: 600, w: 120, h: 1000 },
  ],
  water: [],
  bridges: [],
  hazards: [],
  zones: [
    { id: 'nk_hyperloop', nameKey: 'zone.nk_hyperloop', x: 60, y: 60, w: 480, h: 340 },
    { id: 'nk_farm', nameKey: 'zone.nk_farm', x: 640, y: 60, w: 380, h: 380 },
    { id: 'nk_solar', nameKey: 'zone.nk_solar', x: 1060, y: 60, w: 520, h: 460 },
    { id: 'nk_command', nameKey: 'zone.nk_command', x: 1620, y: 80, w: 480, h: 400 },
    { id: 'nk_dronehub', nameKey: 'zone.nk_dronehub', x: 2120, y: 40, w: 280, h: 660 },
    { id: 'nk_maglev', nameKey: 'zone.nk_maglev', x: 0, y: 690, w: W, h: 60 },
    { id: 'nk_market', nameKey: 'zone.nk_market', x: 40, y: 760, w: 520, h: 280 },
    { id: 'nk_plaza', nameKey: 'zone.nk_plaza', x: 700, y: 760, w: 460, h: 280 },
    { id: 'nk_lab', nameKey: 'zone.nk_lab', x: 1300, y: 760, w: 560, h: 280 },
    { id: 'nk_pods', nameKey: 'zone.nk_pods', x: 2000, y: 760, w: 400, h: 280 },
    { id: 'nk_waterplant', nameKey: 'zone.nk_waterplant', x: 40, y: 1140, w: 520, h: 460 },
    { id: 'nk_transit', nameKey: 'zone.nk_transit', x: 700, y: 1140, w: 460, h: 460 },
    { id: 'nk_datacenter', nameKey: 'zone.nk_datacenter', x: 1300, y: 1140, w: 560, h: 460 },
    { id: 'nk_ecopark', nameKey: 'zone.nk_ecopark', x: 2000, y: 1140, w: 400, h: 460 },
  ],
  taskStations: [
    { id: 'nk_st_signal', taskType: 'reset_signal', x: 440, y: 330, zoneId: 'nk_hyperloop' },
    { id: 'nk_st_farm', taskType: 'purify_water', x: 820, y: 400, zoneId: 'nk_farm' },
    { id: 'nk_st_solar', taskType: 'align_solar', x: 1300, y: 470, zoneId: 'nk_solar' },
    { id: 'nk_st_firewall', taskType: 'patch_firewall', x: 1900, y: 400, zoneId: 'nk_command' },
    { id: 'nk_st_drone', taskType: 'calibrate_drone', x: 2220, y: 160, zoneId: 'nk_dronehub' },
    { id: 'nk_st_market', taskType: 'arrange_shop', x: 250, y: 960, zoneId: 'nk_market' },
    { id: 'nk_st_sample', taskType: 'collect_sample', x: 1450, y: 960, zoneId: 'nk_lab' },
    { id: 'nk_st_ev', taskType: 'charge_ev', x: 2300, y: 980, zoneId: 'nk_pods' },
    { id: 'nk_st_pump', taskType: 'repair_pump', x: 200, y: 1400, zoneId: 'nk_waterplant' },
    { id: 'nk_st_router', taskType: 'fix_router', x: 1060, y: 1250, zoneId: 'nk_transit' },
    { id: 'nk_st_server', taskType: 'reboot_server', x: 1650, y: 1250, zoneId: 'nk_datacenter' },
    { id: 'nk_st_cctv', taskType: 'sync_cctv', x: 2080, y: 1440, zoneId: 'nk_ecopark' },
  ],
  sabotageStations: [
    { id: 'nk_grid_node', sabotage: 'POWER_FAILURE', x: 2300, y: 630, zoneId: 'nk_dronehub' },
    { id: 'nk_uplink', sabotage: 'COMMS_FAILURE', x: 1560, y: 1440, zoneId: 'nk_datacenter' },
    { id: 'nk_floodgate_a', sabotage: 'PUMP_FAILURE', x: 400, y: 1260, zoneId: 'nk_waterplant' },
    { id: 'nk_floodgate_b', sabotage: 'PUMP_FAILURE', x: 2320, y: 1520, zoneId: 'nk_ecopark' },
    { id: 'nk_cctv_core', sabotage: 'CCTV_FAILURE', x: 2040, y: 200, zoneId: 'nk_command' },
  ],
  meetingLocations: [
    { id: 'nk_plaza_siren', x: 1080, y: 1000, zoneId: 'nk_plaza' },
    { id: 'nk_command_alarm', x: 1700, y: 400, zoneId: 'nk_command' },
  ],
  objectives: [
    { id: 'nk_antidote_lab', kind: 'antidote_part', x: 1760, y: 960, zoneId: 'nk_lab' },
    { id: 'nk_antidote_farm', kind: 'antidote_part', x: 700, y: 170, zoneId: 'nk_farm' },
    { id: 'nk_antidote_water', kind: 'antidote_part', x: 460, y: 1420, zoneId: 'nk_waterplant' },
    { id: 'nk_antidote_data', kind: 'antidote_part', x: 1740, y: 1260, zoneId: 'nk_datacenter' },
  ],
  cameras: [
    { id: 'nk_cam_plaza', kind: 'cctv', x: 1000, y: 900, radius: 220 },
    { id: 'nk_cam_market', kind: 'cctv', x: 300, y: 900, radius: 200 },
    { id: 'nk_cam_lab', kind: 'cctv', x: 1600, y: 1060, radius: 200 },
    { id: 'nk_cam_hyperloop', kind: 'cctv', x: 300, y: 460, radius: 200 },
    { id: 'nk_cam_solar', kind: 'cctv', x: 1300, y: 470, radius: 200 },
    { id: 'nk_cam_park', kind: 'cctv', x: 2200, y: 1100, radius: 200 },
    {
      id: 'nk_drone_skyway', kind: 'drone', x: 200, y: 650, radius: 170, speed: 90,
      patrol: [{ x: 200, y: 650 }, { x: 2200, y: 650 }, { x: 2200, y: 500 }, { x: 200, y: 500 }],
    },
    {
      id: 'nk_drone_south', kind: 'drone', x: 300, y: 1100, radius: 170, speed: 80,
      patrol: [{ x: 300, y: 1100 }, { x: 2100, y: 1100 }, { x: 2100, y: 1520 }, { x: 300, y: 1520 }],
    },
    {
      id: 'nk_drone_boulevard', kind: 'drone', x: 1220, y: 200, radius: 160, speed: 70,
      patrol: [{ x: 1220, y: 200 }, { x: 1220, y: 1450 }],
    },
  ],
  securityConsoles: [{ id: 'nk_console', x: 1760, y: 160, zoneId: 'nk_command' }],
  specialRules: { visionMultiplier: 1, ruleKeys: ['maprule.drones', 'maprule.cctv', 'maprule.maglev'] },
  supportedModes: ['future', 'classic', 'infection'],
});
