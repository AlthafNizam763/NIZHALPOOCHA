'use client';
import { useEffect, useRef } from 'react';
import type * as Phaser from 'phaser';

/**
 * Mounts the Phaser game exactly once for the lifetime of the play screen.
 * Phaser is imported dynamically so it never runs during static rendering.
 */
export function GameCanvas({ selfId }: { selfId: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let game: Phaser.Game | null = null;
    let cancelled = false;
    void import('@/game/createGame').then(({ createGame }) => {
      if (cancelled || !ref.current) return;
      game = createGame(ref.current, selfId);
    });
    return () => {
      cancelled = true;
      game?.destroy(true);
      game = null;
    };
  }, [selfId]);
  return <div ref={ref} className="absolute inset-0 touch-none select-none" />;
}
