import { rng, type Stage } from './stage';

/**
 * Procedural scenery for the story intro: original, simplified Kerala motifs
 * (coconut palms, two-tier tiled roofs, a tea shop, KSEB poles, autorickshaws)
 * painted with plain canvas calls so no image assets are needed.
 */

export const C = {
  skyTop: '#060b12',
  skyBottom: '#15232b',
  hill: '#0c1614',
  far: '#0f1b18',
  mid: '#0a1310',
  near: '#070d0b',
  roof: '#5a2317',
  roofDark: '#3a160e',
  wall: '#1f2a26',
  wallLit: '#3a3a2c',
  wood: '#4a2c16',
  lamp: '#f1b43e',
  lampHot: '#ffd98a',
  road: '#141c1d',
  water: '#0e2229',
  paper: '#ece6d6',
  laterite: '#7a2f22',
  floor: '#4a1a13',
};

type Ctx = CanvasRenderingContext2D;

function poly(c: Ctx, pts: readonly (readonly [number, number])[], fill: string): void {
  c.fillStyle = fill;
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.closePath();
  c.fill();
}

/** Additive radial glow. */
export function glow(s: Stage, x: number, y: number, r: number, color: string, alpha: number): void {
  if (alpha <= 0.002) return;
  const c = s.ctx;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  c.save();
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = Math.min(1, alpha);
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
  c.restore();
}

export function sky(s: Stage, top = C.skyTop, bottom = C.skyBottom): void {
  const c = s.ctx;
  const g = c.createLinearGradient(0, -300, 0, 1000);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  c.fillStyle = g;
  c.fillRect(-900, -600, 3400, 2100);
  // Lightning lifts the whole sky for an instant.
  if (s.flash > 0) {
    c.fillStyle = `rgba(120,140,190,${s.flash * 0.35})`;
    c.fillRect(-900, -600, 3400, 2100);
  }
}

export function clouds(s: Stage, y: number, color: string, alpha: number, speed: number, seed: number): void {
  const c = s.ctx;
  const r = rng(seed);
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = color;
  for (let i = 0; i < 14; i++) {
    const w = 260 + r() * 360;
    const span = 3200;
    const x = ((r() * span + s.time * speed * 20) % span) - 800;
    const yy = y + r() * 120 - 60;
    c.beginPath();
    c.ellipse(x, yy, w / 2, 34 + r() * 30, 0, 0, Math.PI * 2);
    c.ellipse(x + w * 0.22, yy - 22, w / 3, 30 + r() * 20, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

export function hills(s: Stage, baseY: number, color: string, amp: number, seed: number): void {
  const c = s.ctx;
  const r = rng(seed);
  const pts: [number, number][] = [[-900, 1500]];
  for (let x = -900; x <= 2500; x += 140) pts.push([x, baseY - r() * amp - Math.sin(x / 420 + seed) * amp * 0.5]);
  pts.push([2500, 1500]);
  poly(c, pts, color);
}

/** Coconut palm with swaying fronds. */
export function palm(s: Stage, x: number, baseY: number, h: number, lean: number, color: string, wind = 1): void {
  const c = s.ctx;
  const sway = Math.sin(s.time * 1.6 + x * 0.013) * 0.07 * wind;
  const tx = x + lean + sway * h * 0.4;
  const ty = baseY - h;
  c.strokeStyle = color;
  c.lineCap = 'round';
  c.lineWidth = h * 0.04;
  c.beginPath();
  c.moveTo(x, baseY);
  c.quadraticCurveTo(x + lean * 0.15, baseY - h * 0.55, tx, ty);
  c.stroke();
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.4 + sway * 3 + Math.sin(s.time * 2.3 + i) * 0.03 * wind;
    const len = h * (0.4 + (i % 3) * 0.05);
    // Each rib arcs up and out, then droops under its own weight.
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.45 + len * 0.5 * Math.abs(Math.cos(a));
    const cx = tx + Math.cos(a) * len * 0.5;
    const cy = ty + Math.sin(a) * len * 0.55 - len * 0.22;
    c.lineWidth = h * 0.012;
    c.beginPath();
    c.moveTo(tx, ty);
    c.quadraticCurveTo(cx, cy, ex, ey);
    c.stroke();
    // Feather-like leaflets on both sides of the rib, pointing towards the tip.
    c.lineWidth = h * 0.007;
    c.beginPath();
    for (let k = 1; k <= 10; k++) {
      const u = k / 11;
      const px = (1 - u) * (1 - u) * tx + 2 * (1 - u) * u * cx + u * u * ex;
      const py = (1 - u) * (1 - u) * ty + 2 * (1 - u) * u * cy + u * u * ey;
      let dx = 2 * (1 - u) * (cx - tx) + 2 * u * (ex - cx);
      let dy = 2 * (1 - u) * (cy - ty) + 2 * u * (ey - cy);
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl;
      dy /= dl;
      const l = len * 0.17 * (1 - u * 0.55);
      for (const side of [0.85, -0.85]) {
        let lx = dx * Math.cos(side) - dy * Math.sin(side);
        let ly = dx * Math.sin(side) + dy * Math.cos(side) + 0.55;
        const n = Math.hypot(lx, ly) || 1;
        lx /= n;
        ly /= n;
        c.moveTo(px, py);
        c.lineTo(px + lx * l, py + ly * l);
      }
    }
    c.stroke();
  }
  c.fillStyle = color;
  c.beginPath();
  c.arc(tx, ty + h * 0.03, h * 0.035, 0, Math.PI * 2);
  c.fill();
}

export interface HouseOpts {
  roof?: string;
  wall?: string;
  /** Window light 0..1. */
  lit?: number;
  /** Veranda pillars along the front. */
  veranda?: boolean;
  gable?: boolean;
}

/** Kerala house: laterite/whitewashed walls under a steep two-tier tiled roof with a gable. */
export function keralaHouse(s: Stage, x: number, baseY: number, w: number, h: number, o: HouseOpts = {}): void {
  const c = s.ctx;
  const top = baseY - h;
  const roof = o.roof ?? C.roof;
  const flashLift = s.flash * 0.25;
  c.fillStyle = o.wall ?? C.wall;
  c.fillRect(x - w / 2, top, w, h);
  // lower roof tier with a slight upturn at the eaves
  poly(c, [
    [x - w * 0.64, top + h * 0.1],
    [x - w * 0.56, top + h * 0.02],
    [x - w * 0.3, top - h * 0.55],
    [x + w * 0.3, top - h * 0.55],
    [x + w * 0.56, top + h * 0.02],
    [x + w * 0.64, top + h * 0.1],
  ], roof);
  // tile courses
  c.strokeStyle = C.roofDark;
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 1; i < 6; i++) {
    const yy = top - h * 0.55 + (h * 0.62 * i) / 6;
    const half = w * 0.3 + (w * 0.3 * i) / 6;
    c.moveTo(x - half, yy);
    c.lineTo(x + half, yy);
  }
  c.stroke();
  if (o.gable !== false) {
    poly(c, [
      [x - w * 0.2, top - h * 0.52],
      [x, top - h * 0.95],
      [x + w * 0.2, top - h * 0.52],
    ], roof);
    poly(c, [
      [x - w * 0.12, top - h * 0.55],
      [x, top - h * 0.82],
      [x + w * 0.12, top - h * 0.55],
    ], C.wood);
    // lattice on the gable face (mukhappu)
    c.strokeStyle = '#2a170c';
    c.lineWidth = 1.5;
    c.beginPath();
    for (let i = -2; i <= 2; i++) {
      c.moveTo(x + i * w * 0.03, top - h * 0.56);
      c.lineTo(x + i * w * 0.015, top - h * 0.78);
    }
    c.stroke();
    // upturned finials
    c.strokeStyle = roof;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x - w * 0.21, top - h * 0.53);
    c.quadraticCurveTo(x - w * 0.25, top - h * 0.6, x - w * 0.24, top - h * 0.66);
    c.moveTo(x + w * 0.21, top - h * 0.53);
    c.quadraticCurveTo(x + w * 0.25, top - h * 0.6, x + w * 0.24, top - h * 0.66);
    c.stroke();
  }
  // door + windows
  c.fillStyle = '#0a0f0d';
  c.fillRect(x - w * 0.07, baseY - h * 0.62, w * 0.14, h * 0.62);
  const lit = o.lit ?? 0;
  for (const wx of [-0.3, 0.2]) {
    c.fillStyle = '#0a0f0d';
    c.fillRect(x + w * wx, top + h * 0.28, w * 0.1, h * 0.28);
    if (lit > 0) {
      c.fillStyle = `rgba(241,180,62,${0.75 * lit})`;
      c.fillRect(x + w * wx + 2, top + h * 0.28 + 2, w * 0.1 - 4, h * 0.28 - 4);
      glow(s, x + w * (wx + 0.05), top + h * 0.42, w * 0.22, 'rgba(241,180,62,0.6)', lit * 0.5);
    }
  }
  if (o.veranda) {
    c.fillStyle = C.wood;
    for (let i = 0; i < 5; i++) c.fillRect(x - w * 0.5 + (i * w) / 4 - 4, top + 4, 8, h - 4);
  }
  if (flashLift > 0) {
    c.fillStyle = `rgba(160,180,220,${flashLift * 0.5})`;
    c.fillRect(x - w / 2, top, w, h);
  }
}

/** Street lamp; `on` 0..1 (flickering handled by the caller). */
export function streetLamp(s: Stage, x: number, baseY: number, h: number, on: number): void {
  const c = s.ctx;
  c.fillStyle = '#0c1210';
  c.fillRect(x - 3, baseY - h, 6, h);
  c.fillRect(x - 3, baseY - h, 34, 5);
  c.fillStyle = on > 0.1 ? C.lampHot : '#2a2a24';
  c.fillRect(x + 20, baseY - h + 4, 16, 6);
  if (on > 0) {
    glow(s, x + 28, baseY - h + 10, 120, 'rgba(241,180,62,0.9)', on * 0.55);
    // light cone on the ground
    c.save();
    c.globalCompositeOperation = 'lighter';
    const g = c.createLinearGradient(0, baseY - h, 0, baseY);
    g.addColorStop(0, `rgba(241,180,62,${0.28 * on})`);
    g.addColorStop(1, `rgba(241,180,62,${0.04 * on})`);
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(x + 22, baseY - h + 10);
    c.lineTo(x + 34, baseY - h + 10);
    c.lineTo(x + 28 + h * 0.45, baseY);
    c.lineTo(x + 28 - h * 0.45, baseY);
    c.closePath();
    c.fill();
    c.restore();
    glow(s, x + 28, baseY, h * 0.5, 'rgba(241,180,62,0.5)', on * 0.3);
  }
}

/** KSEB concrete pole with sagging wires to the next pole. */
export function ksebPole(s: Stage, x: number, baseY: number, h: number, nextX?: number): void {
  const c = s.ctx;
  c.fillStyle = '#1a201e';
  poly(c, [
    [x - 5, baseY],
    [x - 3, baseY - h],
    [x + 3, baseY - h],
    [x + 5, baseY],
  ], '#1a201e');
  c.fillRect(x - 24, baseY - h + 10, 48, 4);
  if (nextX !== undefined) {
    c.strokeStyle = 'rgba(20,26,24,0.9)';
    c.lineWidth = 1.5;
    for (const dx of [-20, 0, 20]) {
      c.beginPath();
      c.moveTo(x + dx, baseY - h + 11);
      const sag = 26 + Math.sin(s.time * 1.5 + dx) * 3;
      c.quadraticCurveTo((x + nextX) / 2 + dx, baseY - h + 11 + sag, nextX + dx, baseY - h + 11);
      c.stroke();
    }
  }
}

/** Autorickshaw (side view), feet line at baseY. */
export function auto(s: Stage, x: number, baseY: number, k: number, lights = 1): void {
  const c = s.ctx;
  c.save();
  c.translate(x, baseY);
  c.scale(k, k);
  // canopy
  poly(c, [
    [-70, -78],
    [40, -86],
    [62, -60],
    [62, -40],
    [-70, -40],
  ], '#101512');
  // body
  poly(c, [
    [-76, -42],
    [58, -42],
    [74, -20],
    [78, -8],
    [-76, -8],
  ], '#d8b640');
  c.fillStyle = '#1b1f1c';
  c.fillRect(-76, -22, 154, 8);
  c.fillStyle = '#0a0d0c';
  c.fillRect(-20, -72, 50, 30); // cabin opening
  // wheels
  c.fillStyle = '#050706';
  for (const wx of [-48, 60]) {
    c.beginPath();
    c.arc(wx, -4, 14, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
  if (lights > 0) {
    glow(s, x + 76 * k, baseY - 26 * k, 90 * k, 'rgba(255,236,190,0.9)', 0.6 * lights);
  }
}

export function puddle(s: Stage, x: number, y: number, w: number, reflect = 0.35): void {
  const c = s.ctx;
  c.fillStyle = `rgba(40,70,82,${reflect})`;
  c.beginPath();
  c.ellipse(x, y, w / 2, w / 9, 0, 0, Math.PI * 2);
  c.fill();
  // expanding rain ripples
  c.strokeStyle = 'rgba(170,200,215,0.35)';
  c.lineWidth = 1.2;
  for (let i = 0; i < 4; i++) {
    const p = (s.time * 1.2 + i * 0.27 + x * 0.001) % 1;
    const rx = x + Math.sin(i * 12.3 + Math.floor(s.time * 1.2 + i * 0.27)) * w * 0.3;
    c.globalAlpha = 1 - p;
    c.beginPath();
    c.ellipse(rx, y, 4 + p * 18, 1 + p * 4, 0, 0, Math.PI * 2);
    c.stroke();
  }
  c.globalAlpha = 1;
}

/** Wet road band with lamp reflections. */
export function road(s: Stage, y: number, h: number, reflections: readonly { x: number; on: number }[] = []): void {
  const c = s.ctx;
  c.fillStyle = C.road;
  c.fillRect(-900, y, 3400, h);
  for (const r of reflections) {
    if (r.on <= 0) continue;
    const g = c.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, `rgba(241,180,62,${0.3 * r.on})`);
    g.addColorStop(1, 'rgba(241,180,62,0)');
    c.fillStyle = g;
    c.fillRect(r.x - 14, y, 28, h);
  }
}

/** Ground splashes from heavy rain. */
export function splashes(s: Stage, x0: number, x1: number, y0: number, y1: number, n: number): void {
  const c = s.ctx;
  c.strokeStyle = 'rgba(190,210,225,0.4)';
  c.lineWidth = 1.2;
  c.beginPath();
  for (let i = 0; i < n; i++) {
    const cycle = Math.floor(s.time * 3 + i * 0.37);
    const r = rng(cycle * 131 + i);
    const p = (s.time * 3 + i * 0.37) % 1;
    const x = x0 + r() * (x1 - x0);
    const y = y0 + r() * (y1 - y0);
    const sz = 2 + p * 6;
    c.moveTo(x - sz, y);
    c.quadraticCurveTo(x, y - sz * 1.2, x + sz, y);
  }
  c.stroke();
}

/** Tea shop front: tin roof, counter, glass jars, a bare bulb and a Malayalam board. */
export function teaShop(s: Stage, x: number, baseY: number, bulb: number): void {
  const c = s.ctx;
  const w = 320;
  const h = 200;
  c.fillStyle = '#1a211e';
  c.fillRect(x - w / 2, baseY - h, w, h);
  c.fillStyle = '#0b100e';
  c.fillRect(x - w / 2 + 20, baseY - h + 40, w - 40, h - 40);
  // tin roof
  poly(c, [
    [x - w / 2 - 30, baseY - h + 10],
    [x + w / 2 + 30, baseY - h + 10],
    [x + w / 2 + 10, baseY - h - 22],
    [x - w / 2 - 10, baseY - h - 22],
  ], '#3b4640');
  c.strokeStyle = '#27302c';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = -w / 2; i < w / 2; i += 16) {
    c.moveTo(x + i, baseY - h - 20);
    c.lineTo(x + i - 8, baseY - h + 8);
  }
  c.stroke();
  // signboard
  c.fillStyle = '#2f4f3a';
  c.fillRect(x - 90, baseY - h - 62, 180, 36);
  c.strokeStyle = '#d8b640';
  c.strokeRect(x - 90, baseY - h - 62, 180, 36);
  s.text('ചായക്കട', x, baseY - h - 36, 24, C.paper, { align: 'center' });
  // counter with jars
  c.fillStyle = C.wood;
  c.fillRect(x - w / 2 + 10, baseY - 70, w - 20, 70);
  for (let i = 0; i < 5; i++) {
    const jx = x - 110 + i * 50;
    c.fillStyle = 'rgba(160,190,200,0.25)';
    c.fillRect(jx, baseY - 104, 30, 34);
    c.fillStyle = ['#c78a3a', '#8a5a2a', '#d8b640', '#b5573a', '#7bb592'][i]!;
    c.fillRect(jx + 3, baseY - 92, 24, 20);
  }
  // bulb
  c.strokeStyle = '#111';
  c.beginPath();
  c.moveTo(x, baseY - h + 40);
  c.lineTo(x, baseY - h + 70);
  c.stroke();
  c.fillStyle = bulb > 0.1 ? C.lampHot : '#333';
  c.beginPath();
  c.arc(x, baseY - h + 76, 7, 0, Math.PI * 2);
  c.fill();
  glow(s, x, baseY - h + 76, 220, 'rgba(255,200,120,0.9)', bulb * 0.6);
}

/** Two tumblers of chaya with rising steam. */
export function steam(s: Stage, x: number, y: number, alpha = 1): void {
  const c = s.ctx;
  c.strokeStyle = `rgba(220,225,230,${0.25 * alpha})`;
  c.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const p = (s.time * 0.5 + i / 3) % 1;
    c.globalAlpha = 1 - p;
    c.beginPath();
    c.moveTo(x + i * 6 - 6, y - p * 40);
    c.bezierCurveTo(x + 8 + i * 6 - 6, y - 10 - p * 40, x - 8 + i * 6 - 6, y - 20 - p * 40, x + i * 6 - 6, y - 30 - p * 40);
    c.stroke();
  }
  c.globalAlpha = 1;
}

/** CCTV camera on a bracket, with a blinking red LED. */
export function cctv(s: Stage, x: number, y: number, k: number, ledOn: boolean): void {
  const c = s.ctx;
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  c.fillStyle = '#1d2422';
  c.fillRect(-4, -60, 8, 70);
  c.fillRect(-4, -60, 40, 8);
  c.save();
  c.translate(40, -48);
  c.rotate(0.35);
  c.fillStyle = '#cfd4d2';
  c.fillRect(-10, -12, 70, 26);
  c.fillStyle = '#9aa3a0';
  c.fillRect(-10, 8, 70, 6);
  c.fillStyle = '#0a0d0c';
  c.beginPath();
  c.arc(62, 1, 9, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#20343d';
  c.beginPath();
  c.arc(62, 1, 5, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = ledOn ? '#ff3b30' : '#3a1210';
  c.beginPath();
  c.arc(4, -4, 3.5, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.restore();
  if (ledOn) glow(s, x + (44 + 4) * k, y - 50 * k, 30 * k, 'rgba(255,60,48,0.9)', 0.7);
}

/** A grey concrete pump house with a pipe pouring into a tank. `flow` 0..1. */
export function pumpHouse(s: Stage, x: number, baseY: number, flow: number, gauge: number): void {
  const c = s.ctx;
  c.fillStyle = '#26302d';
  c.fillRect(x - 170, baseY - 230, 340, 230);
  c.fillStyle = '#1b2321';
  c.fillRect(x - 190, baseY - 250, 380, 24);
  c.fillStyle = '#0b100e';
  c.fillRect(x - 50, baseY - 150, 100, 150);
  s.text('പമ്പ് ഹൗസ്', x, baseY - 190, 26, C.paper, { align: 'center' });
  // gauge
  c.fillStyle = '#d9dcd6';
  c.beginPath();
  c.arc(x + 110, baseY - 140, 26, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#b5573a';
  c.lineWidth = 3;
  const a = Math.PI * (0.8 + 1.4 * (1 - gauge));
  c.beginPath();
  c.moveTo(x + 110, baseY - 140);
  c.lineTo(x + 110 + Math.cos(a) * 20, baseY - 140 + Math.sin(a) * 20);
  c.stroke();
  // pipe
  c.fillStyle = '#56605c';
  c.fillRect(x + 170, baseY - 120, 120, 22);
  c.fillRect(x + 270, baseY - 120, 22, 40);
  // water stream
  if (flow > 0.02) {
    c.fillStyle = `rgba(140,190,210,${0.25 + flow * 0.4})`;
    const sw = 4 + flow * 14;
    c.fillRect(x + 281 - sw / 2, baseY - 80, sw, 70);
  } else {
    const p = (s.time * 1.6) % 1;
    c.fillStyle = 'rgba(140,190,210,0.6)';
    c.beginPath();
    c.arc(x + 281, baseY - 78 + p * 60, 3, 0, Math.PI * 2);
    c.fill();
  }
  // tank
  c.fillStyle = '#1d2826';
  c.fillRect(x + 220, baseY - 20, 130, 20);
}

/** Canal water with drifting highlights; `level` raises the water line. */
export function canal(s: Stage, y: number, level: number): void {
  const c = s.ctx;
  const top = y - level;
  c.fillStyle = C.water;
  c.fillRect(-900, top, 3400, 1500);
  c.strokeStyle = 'rgba(120,170,190,0.25)';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < 40; i++) {
    const r = rng(i * 17);
    const x = ((r() * 3400 + s.time * 30) % 3400) - 900;
    const yy = top + 10 + r() * 180;
    c.moveTo(x, yy);
    c.lineTo(x + 30 + r() * 40, yy);
  }
  c.stroke();
}

/** Sitting cat silhouette; `eyes` 0..1. (x, y) is the base centre. */
export function catSilhouette(s: Stage, x: number, y: number, k: number, eyes: number, color = '#030506'): void {
  const c = s.ctx;
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  c.fillStyle = color;
  c.strokeStyle = color;
  c.lineCap = 'round';
  c.lineWidth = 9;
  // tail curling like smoke
  c.beginPath();
  c.moveTo(30, -8);
  c.bezierCurveTo(70, -10, 72, -60, 50, -66);
  c.stroke();
  // body
  c.beginPath();
  c.moveTo(-34, 0);
  c.bezierCurveTo(-40, -50, -24, -78, 0, -80);
  c.bezierCurveTo(24, -78, 40, -50, 34, 0);
  c.closePath();
  c.fill();
  // head + ears
  c.beginPath();
  c.moveTo(-24, -96);
  c.lineTo(-26, -130);
  c.lineTo(-10, -114);
  c.quadraticCurveTo(0, -118, 10, -114);
  c.lineTo(26, -130);
  c.lineTo(24, -96);
  c.quadraticCurveTo(24, -74, 0, -72);
  c.quadraticCurveTo(-24, -74, -24, -96);
  c.fill();
  c.restore();
  if (eyes > 0) {
    c.save();
    c.fillStyle = `rgba(241,180,62,${eyes})`;
    for (const ex of [-10, 10]) {
      c.beginPath();
      c.ellipse(x + ex * k, y - 98 * k, 5 * k, 3.2 * k, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    glow(s, x, y - 98 * k, 40 * k, 'rgba(241,180,62,0.9)', eyes * 0.4);
  }
}

export function pawprint(s: Stage, x: number, y: number, k: number, alpha: number, color = '#0a0f0d'): void {
  if (alpha <= 0) return;
  const c = s.ctx;
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, 9 * k, 7 * k, 0, 0, Math.PI * 2);
  c.fill();
  for (const [dx, dy] of [[-9, -10], [-3, -14], [3, -14], [9, -10]] as const) {
    c.beginPath();
    c.ellipse(x + dx * k, y + dy * k, 3.2 * k, 4 * k, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/** Brass nilavilakku oil lamp with a living flame. */
export function nilavilakku(s: Stage, x: number, baseY: number, k: number): void {
  const c = s.ctx;
  c.save();
  c.translate(x, baseY);
  c.scale(k, k);
  c.fillStyle = '#b8892e';
  c.beginPath();
  c.ellipse(0, 0, 30, 7, 0, 0, Math.PI * 2);
  c.fill();
  c.fillRect(-4, -90, 8, 90);
  c.beginPath();
  c.ellipse(0, -90, 26, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  const flick = 1 + Math.sin(s.time * 13) * 0.08 + Math.sin(s.time * 7.3) * 0.06;
  c.fillStyle = C.lampHot;
  for (const fx of [-18, 0, 18]) {
    c.beginPath();
    c.ellipse(x + fx * k, baseY - 100 * k, 3.5 * k, 9 * k * flick, 0, 0, Math.PI * 2);
    c.fill();
  }
  glow(s, x, baseY - 100 * k, 160 * k * flick, 'rgba(255,190,90,0.95)', 0.55);
}

/** Black umbrella leaning or opened. */
export function umbrella(s: Stage, x: number, y: number, k: number, alpha = 1): void {
  if (alpha <= 0) return;
  const c = s.ctx;
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.scale(k, k);
  c.rotate(-0.25);
  c.fillStyle = '#101418';
  c.beginPath();
  c.moveTo(0, -80);
  c.lineTo(10, 0);
  c.lineTo(-10, 0);
  c.closePath();
  c.fill();
  c.strokeStyle = '#6b4a2f';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, 16);
  c.arc(-5, 16, 5, 0, Math.PI);
  c.stroke();
  c.restore();
}

export function bicycle(s: Stage, x: number, y: number, k: number, alpha = 1): void {
  if (alpha <= 0) return;
  const c = s.ctx;
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.scale(k, k);
  c.strokeStyle = '#1f2c2a';
  c.lineWidth = 4;
  for (const wx of [-40, 40]) {
    c.beginPath();
    c.arc(wx, -24, 24, 0, Math.PI * 2);
    c.stroke();
  }
  c.strokeStyle = '#2e4a6b';
  c.beginPath();
  c.moveTo(-40, -24);
  c.lineTo(-6, -24);
  c.lineTo(20, -56);
  c.lineTo(40, -24);
  c.moveTo(-6, -24);
  c.lineTo(-16, -58);
  c.lineTo(20, -56);
  c.moveTo(-24, -60);
  c.lineTo(-8, -60);
  c.moveTo(20, -56);
  c.lineTo(24, -68);
  c.lineTo(34, -68);
  c.stroke();
  c.restore();
}

/** Puff of dark smoke for a vanishing object; p = 0..1 progress. */
export function puff(s: Stage, x: number, y: number, p: number): void {
  if (p <= 0 || p >= 1) return;
  const c = s.ctx;
  c.save();
  c.globalAlpha = (1 - p) * 0.6;
  c.fillStyle = '#05080a';
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    c.beginPath();
    c.arc(x + Math.cos(a) * p * 40, y + Math.sin(a) * p * 26 - p * 30, 10 + p * 16, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/** Bus shelter: concrete posts under a slanted roof, rain dripping off the edge. */
export function busShelter(s: Stage, x: number, baseY: number, w: number): void {
  const c = s.ctx;
  c.fillStyle = '#2b3531';
  c.fillRect(x - w / 2, baseY - 300, w, 300);
  c.fillStyle = '#39443f';
  poly(c, [
    [x - w / 2 - 40, baseY - 300],
    [x + w / 2 + 40, baseY - 320],
    [x + w / 2 + 40, baseY - 300],
    [x - w / 2 - 40, baseY - 282],
  ], '#39443f');
  c.fillStyle = '#1f2825';
  for (const px of [x - w / 2, x + w / 2 - 14]) c.fillRect(px, baseY - 300, 14, 300);
  c.fillStyle = C.wood;
  c.fillRect(x - w / 2 + 30, baseY - 70, w - 60, 12);
  // drips along the roof edge
  c.fillStyle = 'rgba(180,205,220,0.6)';
  for (let i = 0; i < 18; i++) {
    const p = (s.time * 1.4 + i * 0.29) % 1;
    const dx = x - w / 2 - 30 + ((w + 60) * i) / 17;
    c.fillRect(dx, baseY - 290 + p * 290, 2, 8);
  }
}
