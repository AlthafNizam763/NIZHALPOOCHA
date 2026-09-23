'use client';
import { useEffect, useState } from 'react';

/** Touch-first device (phone/tablet) — decides joystick vs keyboard hints. */
export function useIsTouch(): boolean {
  const [touch, setTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setTouch(mq.matches || navigator.maxTouchPoints > 0);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return touch;
}

export function useIsPortrait(): boolean {
  const [portrait, setPortrait] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const update = () => setPortrait(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return portrait;
}

/** Re-renders every `ms` while mounted (for countdown labels). */
export function useTicker(ms = 250): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((x) => x + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return n;
}
