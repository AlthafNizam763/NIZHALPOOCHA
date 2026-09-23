import type { PositionSnapshot } from '@nizhal/shared';

type SnapshotListener = (s: PositionSnapshot, receivedAt: number) => void;

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
