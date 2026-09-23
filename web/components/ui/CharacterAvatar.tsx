'use client';
import { useEffect, useRef } from 'react';
import type { Appearance } from '@nizhal/shared';
import { CHAR_H, CHAR_W, drawCharacter } from '@/game/art/character';

/** Same art as in-game, rendered to a small canvas. */
export function CharacterAvatar({
  appearance,
  size = 64,
  animate = false,
  dim = false,
  className = '',
}: {
  appearance: Appearance;
  size?: number;
  animate?: boolean;
  dim?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const height = size;
  const width = Math.round((size * CHAR_W) / CHAR_H);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const draw = () => {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale((width * dpr) / CHAR_W, (height * dpr) / CHAR_H);
      drawCharacter(ctx, appearance, animate ? frame % 4 : 0);
    };
    draw();
    if (!animate) return;
    const id = setInterval(() => {
      frame++;
      draw();
    }, 160);
    return () => clearInterval(id);
  }, [appearance, animate, width, height]);

  return <canvas ref={ref} style={{ width, height }} className={`${dim ? 'opacity-40 grayscale' : ''} ${className}`} />;
}
