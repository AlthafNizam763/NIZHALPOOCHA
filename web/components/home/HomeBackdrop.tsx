'use client';
import { useEffect, useRef } from 'react';
import { randomAppearance, type Appearance } from '@nizhal/shared';
import { CHAR_H, CHAR_W, drawCharacter } from '@/game/art/character';
import { useSettings } from '@/state/settingsStore';

/**
 * Animated title-screen backdrop: a monsoon night over Kadalimukku. Villagers
 * drift across the sky on the wind (some clinging to umbrellas), leaves tumble,
 * fireflies glow, rain falls — and now and then a pair of cat eyes blinks in the
 * dark. One canvas, sprites pre-rendered once, paused when the tab is hidden and
 * reduced to a still frame for prefers-reduced-motion.
 */

interface Floater {
  sprite: HTMLCanvasElement;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  scale: number;
  bob: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

function makeSprite(a: Appearance, px: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  const s = px / CHAR_H;
  c.width = Math.ceil(CHAR_W * s);
  c.height = Math.ceil(CHAR_H * s);
  const ctx = c.getContext('2d')!;
  ctx.scale(s, s);
  drawCharacter(ctx, a, 1);
  return c;
}

function drawSkyline(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const base = h * 0.86;
  ctx.fillStyle = '#0a110e';
  // Kerala tiled roofs and a few palms along the horizon
  const roofs = [0.06, 0.2, 0.38, 0.62, 0.8, 0.95];
  for (const [i, fx] of roofs.entries()) {
    const x = fx * w;
    const rw = w * (0.09 + (i % 2) * 0.03);
    const rh = h * (0.05 + (i % 3) * 0.012);
    ctx.beginPath();
    ctx.moveTo(x - rw, base);
    ctx.lineTo(x - rw * 0.55, base - rh);
    ctx.lineTo(x + rw * 0.55, base - rh);
    ctx.lineTo(x + rw, base);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(x - rw * 0.7, base, rw * 1.4, h - base);
  }
  // Lit windows
  ctx.fillStyle = 'rgba(241,180,62,0.55)';
  for (const fx of [0.2, 0.62, 0.95]) ctx.fillRect(fx * w - 6, base + h * 0.03, 12, 10);
  for (const fx of [0.12, 0.3, 0.52, 0.72, 0.88]) {
    const x = fx * w;
    const top = base - h * rand(0.16, 0.24);
    ctx.fillStyle = '#0a110e';
    ctx.fillRect(x - 2.5, top, 5, base - top);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + fx * 10;
      ctx.beginPath();
      ctx.ellipse(x + Math.cos(a) * 18, top + Math.sin(a) * 7, 24, 5, a, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillRect(0, base + h * 0.06, w, h);
}

/** `calm` = menu screens: fewer drifting villagers and leaves so content stays readable. */
export function HomeBackdrop({ calm = false }: { calm?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const low = useSettings.getState().quality === 'low';
    const dpr = Math.min(window.devicePixelRatio || 1, low ? 1 : 2);
    let w = 0;
    let h = 0;
    let sky: HTMLCanvasElement | null = null;
    const floaters: Floater[] = [];
    const leaves: Particle[] = [];
    const flies: Particle[] = [];
    const drops: Particle[] = [];
    const clouds: Particle[] = [];
    let flash = 0;
    let nextFlash = performance.now() + rand(9000, 20000);
    let eyes = { x: 0, y: 0, start: -1, next: performance.now() + rand(3000, 7000) };

    const spawnFloater = (fresh: boolean): Floater => {
      const a = randomAppearance();
      if (Math.random() < 0.45) a.accessory = 'umbrella';
      const scale = rand(0.55, 1.15);
      const sprite = makeSprite(a, 96 * scale);
      return {
        sprite,
        x: fresh ? rand(-0.1, 1.1) * w : -sprite.width - rand(0, w * 0.4),
        y: rand(0.1, 0.72) * h,
        vx: rand(14, 34) * scale,
        vy: rand(-4, 4),
        rot: rand(-0.6, 0.6),
        vr: rand(-0.25, 0.25),
        scale,
        bob: rand(0, Math.PI * 2),
      };
    };

    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      // Static layer: sky gradient, moon glow and skyline
      sky = document.createElement('canvas');
      sky.width = canvas.width;
      sky.height = canvas.height;
      const s = sky.getContext('2d')!;
      s.scale(dpr, dpr);
      const g = s.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#08100d');
      g.addColorStop(0.55, '#10201a');
      g.addColorStop(1, '#1a2c24');
      s.fillStyle = g;
      s.fillRect(0, 0, w, h);
      const mx = w * 0.8;
      const my = h * 0.18;
      const mg = s.createRadialGradient(mx, my, 0, mx, my, Math.min(w, h) * 0.35);
      mg.addColorStop(0, 'rgba(233,210,160,0.28)');
      mg.addColorStop(1, 'rgba(233,210,160,0)');
      s.fillStyle = mg;
      s.fillRect(0, 0, w, h);
      s.fillStyle = 'rgba(236,230,214,0.85)';
      s.beginPath();
      s.arc(mx, my, Math.min(w, h) * 0.045, 0, Math.PI * 2);
      s.fill();
      drawSkyline(s, w, h);

      const area = (w * h) / (1280 * 720);
      const count = (n: number) => Math.max(4, Math.round(n * Math.min(1.4, area) * (low ? 0.5 : 1)));
      floaters.length = 0;
      for (let i = 0; i < (calm ? 2 : count(7)); i++) floaters.push(spawnFloater(true));
      leaves.length = 0;
      for (let i = 0; i < count(calm ? 6 : 14); i++) leaves.push({ x: rand(0, w), y: rand(0, h), vx: rand(30, 70), vy: rand(10, 30), size: rand(5, 10), phase: rand(0, 6) });
      flies.length = 0;
      for (let i = 0; i < count(26); i++) flies.push({ x: rand(0, w), y: rand(h * 0.45, h * 0.95), vx: rand(-8, 8), vy: rand(-5, 5), size: rand(1.2, 2.4), phase: rand(0, 6) });
      drops.length = 0;
      for (let i = 0; i < count(140); i++) drops.push({ x: rand(0, w), y: rand(0, h), vx: -120, vy: rand(700, 950), size: rand(10, 18), phase: 0 });
      clouds.length = 0;
      for (let i = 0; i < 6; i++) clouds.push({ x: rand(0, w), y: rand(0.05, 0.45) * h, vx: rand(4, 10), vy: 0, size: rand(0.18, 0.32) * w, phase: rand(0.04, 0.09) });
    };

    const frame = (now: number, dt: number) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (sky && sky.width && sky.height) ctx.drawImage(sky, 0, 0, w, h);

      // Clouds
      for (const c of clouds) {
        c.x += c.vx * dt;
        if (c.x - c.size > w) c.x = -c.size;
        const g = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, c.size);
        g.addColorStop(0, `rgba(138,154,163,${c.phase})`);
        g.addColorStop(1, 'rgba(138,154,163,0)');
        ctx.fillStyle = g;
        ctx.fillRect(c.x - c.size, c.y - c.size, c.size * 2, c.size * 2);
      }

      // Floating villagers
      for (let i = 0; i < floaters.length; i++) {
        const f = floaters[i]!;
        f.x += f.vx * dt;
        f.y += (f.vy + Math.sin(now / 900 + f.bob) * 6) * dt;
        f.rot += f.vr * dt;
        if (f.x - f.sprite.width > w + 40) floaters[i] = spawnFloater(false);
        ctx.save();
        ctx.globalAlpha = 0.55 + f.scale * 0.35;
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        if (f.sprite.width && f.sprite.height) ctx.drawImage(f.sprite, -f.sprite.width / 2, -f.sprite.height / 2);
        ctx.restore();
      }

      // Leaves tumbling in the wind
      ctx.fillStyle = '#3b6b40';
      for (const l of leaves) {
        l.x += l.vx * dt;
        l.y += (l.vy + Math.sin(now / 500 + l.phase) * 20) * dt;
        if (l.x > w + 20) l.x = -20;
        if (l.y > h + 20) l.y = -20;
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.rotate(now / 400 + l.phase);
        ctx.beginPath();
        ctx.ellipse(0, 0, l.size, l.size * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Rain
      ctx.strokeStyle = 'rgba(201,216,224,0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const d of drops) {
        d.x += d.vx * dt;
        d.y += d.vy * dt;
        if (d.y > h) {
          d.y = -20;
          d.x = rand(0, w + 100);
        }
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x + d.vx * 0.015, d.y + d.size);
      }
      ctx.stroke();

      // Fireflies
      for (const f of flies) {
        f.x += (f.vx + Math.sin(now / 1300 + f.phase) * 10) * dt;
        f.y += (f.vy + Math.cos(now / 1100 + f.phase) * 8) * dt;
        if (f.x < 0) f.x = w;
        if (f.x > w) f.x = 0;
        if (f.y < h * 0.4) f.y = h * 0.95;
        if (f.y > h) f.y = h * 0.45;
        const a = 0.35 + 0.65 * Math.max(0, Math.sin(now / 600 + f.phase * 3));
        ctx.fillStyle = `rgba(233,196,110,${a * 0.25})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size * 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(250,226,150,${a})`;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
        ctx.fill();
      }

      // The Nizhalpoocha watches: eyes blink open in the dark, then vanish.
      if (eyes.start < 0 && now > eyes.next) {
        eyes = { x: rand(0.08, 0.92) * w, y: rand(0.78, 0.9) * h, start: now, next: 0 };
      }
      if (eyes.start >= 0) {
        const t = (now - eyes.start) / 2600;
        if (t >= 1) eyes = { x: 0, y: 0, start: -1, next: now + rand(5000, 11000) };
        else {
          const open = t < 0.15 ? t / 0.15 : t > 0.85 ? (1 - t) / 0.15 : Math.abs(t - 0.5) < 0.03 ? 0.1 : 1;
          ctx.fillStyle = `rgba(241,180,62,${0.9 * open})`;
          for (const dx of [-9, 9]) {
            ctx.beginPath();
            ctx.ellipse(eyes.x + dx, eyes.y, 5, 3.4 * open, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Lightning
      if (now > nextFlash) {
        flash = useSettings.getState().reduceFlashes ? 0.08 : 0.3;
        nextFlash = now + rand(14000, 30000);
      }
      if (flash > 0.001) {
        ctx.fillStyle = `rgba(223,232,255,${flash})`;
        ctx.fillRect(0, 0, w, h);
        flash *= Math.pow(0.02, dt);
      }
    };

    resize();
    if (reduceMotion) {
      frame(performance.now(), 0);
      return;
    }

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      frame(now, dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [calm]);

  return <canvas ref={ref} aria-hidden className="pointer-events-none fixed inset-0 -z-10 h-full w-full" />;
}
