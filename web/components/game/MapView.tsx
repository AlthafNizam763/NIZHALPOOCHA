'use client';
import { useEffect, useRef } from 'react';
import { cameraPosition, getMap, getMode, repairStationsFor, type GameMapDef } from '@nizhal/shared';
import { useGame } from '@/state/gameStore';
import { serverNow } from '@/state/connectionStore';
import { useT } from '@/hooks/useT';
import { bridge } from '@/game/bridge';
import type { I18nKey } from '@/utils/i18n';

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
const HAZARD_COLOR = { shallow_water: '#3f7a86', paddy: '#3f5a26', mud: '#3d2f22' } as const;

function drawBase(ctx: CanvasRenderingContext2D, map: GameMapDef, s: number) {
  ctx.fillStyle = map.theme.palette.grass !== undefined ? hex(map.theme.palette.grass) : '#16261d';
  ctx.fillRect(0, 0, map.width * s, map.height * s);
  ctx.fillStyle = '#343a3d';
  for (const r of map.roads) ctx.fillRect(r.x * s, r.y * s, r.w * s, r.h * s);
  for (const h of map.hazards) {
    ctx.fillStyle = HAZARD_COLOR[h.kind];
    ctx.fillRect(h.x * s, h.y * s, h.w * s, h.h * s);
  }
  ctx.fillStyle = '#1f4a5a';
  for (const w of map.water) ctx.fillRect(w.x * s, w.y * s, w.w * s, w.h * s);
  ctx.fillStyle = HAZARD_COLOR.shallow_water;
  for (const h of map.hazards) if (h.kind === 'shallow_water') ctx.fillRect(h.x * s, h.y * s, h.w * s, h.h * s);
  ctx.fillStyle = '#6a6e6f';
  for (const b of map.bridges) ctx.fillRect(b.x * s, b.y * s, b.w * s, b.h * s);
  ctx.fillStyle = '#3b3129';
  for (const b of map.buildings) ctx.fillRect(b.floor.x * s, b.floor.y * s, b.floor.w * s, b.floor.h * s);
  ctx.fillStyle = '#6e2f1f';
  for (const d of map.decorations) if (d.kind === 'house_block' || d.kind === 'hut' || d.kind === 'apartment') ctx.fillRect(d.x * s, d.y * s, d.w * s, d.h * s);
  // Other large obstacles that shape routes: maglev track, barricades, tents.
  for (const d of map.decorations) {
    const color = d.kind === 'rail' ? '#5f8f96' : d.kind === 'barrier' ? '#b8993a' : d.kind === 'tent' ? '#8a857a' : null;
    if (!color) continue;
    ctx.fillStyle = color;
    ctx.fillRect(d.x * s, d.y * s, Math.max(1.5, d.w * s), Math.max(1.5, d.h * s));
  }
  ctx.fillStyle = '#b9b09c';
  for (const w of map.walls) ctx.fillRect(w.x * s, w.y * s, Math.max(1, w.w * s), Math.max(1, w.h * s));
}

/**
 * Minimap / full map. Shows only information the player legitimately has:
 * their own position, their tasks, active sabotage repair points, meeting
 * points, antidote parts and area names — never other players.
 */
export function MapView({ width, labels }: { width: number; labels?: boolean }) {
  const t = useT();
  const baseRef = useRef<HTMLCanvasElement>(null);
  const dynRef = useRef<HTMLCanvasElement>(null);
  const mapId = useGame((s) => s.state?.mapId ?? 'kadalimukku_old_town');
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
      // Alarm bells / sirens
      if (getMode(state?.settings.mode ?? 'classic').emergencyMeetings) {
        ctx.strokeStyle = '#c99a3b';
        ctx.lineWidth = 1.5;
        for (const e of map.meetingLocations) {
          ctx.beginPath();
          ctx.arc(e.x * s, e.y * s, 4, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // Antidote parts not yet found
      const antidote = state?.modeState.antidote;
      if (antidote) {
        ctx.fillStyle = `rgba(111,220,140,${pulse})`;
        for (const o of map.objectives) {
          if (antidote.collectedIds.includes(o.id)) continue;
          ctx.fillRect(o.x * s - 1, o.y * s - 4, 2, 8);
          ctx.fillRect(o.x * s - 4, o.y * s - 1, 8, 2);
        }
      }
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
        for (const st of repairStationsFor(map, state.sabotage.type)) {
          if (state.sabotage.repairedStationIds.includes(st.id)) continue;
          ctx.beginPath();
          ctx.arc(st.x * s, st.y * s, 5, 0, Math.PI * 2);
          ctx.fill();
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

/**
 * Security console feed: the map with every working camera's field of view and
 * the living players / bodies the server says are inside one. Names are shown,
 * roles never — the feed only reveals where people are.
 */
export function CameraFeedView({ width }: { width: number }) {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const dynRef = useRef<HTMLCanvasElement>(null);
  const mapId = useGame((s) => s.state?.mapId ?? 'kadalimukku_old_town');
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
    ctx.fillStyle = 'rgba(4,7,11,0.45)';
    ctx.fillRect(0, 0, width, height);
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
      const { cameraFeed, state } = useGame.getState();
      const online = state?.modeState.camerasOnline ?? true;
      const now = serverNow();
      for (const cam of map.cameras) {
        const p = cameraPosition(cam, now);
        ctx.fillStyle = online ? 'rgba(159,232,255,0.10)' : 'rgba(181,87,58,0.08)';
        ctx.strokeStyle = online ? 'rgba(159,232,255,0.45)' : 'rgba(181,87,58,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x * s, p.y * s, cam.radius * s, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = cam.kind === 'drone' ? '#55d6e6' : '#c9c2b0';
        ctx.fillRect(p.x * s - 2, p.y * s - 2, 4, 4);
      }
      if (online && cameraFeed) {
        const players = state?.players ?? [];
        ctx.font = '600 10px Manrope, sans-serif';
        ctx.textAlign = 'center';
        for (const [id, x, y] of cameraFeed.p) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(x * s, y * s, 3.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(232,225,207,0.9)';
          ctx.fillText(players.find((p) => p.id === id)?.name ?? '', x * s, y * s - 6);
        }
        const blink = 0.5 + Math.sin(time / 200) * 0.5;
        ctx.strokeStyle = `rgba(208,85,61,${blink})`;
        ctx.lineWidth = 2;
        for (const [, , x, y] of cameraFeed.b) {
          ctx.beginPath();
          ctx.moveTo(x * s - 4, y * s - 4);
          ctx.lineTo(x * s + 4, y * s + 4);
          ctx.moveTo(x * s + 4, y * s - 4);
          ctx.lineTo(x * s - 4, y * s + 4);
          ctx.stroke();
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [map, s, width, height]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-line" style={{ width, height }}>
      <canvas ref={baseRef} style={{ width, height }} className="absolute inset-0" />
      <canvas ref={dynRef} style={{ width, height }} className="absolute inset-0" />
    </div>
  );
}
