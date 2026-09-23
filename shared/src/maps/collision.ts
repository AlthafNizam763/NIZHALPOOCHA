import type { Rect } from './types';

/** Does a square box centered at (cx, cy) with half-size `half` overlap `r`? */
export function boxOverlapsRect(cx: number, cy: number, half: number, r: Rect): boolean {
  return cx + half > r.x && cx - half < r.x + r.w && cy + half > r.y && cy - half < r.y + r.h;
}

export function pointInRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function isBlocked(cx: number, cy: number, half: number, colliders: readonly Rect[]): boolean {
  for (const r of colliders) if (boxOverlapsRect(cx, cy, half, r)) return true;
  return false;
}

const EPS = 0.01;

/**
 * Move a box by (dx, dy), resolving collisions axis by axis. Deterministic and
 * shared by client prediction and server validation.
 */
export function moveWithCollision(
  x: number,
  y: number,
  dx: number,
  dy: number,
  half: number,
  colliders: readonly Rect[],
  worldW: number,
  worldH: number,
): { x: number; y: number } {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 8));
  const sx = dx / steps;
  const sy = dy / steps;
  let px = x;
  let py = y;
  for (let i = 0; i < steps; i++) {
    if (sx !== 0) {
      px += sx;
      for (const r of colliders) {
        if (boxOverlapsRect(px, py, half, r)) {
          px = sx > 0 ? r.x - half - EPS : r.x + r.w + half + EPS;
        }
      }
    }
    if (sy !== 0) {
      py += sy;
      for (const r of colliders) {
        if (boxOverlapsRect(px, py, half, r)) {
          py = sy > 0 ? r.y - half - EPS : r.y + r.h + half + EPS;
        }
      }
    }
  }
  px = Math.min(worldW - half, Math.max(half, px));
  py = Math.min(worldH - half, Math.max(half, py));
  return { x: px, y: py };
}

export function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by);
}

/** Does the segment a→b pass through any collider (sampled)? Used to reject wall-skipping. */
export function segmentBlocked(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  half: number,
  colliders: readonly Rect[],
): boolean {
  const len = Math.hypot(bx - ax, by - ay);
  const steps = Math.max(1, Math.ceil(len / 4));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (isBlocked(ax + (bx - ax) * t, ay + (by - ay) * t, half, colliders)) return true;
  }
  return false;
}
