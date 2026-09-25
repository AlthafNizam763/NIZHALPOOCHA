import { MAP_IDS, type MapId } from '../game-rules/settings';
import { SABOTAGE_DEFS, SABOTAGE_TYPES, type SabotageType } from '../game-rules/sabotage';
import { KADALIMUKKU_OLD_TOWN } from './oldTown';
import { KADALIMUKKU_NEW_TOWN } from './newTown';
import { BACKWATER_VILLAGE } from './backwater';
import { NEO_KERALA } from './neoKerala';
import { NIZHALAM } from './nizhalam';
import type { GameMapDef, Hazard, Point, SabotageStation, SurveillanceCamera } from './types';
import { pointInRect } from './collision';

export * from './types';
export * from './collision';
export { createMapBuilder } from './builder';
export { KADALIMUKKU_OLD_TOWN, KADALIMUKKU_NEW_TOWN, BACKWATER_VILLAGE, NEO_KERALA, NIZHALAM };

/** Map registry. Adding a map = adding its id to MAP_IDS and its definition here. */
const MAPS: Record<MapId, GameMapDef> = {
  kadalimukku_old_town: KADALIMUKKU_OLD_TOWN,
  kadalimukku_new_town: KADALIMUKKU_NEW_TOWN,
  backwater_village: BACKWATER_VILLAGE,
  neo_kerala: NEO_KERALA,
  nizhalam: NIZHALAM,
};

export const ALL_MAPS: readonly GameMapDef[] = MAP_IDS.map((id) => MAPS[id]);

export function getMap(id: MapId): GameMapDef {
  return MAPS[id];
}

/** Zone id at a point, or the map's outdoor zone. */
export function zoneAt(map: GameMapDef, p: Point): string {
  // Smaller zones win (bus stop inside junction bounds, etc.)
  let best: { id: string; area: number } | null = null;
  for (const z of map.zones) {
    if (pointInRect(p.x, p.y, z)) {
      const area = z.w * z.h;
      if (!best || area < best.area) best = { id: z.id, area };
    }
  }
  return best?.id ?? map.outdoorZoneId;
}

/** Spawn positions for `count` players: the map's explicit points, else a ring around the spawn. */
export function spawnPoints(map: GameMapDef, count: number): Point[] {
  if (map.spawnPoints?.length) return Array.from({ length: count }, (_, i) => map.spawnPoints![i % map.spawnPoints!.length]!);
  const pts: Point[] = [];
  for (let i = 0; i < count; i++) {
    const a = (i / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
    pts.push({
      x: Math.round(map.spawn.x + Math.cos(a) * map.spawnRadius),
      y: Math.round(map.spawn.y + Math.sin(a) * map.spawnRadius),
    });
  }
  return pts;
}

// ── Sabotage ─────────────────────────────────────────────────────────────
/** The stations on this map that repair a sabotage type. */
export function repairStationsFor(map: GameMapDef, type: SabotageType): SabotageStation[] {
  return map.sabotageStations.filter((s) => s.sabotage === type);
}

/** Sabotages a Cat can trigger on this map. */
export function availableSabotages(map: GameMapDef): SabotageType[] {
  return SABOTAGE_TYPES.filter((type) =>
    SABOTAGE_DEFS[type].repairMode === 'none'
      ? type !== 'DOOR_LOCK' || map.buildings.some((b) => b.lockable)
      : repairStationsFor(map, type).length > 0,
  );
}

// ── Hazards ──────────────────────────────────────────────────────────────
export function hazardAt(map: GameMapDef, x: number, y: number): Hazard | null {
  for (const h of map.hazards) if (pointInRect(x, y, h)) return h;
  return null;
}

/** Movement speed multiplier at a point (1 outside hazards). */
export function speedMultiplierAt(map: GameMapDef, x: number, y: number): number {
  return hazardAt(map, x, y)?.speedMultiplier ?? 1;
}

// ── Surveillance ─────────────────────────────────────────────────────────
/**
 * Where a camera is at server time `t`. Fixed cameras never move; drones fly
 * their patrol loop at constant speed, so every client and the server agree on
 * the position without any network traffic.
 */
export function cameraPosition(cam: SurveillanceCamera, t: number): Point {
  const path = cam.patrol;
  if (!path || path.length < 2 || !cam.speed) return { x: cam.x, y: cam.y };
  const segs: { a: Point; b: Point; len: number }[] = [];
  let total = 0;
  for (let i = 0; i < path.length; i++) {
    const a = path[i]!;
    const b = path[(i + 1) % path.length]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    segs.push({ a, b, len });
    total += len;
  }
  if (total === 0) return { x: path[0]!.x, y: path[0]!.y };
  let d = ((t / 1000) * cam.speed) % total;
  for (const s of segs) {
    if (d <= s.len) {
      const k = s.len ? d / s.len : 0;
      return { x: s.a.x + (s.b.x - s.a.x) * k, y: s.a.y + (s.b.y - s.a.y) * k };
    }
    d -= s.len;
  }
  return { x: path[0]!.x, y: path[0]!.y };
}

/** Cameras (with their current position) that can see a point at time `t`. */
export function camerasSeeing(map: GameMapDef, x: number, y: number, t: number): SurveillanceCamera[] {
  return map.cameras.filter((c) => {
    const p = cameraPosition(c, t);
    return Math.hypot(p.x - x, p.y - y) <= c.radius;
  });
}
