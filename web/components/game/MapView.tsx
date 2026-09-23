'use client';
import { useEffect, useRef } from 'react';
import { SABOTAGE_DEFS, getMap, type GameMapDef } from '@nizhal/shared';
import { useGame } from '@/state/gameStore';
import { useT } from '@/hooks/useT';
import { bridge } from '@/game/bridge';
import type { I18nKey } from '@/utils/i18n';

function drawBase(ctx: CanvasRenderingContext2D, map: GameMapDef, s: number) {
  ctx.fillStyle = '#16261d';
  ctx.fillRect(0, 0, map.width * s, map.height * s);
  ctx.fillStyle = '#343a3d';
  for (const r of map.roads) ctx.fillRect(r.x * s, r.y * s, r.w * s, r.h * s);
  ctx.fillStyle = '#1f4a5a';
  for (const w of map.water) ctx.fillRect(w.x * s, w.y * s, w.w * s, w.h * s);
  ctx.fillStyle = '#6a6e6f';
  for (const b of map.bridges) ctx.fillRect(b.x * s, b.y * s, b.w * s, b.h * s);
  ctx.fillStyle = '#3b3129';
  for (const b of map.buildings) ctx.fillRect(b.floor.x * s, b.floor.y * s, b.floor.w * s, b.floor.h * s);
  ctx.fillStyle = '#6e2f1f';
  for (const d of map.decorations) if (d.kind === 'house_block') ctx.fillRect(d.x * s, d.y * s, d.w * s, d.h * s);
  ctx.fillStyle = '#b9b09c';
  for (const w of map.walls) ctx.fillRect(w.x * s, w.y * s, Math.max(1, w.w * s), Math.max(1, w.h * s));
}

/**
 * Minimap / full map. Shows only information the player legitimately has:
 * their own position, their tasks, active sabotage repair points, the alarm
 * bell and area names — never other players.
 */
export function MapView({ width, labels }: { width: number; labels?: boolean }) {
  const t = useT();
  const baseRef = useRef<HTMLCanvasElement>(null);
  const dynRef = useRef<HTMLCanvasElement>(null);
  const mapId = useGame((s) => s.state?.mapId ?? 'kadalimukku_night');
  const map = getMap(mapId);
  const s = width / map.width;
  const height = Math.round(map.height * s);

  useEffect(() => {
    const c = baseRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    drawBase(ctx, map, s);
  }, [map, s, width, height]);

  useEffect(() => {
    const c = dynRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = width * dpr;
    c.height = height * dpr;
    const ctx = c.getContext('2d')!;
    let raf = 0;
    const loop = (time: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const { self, state } = useGame.getState();
      const pulse = 0.6 + Math.sin(time / 250) * 0.3;
      // Alarm bell
      ctx.strokeStyle = '#c99a3b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(map.emergency.x * s, map.emergency.y * s, 4, 0, Math.PI * 2);
      ctx.stroke();
      if (self?.alive) {
        ctx.fillStyle = `rgba(233,176,79,${pulse})`;
        for (const task of self.tasks) {
          if (task.done) continue;
          const st = map.taskStations.find((x) => x.id === task.stationId);
          if (st) ctx.fillRect(st.x * s - 3, st.y * s - 3, 6, 6);
        }
      }
      if (state?.sabotage) {
        ctx.fillStyle = `rgba(208,85,61,${pulse})`;
        for (const id of SABOTAGE_DEFS[state.sabotage.type].repairStationIds) {
          if (state.sabotage.repairedStationIds.includes(id)) continue;
          const st = map.sabotageStations.find((x) => x.id === id);
          if (st) {
            ctx.beginPath();
            ctx.arc(st.x * s, st.y * s, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0e1512';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bridge.localPos.x * s, bridge.localPos.y * s, 4.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fill();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [map, s, width, height]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-line" style={{ width, height }}>
      <canvas ref={baseRef} style={{ width, height }} className="absolute inset-0" />
      <canvas ref={dynRef} style={{ width, height }} className="absolute inset-0" />
      {labels &&
        map.zones.map((z) => (
          <span
            key={z.id}
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-semibold text-paper/85 [text-shadow:0_1px_2px_#000]"
            style={{ left: (z.x + z.w / 2) * s, top: (z.y + z.h / 2) * s }}
          >
            {t(z.nameKey as I18nKey)}
          </span>
        ))}
    </div>
  );
}
