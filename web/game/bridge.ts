import type { Point, PositionSnapshot, Rect } from '@nizhal/shared';

type SnapshotListener = (s: PositionSnapshot, receivedAt: number) => void;

/** Extra world layers the offline tutorial draws on top of the real map. */
export interface TutorialWorld {
  /** Playable area: the camera stays inside it and barriers close it off. */
  bounds: Rect;
  barriers: Rect[];
  /** Where the guide arrow points, or null. */
  guide: Point | null;
  /** Footprints for the investigation lesson (a = heading in radians). */
  prints: { x: number; y: number; a: number; kind: 'paw' | 'shoe' }[];
  clues: { id: string; x: number; y: number; found: boolean }[];
}

/**
 * Tiny mutable bridge between React/network code and the Phaser scene.
 * High-frequency data (joystick vector, snapshots, local position) flows here
 * instead of through React state to avoid re-renders.
 */
export const bridge = {
  /** Virtual joystick vector in [-1, 1]. */
  joy: { x: 0, y: 0 },
  /** Local player position, read by the minimap each animation frame. */
  localPos: { x: 0, y: 0 },
  snapshotListener: null as SnapshotListener | null,
  lastSnapshot: null as { snap: PositionSnapshot; at: number } | null,
  /** Forced position from the server (spawn, meeting reset, correction). */
  pendingTeleport: null as { x: number; y: number } | null,
  /** Set only while the offline tutorial runs. */
  tutorial: null as TutorialWorld | null,
  /** Bumped whenever the player zooms the camera. */
  zoomChanges: 0,

  pushSnapshot(snap: PositionSnapshot): void {
    const at = performance.now();
    this.lastSnapshot = { snap, at };
    this.snapshotListener?.(snap, at);
  },

  teleport(x: number, y: number): void {
    this.pendingTeleport = { x, y };
  },

  resetInput(): void {
    this.joy.x = 0;
    this.joy.y = 0;
  },
};
