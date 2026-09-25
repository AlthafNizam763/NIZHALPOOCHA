import type { Appearance } from '@nizhal/shared';
import { appearanceKey, CHAR_H, CHAR_W, drawCharacter } from '@/game/art/character';

/**
 * Tiny 2D "film stage" for the story intro. Every shot is painted in a fixed
 * 1600 × 900 world, and a camera (pan / zoom / roll) frames it on a canvas of
 * any size. Rain, lightning, fades, letterbox and vignette are applied on top in
 * screen space.
 */
export const STAGE_W = 1600;
export const STAGE_H = 900;

export interface Cam {
  x: number;
  y: number;
  z: number;
  rot: number;
}

/** Camera keyframe at normalised shot time `t` (0..1). */
export interface CamKey {
  t: number;
  x: number;
  y: number;
  z: number;
  rot?: number;
}

export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const smooth = (v: number) => {
  const k = clamp01(v);
  return k * k * (3 - 2 * k);
};
/** 0→1 as t goes from a to b (smoothed). */
export const ramp = (t: number, a: number, b: number) => smooth((t - a) / (b - a));

export function camAt(keys: readonly CamKey[], u: number): Cam {
  const first = keys[0]!;
  if (keys.length === 1 || u <= first.t) return { x: first.x, y: first.y, z: first.z, rot: first.rot ?? 0 };
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1]!;
    const b = keys[i]!;
    if (u <= b.t) {
      const k = smooth((u - a.t) / Math.max(1e-6, b.t - a.t));
      return { x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), rot: lerp(a.rot ?? 0, b.rot ?? 0, k) };
    }
  }
  const last = keys[keys.length - 1]!;
  return { x: last.x, y: last.y, z: last.z, rot: last.rot ?? 0 };
}

/** Deterministic PRNG so painted scenery does not shimmer between frames. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Drop {
  x: number;
  y: number;
  len: number;
  speed: number;
}

export interface CharOpts {
  frame?: number;
  flip?: boolean;
  alpha?: number;
  /** Paint the whole figure in this colour (silhouettes, shadows). */
  silhouette?: string;
}

export class Stage {
  readonly ctx: CanvasRenderingContext2D;
  /** Canvas size in device pixels. */
  w = 1;
  h = 1;
  /** Stage-to-device scale before camera zoom ("cover" fit). */
  fit = 1;
  cam: Cam = { x: STAGE_W / 2, y: STAGE_H / 2, z: 1, rot: 0 };
  /** Seconds since the film started (for ambient animation). */
  time = 0;
  /** Current lightning brightness, 0..1. Shots can read it (e.g. to reveal silhouettes). */
  flash = 0;
  private flashQueue: { at: number; peak: number }[] = [];
  private drops: Drop[] = [];
  private sprites = new Map<string, HTMLCanvasElement>();
  private vignette: CanvasGradient | null = null;

  constructor(
    ctx: CanvasRenderingContext2D,
    private readonly opts: { lowQuality: boolean; reduceFlashes: boolean },
  ) {
    this.ctx = ctx;
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.fit = Math.max(w / STAGE_W, h / STAGE_H);
    this.vignette = null;
    const count = this.opts.lowQuality ? 140 : 320;
    const r = rng(7);
    this.drops = Array.from({ length: count }, () => ({ x: r() * w, y: r() * h, len: 14 + r() * 26, speed: 0.9 + r() * 0.5 }));
  }

  /** Units → device pixels at the current camera zoom. */
  get pxPerUnit(): number {
    return this.fit * this.cam.z;
  }

  beginWorld(cam: Cam): void {
    this.cam = cam;
    const c = this.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.translate(this.w / 2, this.h / 2);
    c.rotate(cam.rot);
    c.scale(this.fit * cam.z, this.fit * cam.z);
    c.translate(-cam.x, -cam.y);
  }

  endWorld(): void {
    this.ctx.restore();
  }

  /** Draws a layer that moves `depth` times as fast as the camera (0 = sky, 1 = world). */
  parallax(depth: number, draw: () => void): void {
    const c = this.ctx;
    c.save();
    c.translate((this.cam.x - STAGE_W / 2) * (1 - depth), (this.cam.y - STAGE_H / 2) * (1 - depth));
    draw();
    c.restore();
  }

  // ── Lightning ─────────────────────────────────────────────────────────
  /** A double-strike flash starting now. */
  lightning(power = 1): void {
    const peak = (this.opts.reduceFlashes ? 0.18 : 0.85) * power;
    this.flashQueue.push({ at: this.time, peak }, { at: this.time + 0.16, peak: peak * 0.55 });
  }

  private updateFlash(dt: number): void {
    this.flash = Math.max(0, this.flash - dt * 4.2);
    this.flashQueue = this.flashQueue.filter((f) => {
      if (f.at > this.time) return true;
      this.flash = Math.max(this.flash, f.peak);
      return false;
    });
  }

  // ── Screen-space passes ──────────────────────────────────────────────
  step(dt: number): void {
    this.time += dt;
    this.updateFlash(dt);
  }

  drawRain(dt: number, intensity: number, wind = 1): void {
    if (intensity <= 0) return;
    const c = this.ctx;
    const h = this.h;
    const w = this.w;
    const unit = h / 900;
    const slant = 0.22 * wind;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.strokeStyle = `rgba(190,210,225,${0.2 + intensity * 0.18})`;
    c.lineWidth = Math.max(1, unit * 1.3);
    c.beginPath();
    const n = Math.floor(this.drops.length * intensity);
    for (let i = 0; i < n; i++) {
      const d = this.drops[i]!;
      d.y += d.speed * 1700 * unit * dt;
      d.x -= d.speed * 1700 * unit * dt * slant;
      if (d.y > h + 40) {
        d.y = -40 - Math.random() * 60;
        d.x = Math.random() * (w + 200);
      }
      if (d.x < -60) d.x += w + 120;
      const l = d.len * unit;
      c.moveTo(d.x, d.y);
      c.lineTo(d.x + l * slant, d.y - l);
    }
    c.stroke();
    c.restore();
  }

  drawFlash(): void {
    if (this.flash <= 0.001) return;
    const c = this.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = `rgba(214,226,255,${this.flash * 0.55})`;
    c.fillRect(0, 0, this.w, this.h);
    c.restore();
  }

  /** Solid colour over the frame (fades between shots). */
  fill(color: string, alpha: number): void {
    if (alpha <= 0.001) return;
    const c = this.ctx;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = clamp01(alpha);
    c.fillStyle = color;
    c.fillRect(0, 0, this.w, this.h);
    c.restore();
  }

  drawVignette(): void {
    const c = this.ctx;
    if (!this.vignette) {
      const g = c.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.35, this.w / 2, this.h / 2, Math.hypot(this.w, this.h) * 0.62);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.72)');
      this.vignette = g;
    }
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = this.vignette;
    c.fillRect(0, 0, this.w, this.h);
    c.restore();
  }

  /** Cinema bars; `k` 0..1 slides them in. */
  drawLetterbox(k: number): void {
    if (k <= 0) return;
    const c = this.ctx;
    const bar = this.h * 0.085 * k;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.fillStyle = '#000';
    c.fillRect(0, 0, this.w, bar);
    c.fillRect(0, this.h - bar, this.w, bar);
    c.restore();
  }

  // ── Characters ───────────────────────────────────────────────────────
  private sprite(a: Appearance, frame: number, px: number, silhouette?: string): HTMLCanvasElement {
    const key = `${appearanceKey(a)}|${frame}|${px}|${silhouette ?? ''}`;
    let s = this.sprites.get(key);
    if (s) return s;
    s = document.createElement('canvas');
    const k = px / CHAR_H;
    s.width = Math.ceil(CHAR_W * k);
    s.height = px;
    const c = s.getContext('2d')!;
    c.scale(k, k);
    drawCharacter(c, a, frame);
    if (silhouette) {
      c.setTransform(1, 0, 0, 1, 0, 0);
      c.globalCompositeOperation = 'source-in';
      c.fillStyle = silhouette;
      c.fillRect(0, 0, s.width, s.height);
    }
    if (this.sprites.size > 400) this.sprites.clear();
    this.sprites.set(key, s);
    return s;
  }

  /** Villager standing with feet at (x, y), `height` world units tall. */
  char(a: Appearance, x: number, y: number, height: number, o: CharOpts = {}): void {
    const c = this.ctx;
    const need = height * this.pxPerUnit;
    const px = Math.min(640, Math.max(32, Math.ceil(need / 32) * 32));
    const img = this.sprite(a, o.frame ?? 0, px, o.silhouette);
    const w = (height * CHAR_W) / CHAR_H;
    // Feet sit at y = 68 of the 72-unit frame.
    const top = y - height * (68 / CHAR_H);
    c.save();
    c.globalAlpha *= o.alpha ?? 1;
    if (o.flip) {
      c.translate(x, 0);
      c.scale(-1, 1);
      c.drawImage(img, -w / 2, top, w, height);
    } else {
      c.drawImage(img, x - w / 2, top, w, height);
    }
    c.restore();
  }

  /** Walk-cycle frame for time `t` (0 when standing). */
  walkFrame(t: number, moving = true, speed = 1): number {
    return moving ? Math.floor((t * speed) / 0.14) % 4 : 0;
  }

  text(str: string, x: number, y: number, size: number, color: string, o: { align?: CanvasTextAlign; weight?: number; alpha?: number; font?: 'display' | 'body' } = {}): void {
    const c = this.ctx;
    c.save();
    c.globalAlpha *= o.alpha ?? 1;
    c.fillStyle = color;
    c.textAlign = o.align ?? 'left';
    c.textBaseline = 'alphabetic';
    const family = o.font === 'body' ? 'Manrope, "Baloo Chettan 2", sans-serif' : '"Baloo Chettan 2", sans-serif';
    c.font = `${o.weight ?? 700} ${size}px ${family}`;
    c.fillText(str, x, y);
    c.restore();
  }
}
