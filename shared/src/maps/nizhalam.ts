import { createMapBuilder } from './builder';
import type { GameMapDef, Hazard } from './types';

/**
 * MAP 5 — Nizhalam. A monsoon town sealed off under quarantine, built for the
 * Infection mode. The river can only be crossed at three chokepoints (a rope
 * bridge, the main bridge and a slow ford); barricades turn the streets into
 * funnels. Antidote parts lie in the hospital, pharmacy, market and ruins; the
 * escape systems are the tasks.
 *
 *   north : Quarantine Hospital · Pharmacy · Radio Tower · Evacuation Jetty
 *   river : rope bridge · main bridge · ford
 *   south : Field Camp · Checkpoint (spawn, siren) · Old Church (bell) · Market ·
 *           Power Station · Water Works · Ruins · Quarantine Gate
 */

const W = 2400;
const H = 1600;
const b = createMapBuilder();

// ── Buildings ──────────────────────────────────────────────────────────────
b.building({
  id: 'nz_hospital', zoneId: 'nz_hospital', x: 80, y: 70, w: 560, h: 380,
  floorStyle: 'tile', roof: 'concrete', signKey: 'sign.nz_hospital', lockable: true,
  doors: [{ side: 's', at: 240, size: 90 }, { side: 'e', at: 160, size: 72 }],
});
b.building({
  id: 'nz_pharmacy', zoneId: 'nz_pharmacy', x: 760, y: 120, w: 300, h: 260,
  floorStyle: 'concrete', roof: 'tin', signKey: 'sign.nz_pharmacy', lockable: true,
  doors: [{ side: 's', at: 110, size: 80 }],
});
b.building({
  id: 'nz_church', zoneId: 'nz_church', x: 1480, y: 720, w: 420, h: 320,
  floorStyle: 'wood', roof: 'tile', signKey: 'sign.nz_church', lockable: true,
  doors: [{ side: 'w', at: 120, size: 80 }, { side: 's', at: 170, size: 90 }],
});
b.building({
  id: 'nz_power', zoneId: 'nz_power', x: 80, y: 1200, w: 460, h: 320,
  floorStyle: 'concrete', roof: 'concrete', signKey: 'sign.nz_power', lockable: true,
  doors: [{ side: 'n', at: 180, size: 90 }, { side: 'e', at: 140, size: 72 }],
});
b.building({
  id: 'nz_waterworks', zoneId: 'nz_waterworks', x: 700, y: 1300, w: 360, h: 260,
  floorStyle: 'concrete', roof: 'concrete', signKey: 'sign.nz_waterworks', lockable: true,
  doors: [{ side: 'n', at: 140, size: 80 }, { side: 'w', at: 100, size: 72 }],
});

// ── Interiors ──────────────────────────────────────────────────────────────
b.deco('desk', 120, 100, 160, 26, true); // lab bench
b.deco('bio_tank', 520, 100, 60, 60, true);
for (const x of [140, 280]) for (const y of [220, 320]) b.deco('bench', x, y, 100, 30, true); // beds
b.deco('shelf', 790, 160, 190, 22, true);
b.deco('shelf', 790, 250, 190, 22, true);
for (const x of [1540, 1720]) for (const y of [850, 930]) b.deco('bench', x, y, 120, 20, true); // pews
b.deco('bell', 1690, 770, 20, 20, true); // church bell
b.deco('panel', 110, 1240, 40, 40, false); // power board
b.deco('generator', 400, 1260, 70, 60, true);
b.deco('pump', 760, 1360, 80, 60, true);

// ── Outdoors ──────────────────────────────────────────────────────────────
b.deco('panel', 1330, 200, 60, 60, true); // radio mast base
b.deco('radio', 1240, 140, 32, 24, false);
b.deco('crate', 1700, 100, 50, 50, true);
b.deco('crate', 1760, 100, 50, 50, true);
b.deco('crate', 2300, 300, 50, 50, true);
b.deco('tent', 100, 740, 140, 100, true);
b.deco('tent', 300, 740, 140, 100, true);
b.deco('tent', 100, 900, 140, 100, true);
b.deco('tent', 300, 900, 140, 100, true);
b.deco('generator', 520, 760, 70, 60, true);
b.deco('bell', 1140, 730, 20, 20, true); // checkpoint siren
b.deco('stall', 2000, 760, 120, 50, true);
b.deco('stall', 2200, 760, 120, 50, true);
b.deco('crate', 2050, 960, 50, 50, true);
b.deco('bio_tank', 2250, 900, 50, 50, true);
b.deco('house_block', 1200, 1240, 200, 140, true); // ruins
b.deco('house_block', 1460, 1240, 180, 140, true);
b.deco('house_block', 1200, 1440, 200, 120, true);
b.deco('house_block', 1460, 1440, 180, 120, true);
b.deco('crate', 2200, 1400, 50, 50, true);
b.deco('bio_tank', 2300, 1200, 50, 50, true);

// Quarantine barricades funnel the streets.
b.deco('barrier', 880, 760, 20, 200, true);
b.deco('barrier', 1240, 1000, 180, 20, true);
b.deco('barrier', 1880, 1250, 20, 220, true);
b.deco('barrier', 1950, 700, 20, 150, true);
b.deco('barrier', 300, 1110, 200, 20, true);
b.deco('barrier', 1600, 400, 20, 140, true);

// Boats: the evacuation boat waits at the jetty.
b.deco('boat', 2100, 580, 120, 40, false);
b.deco('boat', 700, 600, 90, 30, false);

b.trees([
  [700, 100], [700, 440], [1100, 440], [1500, 100], [2300, 120], [2350, 460],
  [40, 1080], [640, 1080], [1400, 700], [2350, 1080], [640, 1560], [1100, 1580], [1820, 1560], [2380, 1560],
]);
b.lamps([[300, 500], [900, 500], [1500, 500], [2100, 500], [300, 1145], [900, 1145], [1500, 1145], [2100, 1145]]);
b.puddles([[900, 1150, 100, 28], [1650, 1130, 90, 24], [200, 690, 90, 26], [2150, 690, 100, 26]]);

// ── River ────────────────────────────────────────────────────────────────
const bridges = [
  { x: 300, y: 550, w: 80, h: 110 },
  { x: 1100, y: 550, w: 110, h: 110 },
];
const ford = { x: 1900, y: 560, w: 100, h: 90 };
const river = { x: 0, y: 560, w: W, h: 90 };
b.water(river, [...bridges, ford]);
const hazards: Hazard[] = [{ kind: 'shallow_water', ...ford, speedMultiplier: 0.55 }];

export const NIZHALAM: GameMapDef = b.finish({
  id: 'nizhalam',
  nameKey: 'map.nizhalam',
  descriptionKey: 'map.nizhalam.desc',
  theme: {
    id: 'quarantine',
    palette: {
      grass: 0x1f2a1c, grassDark: 0x19221a, grassLight: 0x2a3522,
      road: 0x2b2a27, roadWet: 0x34322e, roadEdge: 0x4a3f2f, dash: 0x8f8a6a,
      water: 0x1d2e25, waterLight: 0x3e5a3b,
      wall: 0x9c9886, wallTop: 0xbdb8a3, wallBase: 0x5e4a38,
      roof: 0x5a3a2c, roofDark: 0x44291e, roofRidge: 0x70503a, lamp: 0xb8e07a,
    },
    background: '#0b100c',
    rain: true,
    lightning: true,
  },
  width: W,
  height: H,
  spawn: { x: 1150, y: 890 },
  spawnRadius: 95,
  outdoorZoneId: 'nz_streets',
  roads: [
    { x: 0, y: 470, w: W, h: 60 },
    { x: 0, y: 660, w: W, h: 40 },
    { x: 0, y: 1110, w: W, h: 70 },
    { x: 1100, y: 660, w: 110, h: 940 },
  ],
  water: [river],
  bridges,
  hazards,
  zones: [
    { id: 'nz_hospital', nameKey: 'zone.nz_hospital', x: 80, y: 70, w: 560, h: 380 },
    { id: 'nz_pharmacy', nameKey: 'zone.nz_pharmacy', x: 760, y: 120, w: 300, h: 260 },
    { id: 'nz_radio', nameKey: 'zone.nz_radio', x: 1160, y: 60, w: 440, h: 400 },
    { id: 'nz_jetty', nameKey: 'zone.nz_jetty', x: 1640, y: 60, w: 760, h: 480 },
    { id: 'nz_river', nameKey: 'zone.nz_river', x: 0, y: 540, w: W, h: 130 },
    { id: 'nz_camp', nameKey: 'zone.nz_camp', x: 40, y: 700, w: 780, h: 400 },
    { id: 'nz_checkpoint', nameKey: 'zone.nz_checkpoint', x: 900, y: 700, w: 520, h: 400 },
    { id: 'nz_church', nameKey: 'zone.nz_church', x: 1480, y: 720, w: 420, h: 320 },
    { id: 'nz_market', nameKey: 'zone.nz_market', x: 1960, y: 700, w: 440, h: 400 },
    { id: 'nz_power', nameKey: 'zone.nz_power', x: 80, y: 1200, w: 460, h: 320 },
    { id: 'nz_waterworks', nameKey: 'zone.nz_waterworks', x: 700, y: 1300, w: 360, h: 260 },
    { id: 'nz_ruins', nameKey: 'zone.nz_ruins', x: 1160, y: 1200, w: 700, h: 400 },
    { id: 'nz_gate', nameKey: 'zone.nz_gate', x: 1900, y: 1180, w: 500, h: 420 },
  ],
  taskStations: [
    { id: 'nz_st_sample', taskType: 'collect_sample', x: 400, y: 150, zoneId: 'nz_hospital' },
    { id: 'nz_st_pharmacy', taskType: 'arrange_shop', x: 910, y: 330, zoneId: 'nz_pharmacy' },
    { id: 'nz_st_mast', taskType: 'repair_radio_mast', x: 1360, y: 290, zoneId: 'nz_radio' },
    { id: 'nz_st_fuel', taskType: 'fuel_boat', x: 2150, y: 530, zoneId: 'nz_jetty' },
    { id: 'nz_st_engine', taskType: 'connect_wires', x: 1800, y: 400, zoneId: 'nz_jetty' },
    { id: 'nz_st_camp', taskType: 'restart_generator', x: 500, y: 850, zoneId: 'nz_camp' },
    { id: 'nz_st_water', taskType: 'purify_water', x: 1850, y: 990, zoneId: 'nz_church' },
    { id: 'nz_st_market', taskType: 'clear_blockage', x: 2150, y: 900, zoneId: 'nz_market' },
    { id: 'nz_st_fuse', taskType: 'repair_fuse', x: 300, y: 1400, zoneId: 'nz_power' },
    { id: 'nz_st_pump', taskType: 'repair_pump', x: 900, y: 1500, zoneId: 'nz_waterworks' },
    { id: 'nz_st_light', taskType: 'restore_streetlight', x: 1430, y: 1410, zoneId: 'nz_ruins' },
    { id: 'nz_st_gate', taskType: 'reset_signal', x: 2100, y: 1300, zoneId: 'nz_gate' },
  ],
  sabotageStations: [
    { id: 'nz_power_board', sabotage: 'POWER_FAILURE', x: 160, y: 1300, zoneId: 'nz_power' },
    { id: 'nz_radio', sabotage: 'COMMS_FAILURE', x: 1256, y: 175, zoneId: 'nz_radio' },
    { id: 'nz_valve_a', sabotage: 'PUMP_FAILURE', x: 980, y: 1400, zoneId: 'nz_waterworks' },
    { id: 'nz_valve_b', sabotage: 'PUMP_FAILURE', x: 600, y: 666, zoneId: 'nz_river' },
  ],
  meetingLocations: [
    { id: 'nz_siren', x: 1150, y: 740, zoneId: 'nz_checkpoint' },
    { id: 'nz_church_bell', x: 1700, y: 780, zoneId: 'nz_church' },
  ],
  objectives: [
    { id: 'nz_antidote_hospital', kind: 'antidote_part', x: 560, y: 400, zoneId: 'nz_hospital' },
    { id: 'nz_antidote_pharmacy', kind: 'antidote_part', x: 1000, y: 210, zoneId: 'nz_pharmacy' },
    { id: 'nz_antidote_market', kind: 'antidote_part', x: 2300, y: 1050, zoneId: 'nz_market' },
    { id: 'nz_antidote_ruins', kind: 'antidote_part', x: 1300, y: 1410, zoneId: 'nz_ruins' },
  ],
  cameras: [],
  securityConsoles: [],
  specialRules: { visionMultiplier: 0.9, ruleKeys: ['maprule.quarantine', 'maprule.chokepoints', 'maprule.fords'] },
  supportedModes: ['infection', 'hunt'],
});
