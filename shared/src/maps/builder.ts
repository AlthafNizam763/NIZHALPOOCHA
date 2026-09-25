import type { Decoration, DecorationKind, GameMapDef, MapBuilding, MapDoor, Rect } from './types';

/**
 * Builds map geometry from compact specs: buildings become wall segments with
 * door gaps, solid props become colliders, water becomes colliders except where
 * bridges cross. Every map uses this, so collision rules are identical everywhere.
 */

export const WALL = 16;

type Side = 'n' | 's' | 'e' | 'w';
export interface DoorSpec {
  side: Side;
  at: number;
  size?: number;
}

export interface BuildingSpec extends Omit<MapBuilding, 'floor'> {
  x: number;
  y: number;
  w: number;
  h: number;
  doors: DoorSpec[];
}

type Geometry = 'colliders' | 'walls' | 'doors' | 'buildings' | 'decorations';

export function createMapBuilder() {
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
      doors.push({ id: `${b.id}_door_${side}${i}`, buildingId: b.id, orientation: horizontal ? 'h' : 'v', ...rectFor(g.from, g.to) });
      cursor = g.to;
    });
    if (cursor < length) walls.push(rectFor(cursor, length));
  }

  const api = {
    building(spec: BuildingSpec): void {
      const { x, y, w, h, doors: _d, ...rest } = spec;
      buildings.push({ ...rest, floor: { x, y, w, h } });
      (['n', 's', 'e', 'w'] as const).forEach((s) => wallSide(spec, s));
    },

    deco(kind: DecorationKind, x: number, y: number, w: number, h: number, solid: boolean): void {
      decorations.push({ kind, x, y, w, h, solid });
      if (solid) colliders.push({ x, y, w, h });
    },

    /** Coconut palm: large canopy drawn, small trunk collider. */
    tree(cx: number, cy: number): void {
      api.deco('tree', cx - 9, cy - 9, 18, 18, true);
    },

    trees(points: readonly (readonly [number, number])[]): void {
      for (const [x, y] of points) api.tree(x, y);
    },

    lamps(points: readonly (readonly [number, number])[]): void {
      for (const [x, y] of points) api.deco('lamp', x - 5, y - 5, 10, 10, false);
    },

    puddles(rects: readonly (readonly [number, number, number, number])[]): void {
      for (const [x, y, w, h] of rects) api.deco('puddle', x, y, w, h, false);
    },

    /** An invisible solid rectangle (fences, map edges…). */
    solid(r: Rect): void {
      colliders.push(r);
    },

    /**
     * Deep water: solid everywhere except under the given bridges. The water is
     * split along its long axis around each bridge that crosses it.
     */
    water(r: Rect, crossings: readonly Rect[] = []): void {
      const horizontal = r.w >= r.h;
      const cuts = crossings
        .filter((b) => b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y)
        .map((b) => (horizontal ? { from: b.x, to: b.x + b.w } : { from: b.y, to: b.y + b.h }))
        .sort((a, c) => a.from - c.from);
      let cursor = horizontal ? r.x : r.y;
      const end = horizontal ? r.x + r.w : r.y + r.h;
      const push = (from: number, to: number) => {
        if (to <= from) return;
        colliders.push(horizontal ? { x: from, y: r.y, w: to - from, h: r.h } : { x: r.x, y: from, w: r.w, h: to - from });
      };
      for (const c of cuts) {
        push(cursor, c.from);
        cursor = Math.max(cursor, c.to);
      }
      push(cursor, end);
    },

    finish<T extends Omit<GameMapDef, Geometry>>(meta: T): GameMapDef {
      return { ...meta, buildings, colliders: [...walls, ...colliders], walls, doors, decorations };
    },
  };
  return api;
}
