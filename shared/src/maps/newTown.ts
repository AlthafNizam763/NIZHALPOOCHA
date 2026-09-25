import { createMapBuilder } from './builder';
import type { GameMapDef } from './types';

/**
 * MAP 2 — Kadalimukku New Town. The modern side of town: metro, tech park,
 * mall, apartments and a CCTV control room.
 *
 *   north  : Metro Station · Tech Park · Plaza (alarm post) · Control Room (CCTV)
 *   middle : Mall · Parking · Junction (spawn) · Apartments · Clinic
 *   drain  : storm-water drain with three crossings
 *   south  : Bus Terminal · Fuel & EV Station · Data Hub · Park
 */

const W = 2400;
const H = 1600;
const b = createMapBuilder();

// ── Buildings ──────────────────────────────────────────────────────────────
b.building({
  id: 'nt_metro', zoneId: 'nt_metro', x: 60, y: 60, w: 480, h: 360,
  floorStyle: 'tile', roof: 'glass', signKey: 'sign.nt_metro', lockable: true,
  doors: [{ side: 's', at: 200, size: 90 }, { side: 'e', at: 140, size: 72 }],
});
b.building({
  id: 'nt_techpark', zoneId: 'nt_techpark', x: 640, y: 70, w: 440, h: 360,
  floorStyle: 'concrete', roof: 'glass', signKey: 'sign.nt_techpark', lockable: true,
  doors: [{ side: 's', at: 180, size: 90 }, { side: 'w', at: 150, size: 72 }],
});
b.building({
  id: 'nt_control', zoneId: 'nt_control', x: 1880, y: 70, w: 440, h: 340,
  floorStyle: 'metal', roof: 'concrete', signKey: 'sign.nt_control', lockable: true,
  doors: [{ side: 's', at: 160, size: 90 }, { side: 'w', at: 140, size: 72 }],
});
b.building({
  id: 'nt_mall', zoneId: 'nt_mall', x: 60, y: 620, w: 480, h: 400,
  floorStyle: 'tile', roof: 'glass', signKey: 'sign.nt_mall', lockable: true,
  doors: [{ side: 'n', at: 200, size: 90 }, { side: 'e', at: 160, size: 72 }],
});
b.building({
  id: 'nt_clinic', zoneId: 'nt_clinic', x: 1880, y: 620, w: 440, h: 400,
  floorStyle: 'tile', roof: 'concrete', signKey: 'sign.nt_clinic', lockable: true,
  doors: [{ side: 'w', at: 160, size: 80 }, { side: 'n', at: 200, size: 90 }],
});
b.building({
  id: 'nt_datahub', zoneId: 'nt_datahub', x: 1290, y: 1280, w: 420, h: 290,
  floorStyle: 'metal', roof: 'concrete', signKey: 'sign.nt_datahub', lockable: true,
  doors: [{ side: 'n', at: 170, size: 90 }, { side: 'w', at: 120, size: 72 }],
});

// ── Interiors ──────────────────────────────────────────────────────────────
b.deco('counter', 120, 250, 140, 22, true); // metro turnstiles
b.deco('counter', 300, 250, 140, 22, true);
b.deco('bench', 100, 110, 120, 18, true);
b.deco('kiosk', 460, 90, 40, 40, true); // ticket machine
for (const x of [700, 820, 940]) for (const y of [150, 250]) b.deco('desk', x, y, 70, 24, true);
b.deco('server_rack', 1010, 90, 40, 60, true);
b.deco('console', 1920, 100, 160, 30, true); // CCTV wall
b.deco('server_rack', 2260, 100, 40, 90, true);
b.deco('shelf', 110, 700, 140, 22, true);
b.deco('shelf', 300, 700, 140, 22, true);
b.deco('shelf', 110, 820, 140, 22, true);
b.deco('shelf', 300, 820, 140, 22, true);
b.deco('counter', 380, 930, 120, 24, true);
b.deco('bench', 2000, 680, 90, 30, true); // clinic beds
b.deco('bench', 2140, 680, 90, 30, true);
b.deco('bench', 2000, 780, 90, 30, true);
b.deco('bench', 2140, 780, 90, 30, true);
b.deco('generator', 2220, 920, 70, 60, true);
b.deco('server_rack', 1340, 1330, 30, 100, true);
b.deco('server_rack', 1400, 1330, 30, 100, true);
b.deco('server_rack', 1460, 1330, 30, 100, true);
b.deco('console', 1580, 1330, 100, 26, true);
b.deco('panel', 1640, 1520, 40, 34, false); // substation

// ── Plaza ──────────────────────────────────────────────────────────────────
b.deco('well', 1480, 190, 70, 70, true); // fountain
b.deco('kiosk', 1320, 90, 50, 40, true);
b.deco('hoarding', 1600, 60, 120, 16, true);
b.deco('bench', 1380, 290, 80, 16, true);
b.deco('bench', 1580, 300, 80, 16, true);
b.deco('bell', 1510, 370, 20, 20, true); // alarm post

// ── Metro viaduct pillars (road median) ──────────────────────────────────
for (const x of [100, 400, 700, 1000, 1450, 1700, 2000, 2300]) b.deco('pillar', x, 508, 24, 24, true);

// ── Parking ───────────────────────────────────────────────────────────────
for (const y of [640, 780, 920]) for (const x of [690, 800, 910, 1020]) if (!(y === 920 && x === 800)) b.deco('car', x, y, 70, 36, true);
b.deco('charger', 1100, 700, 20, 30, true);

// ── Apartments ────────────────────────────────────────────────────────────
b.deco('apartment', 1450, 620, 130, 160, true);
b.deco('apartment', 1620, 620, 130, 160, true);
b.deco('apartment', 1450, 860, 130, 160, true);
b.deco('apartment', 1620, 860, 130, 160, true);

// ── Bus terminal & fuel station ──────────────────────────────────────────
b.deco('bus', 80, 1300, 160, 50, true);
b.deco('bus', 80, 1400, 160, 50, true);
b.deco('bus', 320, 1300, 160, 50, true);
b.deco('bus', 320, 1400, 160, 50, true);
b.deco('shelter', 520, 1290, 150, 14, true);
b.deco('bench', 530, 1310, 130, 16, true);
b.deco('shelter', 800, 1300, 260, 14, true);
for (const x of [820, 900, 980]) b.deco('charger', x, 1340, 20, 30, true);
b.deco('car', 780, 1440, 70, 36, true);
b.deco('auto', 1040, 1450, 70, 44, true);

// ── Park ──────────────────────────────────────────────────────────────────
b.deco('stage', 1950, 1480, 260, 50, true);
b.deco('radio', 2290, 1290, 32, 24, false); // comms mast base

// ── CCTV poles ────────────────────────────────────────────────────────────
for (const [x, y] of [[1500, 260], [1300, 700], [900, 740], [360, 1250], [300, 450], [1600, 950]] as const) b.deco('cctv', x - 7, y - 7, 14, 14, false);

b.trees([
  [1720, 300], [1300, 340], [1760, 140],
  [1790, 1450], [1900, 1380], [2250, 1420], [2350, 1540], [2100, 1340],
  [600, 1560], [1200, 1560], [560, 460], [1840, 460],
]);
b.lamps([
  [300, 580], [900, 580], [1500, 580], [2100, 580],
  [400, 1052], [1000, 1052], [1600, 1052], [2200, 1052], [700, 1260], [1760, 1260],
]);
b.puddles([[1000, 1080, 90, 26], [1700, 520, 100, 30], [300, 1560, 110, 26]]);

// ── Storm-water drain ────────────────────────────────────────────────────
const bridges = [
  { x: 260, y: 1160, w: 110, h: 90 },
  { x: 1150, y: 1160, w: 100, h: 90 },
  { x: 2000, y: 1160, w: 110, h: 90 },
];
const drain = { x: 0, y: 1170, w: W, h: 70 };
b.water(drain, bridges);

export const KADALIMUKKU_NEW_TOWN: GameMapDef = b.finish({
  id: 'kadalimukku_new_town',
  nameKey: 'map.kadalimukku_new_town',
  descriptionKey: 'map.kadalimukku_new_town.desc',
  theme: {
    id: 'modern_town',
    palette: {
      grass: 0x1a2b24, grassDark: 0x15241e, grassLight: 0x20342b,
      road: 0x23272b, roadWet: 0x30353a, roadEdge: 0x4a4f55, dash: 0xe6e0c8,
      wall: 0xc8cdd0, wallTop: 0xeef2f4, wallBase: 0x55606a,
      roof: 0x4b5560, roofDark: 0x39424b, roofRidge: 0x68737e, lamp: 0xf2e6b0,
    },
    background: '#0d1316',
    rain: true,
    lightning: true,
  },
  width: W,
  height: H,
  spawn: { x: 1200, y: 810 },
  spawnRadius: 95,
  outdoorZoneId: 'nt_streets',
  roads: [
    { x: 0, y: 470, w: W, h: 100 },
    { x: 1150, y: 0, w: 100, h: H },
    { x: 0, y: 1060, w: W, h: 80 },
    { x: 1780, y: 570, w: 60, h: 490 },
    { x: 580, y: 570, w: 60, h: 490 },
  ],
  water: [drain],
  bridges,
  hazards: [],
  zones: [
    { id: 'nt_metro', nameKey: 'zone.nt_metro', x: 60, y: 60, w: 480, h: 360 },
    { id: 'nt_techpark', nameKey: 'zone.nt_techpark', x: 640, y: 70, w: 440, h: 360 },
    { id: 'nt_plaza', nameKey: 'zone.nt_plaza', x: 1270, y: 40, w: 490, h: 420 },
    { id: 'nt_control', nameKey: 'zone.nt_control', x: 1880, y: 70, w: 440, h: 340 },
    { id: 'nt_mall', nameKey: 'zone.nt_mall', x: 60, y: 620, w: 480, h: 400 },
    { id: 'nt_parking', nameKey: 'zone.nt_parking', x: 660, y: 600, w: 470, h: 440 },
    { id: 'nt_junction', nameKey: 'zone.nt_junction', x: 1140, y: 580, w: 280, h: 470 },
    { id: 'nt_apartments', nameKey: 'zone.nt_apartments', x: 1430, y: 600, w: 340, h: 440 },
    { id: 'nt_clinic', nameKey: 'zone.nt_clinic', x: 1880, y: 620, w: 440, h: 400 },
    { id: 'nt_drain', nameKey: 'zone.nt_drain', x: 0, y: 1140, w: W, h: 110 },
    { id: 'nt_bus', nameKey: 'zone.nt_bus', x: 0, y: 1250, w: 720, h: 350 },
    { id: 'nt_fuel', nameKey: 'zone.nt_fuel', x: 720, y: 1250, w: 440, h: 350 },
    { id: 'nt_datahub', nameKey: 'zone.nt_datahub', x: 1270, y: 1250, w: 470, h: 350 },
    { id: 'nt_park', nameKey: 'zone.nt_park', x: 1740, y: 1250, w: 660, h: 350 },
  ],
  taskStations: [
    { id: 'nt_st_signal', taskType: 'reset_signal', x: 400, y: 150, zoneId: 'nt_metro' },
    { id: 'nt_st_firewall', taskType: 'patch_firewall', x: 1000, y: 360, zoneId: 'nt_techpark' },
    { id: 'nt_st_solar', taskType: 'align_solar', x: 1350, y: 160, zoneId: 'nt_plaza' },
    { id: 'nt_st_cctv', taskType: 'sync_cctv', x: 2120, y: 320, zoneId: 'nt_control' },
    { id: 'nt_st_shop', taskType: 'arrange_shop', x: 200, y: 770, zoneId: 'nt_mall' },
    { id: 'nt_st_ev', taskType: 'charge_ev', x: 1060, y: 728, zoneId: 'nt_parking' },
    { id: 'nt_st_streetlight', taskType: 'restore_streetlight', x: 1600, y: 820, zoneId: 'nt_apartments' },
    { id: 'nt_st_generator', taskType: 'restart_generator', x: 2190, y: 950, zoneId: 'nt_clinic' },
    { id: 'nt_st_blockage', taskType: 'clear_blockage', x: 760, y: 1152, zoneId: 'nt_drain' },
    { id: 'nt_st_router', taskType: 'fix_router', x: 600, y: 1480, zoneId: 'nt_bus' },
    { id: 'nt_st_battery', taskType: 'repair_auto_battery', x: 1000, y: 1480, zoneId: 'nt_fuel' },
    { id: 'nt_st_server', taskType: 'reboot_server', x: 1520, y: 1400, zoneId: 'nt_datahub' },
    { id: 'nt_st_camera', taskType: 'fix_cctv', x: 1850, y: 1310, zoneId: 'nt_park' },
  ],
  sabotageStations: [
    { id: 'nt_substation', sabotage: 'POWER_FAILURE', x: 1650, y: 1505, zoneId: 'nt_datahub' },
    { id: 'nt_comms', sabotage: 'COMMS_FAILURE', x: 2306, y: 1325, zoneId: 'nt_park' },
    { id: 'nt_drain_a', sabotage: 'PUMP_FAILURE', x: 200, y: 1268, zoneId: 'nt_bus' },
    { id: 'nt_drain_b', sabotage: 'PUMP_FAILURE', x: 2150, y: 1268, zoneId: 'nt_park' },
    { id: 'nt_cctv_server', sabotage: 'CCTV_FAILURE', x: 2280, y: 230, zoneId: 'nt_control' },
  ],
  meetingLocations: [{ id: 'nt_alarm_post', x: 1520, y: 380, zoneId: 'nt_plaza' }],
  objectives: [
    { id: 'nt_antidote_mall', kind: 'antidote_part', x: 440, y: 980, zoneId: 'nt_mall' },
    { id: 'nt_antidote_techpark', kind: 'antidote_part', x: 720, y: 380, zoneId: 'nt_techpark' },
    { id: 'nt_antidote_clinic', kind: 'antidote_part', x: 1960, y: 950, zoneId: 'nt_clinic' },
    { id: 'nt_antidote_datahub', kind: 'antidote_part', x: 1350, y: 1520, zoneId: 'nt_datahub' },
  ],
  cameras: [
    { id: 'nt_cam_plaza', kind: 'cctv', x: 1500, y: 260, radius: 230 },
    { id: 'nt_cam_junction', kind: 'cctv', x: 1300, y: 700, radius: 230 },
    { id: 'nt_cam_parking', kind: 'cctv', x: 900, y: 740, radius: 230 },
    { id: 'nt_cam_bus', kind: 'cctv', x: 360, y: 1250, radius: 230 },
    { id: 'nt_cam_metro', kind: 'cctv', x: 300, y: 450, radius: 200 },
    { id: 'nt_cam_apartments', kind: 'cctv', x: 1600, y: 950, radius: 200 },
  ],
  securityConsoles: [{ id: 'nt_console', x: 2000, y: 165, zoneId: 'nt_control' }],
  specialRules: { visionMultiplier: 1, ruleKeys: ['maprule.cctv', 'maprule.monsoon'] },
  supportedModes: ['classic', 'future', 'infection'],
});
