import type {
  Decoration,
  DecorationKind,
  GameMapDef,
  MapBuilding,
  MapDoor,
  Rect,
  SabotageStation,
  TaskStation,
} from './types';

/**
 * Kadalimukku — Night. A compact monsoon junction town.
 *
 *   north strip : School · Tea Shop · coconut grove · Bus Stop · Electrical Room
 *   middle      : Kerala House · Main Junction (alarm bell) · Workshop
 *   canal       : crossed by two bridges (two loops north ↔ south)
 *   south strip : Residential Lane · Water Pump · Small Market · Community Hall
 */

const WALL = 16;
const W = 2400;
const H = 1600;

type Side = 'n' | 's' | 'e' | 'w';
interface DoorSpec {
  side: Side;
  at: number;
  size?: number;
}

interface BuildingSpec extends Omit<MapBuilding, 'floor'> {
  x: number;
  y: number;
  w: number;
  h: number;
  doors: DoorSpec[];
}

const colliders: Rect[] = [];
const walls: Rect[] = [];
const doors: MapDoor[] = [];
const buildings: MapBuilding[] = [];
const decorations: Decoration[] = [];

/** Split one wall side into solid segments around its door gaps. */
function wallSide(b: BuildingSpec, side: Side): void {
  const horizontal = side === 'n' || side === 's';
  const length = horizontal ? b.w : b.h;
  const gaps = b.doors
    .filter((d) => d.side === side)
    .map((d) => ({ from: d.at, to: d.at + (d.size ?? 76) }))
    .sort((a, c) => a.from - c.from);

  const rectFor = (from: number, to: number): Rect => {
    switch (side) {
      case 'n':
        return { x: b.x + from, y: b.y, w: to - from, h: WALL };
      case 's':
        return { x: b.x + from, y: b.y + b.h - WALL, w: to - from, h: WALL };
      case 'w':
        return { x: b.x, y: b.y + from, w: WALL, h: to - from };
      case 'e':
        return { x: b.x + b.w - WALL, y: b.y + from, w: WALL, h: to - from };
    }
  };

  let cursor = 0;
  gaps.forEach((g, i) => {
    if (g.from > cursor) walls.push(rectFor(cursor, g.from));
    doors.push({
      id: `${b.id}_door_${side}${i}`,
      buildingId: b.id,
      orientation: horizontal ? 'h' : 'v',
      ...rectFor(g.from, g.to),
    });
    cursor = g.to;
  });
  if (cursor < length) walls.push(rectFor(cursor, length));
}

function building(spec: BuildingSpec): void {
  const { x, y, w, h, doors: _d, ...rest } = spec;
  buildings.push({ ...rest, floor: { x, y, w, h } });
  (['n', 's', 'e', 'w'] as const).forEach((s) => wallSide(spec, s));
}

function deco(kind: DecorationKind, x: number, y: number, w: number, h: number, solid: boolean): void {
  decorations.push({ kind, x, y, w, h, solid });
  if (solid) colliders.push({ x, y, w, h });
}

/** Coconut tree: large canopy drawn, small trunk collider. */
function tree(cx: number, cy: number): void {
  deco('tree', cx - 9, cy - 9, 18, 18, true);
}

// ── Buildings ──────────────────────────────────────────────────────────────
building({
  id: 'school', zoneId: 'school', x: 80, y: 70, w: 560, h: 350,
  floorStyle: 'wood', roof: 'tile', signKey: 'sign.school', lockable: true,
  doors: [{ side: 's', at: 250, size: 80 }, { side: 'e', at: 150, size: 72 }],
});
building({
  id: 'tea_shop', zoneId: 'tea_shop', x: 860, y: 150, w: 260, h: 270,
  floorStyle: 'concrete', roof: 'tin', signKey: 'sign.tea_shop', lockable: true,
  doors: [{ side: 's', at: 90, size: 80 }, { side: 'w', at: 120, size: 72 }],
});
building({
  id: 'electrical', zoneId: 'electrical', x: 1860, y: 100, w: 300, h: 270,
  floorStyle: 'concrete', roof: 'concrete', signKey: 'sign.electrical', lockable: true,
  doors: [{ side: 's', at: 110, size: 80 }, { side: 'w', at: 120, size: 72 }],
});
building({
  id: 'house', zoneId: 'house', x: 120, y: 580, w: 420, h: 300,
  floorStyle: 'tile', roof: 'tile', lockable: true,
  doors: [{ side: 'n', at: 170, size: 80 }, { side: 'e', at: 150, size: 72 }],
});
building({
  id: 'workshop', zoneId: 'workshop', x: 1820, y: 580, w: 480, h: 320,
  floorStyle: 'concrete', roof: 'tin', signKey: 'sign.workshop', lockable: true,
  doors: [{ side: 'w', at: 120, size: 80 }, { side: 'n', at: 300, size: 90 }],
});
building({
  id: 'water_pump', zoneId: 'water_pump', x: 960, y: 1200, w: 260, h: 250,
  floorStyle: 'concrete', roof: 'concrete', signKey: 'sign.water_pump', lockable: true,
  doors: [{ side: 'n', at: 90, size: 80 }, { side: 'e', at: 140, size: 72 }],
});
building({
  id: 'community_hall', zoneId: 'community', x: 1900, y: 1220, w: 420, h: 300,
  floorStyle: 'wood', roof: 'tile', signKey: 'sign.community', lockable: true,
  doors: [{ side: 'n', at: 170, size: 90 }, { side: 'w', at: 150, size: 72 }],
});

// ── Interiors ──────────────────────────────────────────────────────────────
for (const dx of [160, 300, 440]) for (const dy of [180, 250, 320]) deco('desk', dx, dy, 70, 24, true);
deco('desk', 170, 104, 100, 26, true); // teacher's table
deco('counter', 890, 190, 150, 26, true);
deco('bench', 900, 300, 90, 20, true);
deco('bench', 1010, 330, 90, 20, true);
deco('panel', 2010, 250, 70, 60, true); // transformer
deco('panel', 1886, 120, 30, 34, false); // main power panel
deco('panel', 2106, 120, 30, 34, false); // fuse board
deco('bench', 160, 780, 120, 24, true); // thinnai
deco('shelf', 420, 620, 90, 24, true);
deco('workbench', 1860, 620, 160, 30, true);
deco('scooter', 2150, 760, 70, 34, true);
deco('generator', 2200, 620, 70, 60, true);
deco('pump', 1000, 1240, 80, 60, true);
deco('panel', 1166, 1226, 30, 30, false); // valve A
deco('stage', 1960, 1440, 300, 50, true);
deco('radio', 2236, 1240, 32, 24, false);

// ── Bus stop & junction ────────────────────────────────────────────────────
deco('shelter', 1300, 370, 260, 14, true);
deco('bench', 1330, 395, 200, 16, true);
deco('auto', 1590, 395, 70, 44, true);
deco('bell', 1190, 630, 20, 20, true);
deco('cctv', 1320, 575, 14, 14, true);
deco('bicycle', 760, 560, 44, 16, true);
deco('well', 880, 700, 50, 50, true);

// ── Residential lane ───────────────────────────────────────────────────────
deco('house_block', 80, 1220, 220, 160, true);
deco('house_block', 360, 1220, 200, 160, true);
deco('house_block', 80, 1440, 200, 120, true);
deco('house_block', 600, 1420, 220, 140, true);
deco('banana', 380, 1450, 40, 40, false);

// ── Market ────────────────────────────────────────────────────────────────
deco('stall', 1320, 1230, 120, 50, true);
deco('stall', 1500, 1230, 120, 50, true);
deco('stall', 1320, 1370, 120, 50, true);
deco('stall', 1500, 1370, 120, 50, true);
deco('stall', 1680, 1250, 90, 140, true);
deco('drum', 1760, 1470, 36, 36, true);

// ── Trees ─────────────────────────────────────────────────────────────────
[
  [700, 130], [790, 240], [710, 350],
  [1320, 120], [1440, 210], [1560, 110], [1680, 230], [1780, 120], [1500, 320],
  [2250, 150], [2330, 300], [2240, 420],
  [600, 640], [700, 780], [840, 610], [620, 860],
  [1480, 640], [1600, 790], [1720, 640], [1500, 860], [2350, 640],
  [340, 1510], [1250, 1530], [1830, 1540], [2360, 1300], [40, 1160] ,
].forEach(([x, y]) => tree(x as number, y as number));

// ── Street furniture (non-blocking) ──────────────────────────────────────
[
  [300, 452], [820, 452], [1290, 452], [1760, 452], [2200, 452],
  [560, 912], [1300, 912], [1900, 912], [720, 1250], [1250, 1178], [2000, 1178],
].forEach(([x, y]) => deco('lamp', (x as number) - 5, (y as number) - 5, 10, 10, false));
[
  [1000, 500, 90, 30], [1500, 950, 110, 34], [700, 1140, 90, 26], [1400, 700, 70, 24], [2100, 1140, 80, 24],
  [300, 950, 100, 30],
].forEach(([x, y, w, h]) => deco('puddle', x as number, y as number, w as number, h as number, false));

// ── Canal (solid water except bridges) ───────────────────────────────────
const water: Rect[] = [{ x: 0, y: 1000, w: W, h: 90 }];
const bridges: Rect[] = [
  { x: 620, y: 990, w: 120, h: 110 },
  { x: 1620, y: 990, w: 120, h: 110 },
];
colliders.push({ x: 0, y: 1000, w: 620, h: 90 }, { x: 740, y: 1000, w: 880, h: 90 }, { x: 1740, y: 1000, w: 660, h: 90 });

const taskStations: TaskStation[] = [
  { id: 'st_connect_wires', taskType: 'connect_wires', x: 560, y: 112, zoneId: 'school' },
  { id: 'st_fix_router', taskType: 'fix_router', x: 1085, y: 188, zoneId: 'tea_shop' },
  { id: 'st_repair_fuse', taskType: 'repair_fuse', x: 2120, y: 170, zoneId: 'electrical' },
  { id: 'st_repair_auto_battery', taskType: 'repair_auto_battery', x: 1625, y: 460, zoneId: 'bus_stop' },
  { id: 'st_fix_cctv', taskType: 'fix_cctv', x: 1327, y: 606, zoneId: 'junction' },
  { id: 'st_restart_generator', taskType: 'restart_generator', x: 2235, y: 700, zoneId: 'workshop' },
  { id: 'st_restore_streetlight', taskType: 'restore_streetlight', x: 720, y: 1275, zoneId: 'residential' },
  { id: 'st_repair_pump', taskType: 'repair_pump', x: 1040, y: 1320, zoneId: 'water_pump' },
  { id: 'st_arrange_shop', taskType: 'arrange_shop', x: 1380, y: 1325, zoneId: 'market' },
  { id: 'st_clear_blockage', taskType: 'clear_blockage', x: 2080, y: 1130, zoneId: 'canal' },
];

const sabotageStations: SabotageStation[] = [
  { id: 'power_panel', sabotage: 'POWER_FAILURE', x: 1901, y: 170, zoneId: 'electrical' },
  { id: 'comms_radio', sabotage: 'COMMS_FAILURE', x: 2252, y: 1285, zoneId: 'community' },
  { id: 'pump_valve_a', sabotage: 'PUMP_FAILURE', x: 1181, y: 1270, zoneId: 'water_pump' },
  { id: 'pump_valve_b', sabotage: 'PUMP_FAILURE', x: 380, y: 1135, zoneId: 'canal' },
];

export const KADALIMUKKU_NIGHT: GameMapDef = {
  id: 'kadalimukku_night',
  nameKey: 'map.kadalimukku_night',
  width: W,
  height: H,
  spawn: { x: 1200, y: 700 },
  spawnRadius: 95,
  roads: [
    { x: 0, y: 460, w: W, h: 80 },
    { x: 1140, y: 0, w: 120, h: 1000 },
    { x: 0, y: 920, w: W, h: 70 },
    { x: 0, y: 1110, w: W, h: 60 },
    { x: 1240, y: 1170, w: 60, h: 430 },
    { x: 880, y: 1170, w: 60, h: 430 },
  ],
  water,
  bridges,
  zones: [
    { id: 'school', nameKey: 'zone.school', x: 80, y: 70, w: 560, h: 350 },
    { id: 'tea_shop', nameKey: 'zone.tea_shop', x: 860, y: 150, w: 260, h: 270 },
    { id: 'electrical', nameKey: 'zone.electrical', x: 1860, y: 100, w: 300, h: 270 },
    { id: 'bus_stop', nameKey: 'zone.bus_stop', x: 1290, y: 360, w: 420, h: 110 },
    { id: 'junction', nameKey: 'zone.junction', x: 980, y: 440, w: 440, h: 360 },
    { id: 'house', nameKey: 'zone.house', x: 120, y: 580, w: 420, h: 300 },
    { id: 'workshop', nameKey: 'zone.workshop', x: 1820, y: 580, w: 480, h: 320 },
    { id: 'canal', nameKey: 'zone.canal', x: 0, y: 990, w: W, h: 180 },
    { id: 'residential', nameKey: 'zone.residential', x: 0, y: 1170, w: 900, h: 430 },
    { id: 'water_pump', nameKey: 'zone.water_pump', x: 940, y: 1170, w: 300, h: 300 },
    { id: 'market', nameKey: 'zone.market', x: 1280, y: 1170, w: 540, h: 430 },
    { id: 'community', nameKey: 'zone.community', x: 1860, y: 1170, w: 540, h: 430 },
  ],
  buildings,
  colliders: [...walls, ...colliders],
  walls,
  doors,
  taskStations,
  sabotageStations,
  emergency: { x: 1200, y: 640 },
  decorations,
};
