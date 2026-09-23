import type { MapId } from '../game-rules/settings';
import { KADALIMUKKU_NIGHT } from './kadalimukku';
import type { GameMapDef, Point } from './types';
import { pointInRect } from './collision';

export * from './types';
export * from './collision';
export { KADALIMUKKU_NIGHT };

const MAPS: Record<MapId, GameMapDef> = {
  kadalimukku_night: KADALIMUKKU_NIGHT,
};

export function getMap(id: MapId): GameMapDef {
  return MAPS[id];
}

/** Zone id at a point, or 'streets'. */
export function zoneAt(map: GameMapDef, p: Point): string {
  // Smaller zones win (bus stop inside junction bounds, etc.)
  let best: { id: string; area: number } | null = null;
  for (const z of map.zones) {
    if (pointInRect(p.x, p.y, z)) {
      const area = z.w * z.h;
      if (!best || area < best.area) best = { id: z.id, area };
    }
  }
  return best?.id ?? 'streets';
}

/** Evenly spaced spawn positions around the map spawn point. */
export function spawnPoints(map: GameMapDef, count: number): Point[] {
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
