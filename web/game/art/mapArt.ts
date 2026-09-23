import * as Phaser from 'phaser';
import type { Decoration, GameMapDef, MapBuilding, Rect } from '@nizhal/shared';

/**
 * Procedural, original art for the Kadalimukku map. Everything is drawn from the
 * shared map definition, so gameplay geometry and visuals can never drift apart.
 */

export const PALETTE = {
  grass: 0x1d3325,
  grassDark: 0x172a1e,
  grassLight: 0x25402d,
  road: 0x2a2e31,
  roadWet: 0x363c41,
  roadEdge: 0x5c3a2a,
  dash: 0xb8b39a,
  water: 0x15323d,
  waterLight: 0x245262,
  bridge: 0x5d6061,
  rail: 0x8b8f8f,
  wall: 0xb9b09c,
  wallTop: 0xe0d8c4,
  wallBase: 0x8e4a32,
  woodFloor: 0x4a3424,
  woodLine: 0x3a281b,
  tileFloor: 0x7a2f22,
  tileLight: 0x8a3a2b,
  concrete: 0x4d5253,
  concreteLine: 0x43484a,
  roof: 0x8f3f2a,
  roofDark: 0x6e2f1f,
  roofRidge: 0xa85a3c,
  lamp: 0xe9b04f,
};

export function makeTextures(scene: Phaser.Scene): void {
  const tex = scene.textures;
  if (tex.exists('grass')) return;

  // Grass tile with speckles
  const g = scene.make.graphics({ x: 0, y: 0 }, false);
  g.fillStyle(PALETTE.grass).fillRect(0, 0, 128, 128);
  const rnd = new Phaser.Math.RandomDataGenerator(['kadalimukku']);
  for (let i = 0; i < 220; i++) {
    g.fillStyle(rnd.pick([PALETTE.grassDark, PALETTE.grassLight, 0x2b4a33]), rnd.realInRange(0.4, 0.9));
    g.fillRect(rnd.between(0, 126), rnd.between(0, 126), rnd.between(1, 3), rnd.between(2, 5));
  }
  g.generateTexture('grass', 128, 128);
  g.clear();

  // Water tile with ripple strokes
  g.fillStyle(PALETTE.water).fillRect(0, 0, 128, 64);
  for (let i = 0; i < 26; i++) {
    g.lineStyle(1, PALETTE.waterLight, rnd.realInRange(0.25, 0.6));
    const x = rnd.between(0, 120);
    const y = rnd.between(2, 62);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + rnd.between(6, 16), y);
    g.strokePath();
  }
  g.generateTexture('water', 128, 64);
  g.clear();

  // Rain streak and ripple
  g.fillStyle(0xc9d8e0, 1).fillRect(0, 0, 2, 16);
  g.generateTexture('rain', 2, 16);
  g.clear();
  g.lineStyle(1.2, 0xc9d8e0, 1).strokeEllipse(8, 4, 14, 6);
  g.generateTexture('ripple', 16, 8);
  g.clear();

  // Soft marker dot
  g.fillStyle(0xffffff, 1).fillCircle(8, 8, 8);
  g.generateTexture('dot', 16, 16);
  g.destroy();

  // Radial light gradients (vision holes + lamp glows)
  const makeRadial = (key: string, size: number, stops: [number, string][]) => {
    const canvas = tex.createCanvas(key, size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const grd = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [at, color] of stops) grd.addColorStop(at, color);
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
  };
  // Vision mask: opaque night with a soft transparent hole in the middle.
  const mask = tex.createCanvas('visionMask', 512, 512);
  if (mask) {
    const ctx = mask.getContext();
    ctx.fillStyle = '#04070b';
    ctx.fillRect(0, 0, 512, 512);
    ctx.globalCompositeOperation = 'destination-out';
    const grd = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    grd.addColorStop(0, 'rgba(0,0,0,1)');
    grd.addColorStop(0.62, 'rgba(0,0,0,1)');
    grd.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 512, 512);
    ctx.globalCompositeOperation = 'source-over';
    mask.refresh();
  }
  makeRadial('glow', 128, [
    [0, 'rgba(255,220,160,0.9)'],
    [0.4, 'rgba(255,190,110,0.35)'],
    [1, 'rgba(255,170,80,0)'],
  ]);
}

function drawRoads(g: Phaser.GameObjects.Graphics, map: GameMapDef) {
  for (const r of map.roads) {
    g.fillStyle(PALETTE.roadEdge, 1).fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
  }
  for (const r of map.roads) {
    g.fillStyle(PALETTE.road, 1).fillRect(r.x, r.y, r.w, r.h);
    // Wet sheen streaks
    g.fillStyle(PALETTE.roadWet, 0.6);
    const horizontal = r.w > r.h;
    const n = Math.floor((horizontal ? r.w : r.h) / 70);
    for (let i = 0; i < n; i++) {
      if (horizontal) g.fillRect(r.x + i * 70 + 10, r.y + 8 + ((i * 13) % (r.h - 16)), 34, 3);
      else g.fillRect(r.x + 8 + ((i * 17) % (r.w - 16)), r.y + i * 70 + 10, 3, 34);
    }
    // Centre dashes on the wide roads
    if (Math.min(r.w, r.h) >= 70) {
      g.fillStyle(PALETTE.dash, 0.45);
      if (horizontal) for (let x = r.x + 10; x < r.x + r.w; x += 60) g.fillRect(x, r.y + r.h / 2 - 1.5, 28, 3);
      else for (let y = r.y + 10; y < r.y + r.h; y += 60) g.fillRect(r.x + r.w / 2 - 1.5, y, 3, 28);
    }
  }
}

function drawBridges(g: Phaser.GameObjects.Graphics, map: GameMapDef) {
  for (const b of map.bridges) {
    g.fillStyle(0x000000, 0.35).fillRect(b.x + 4, b.y + 6, b.w, b.h);
    g.fillStyle(PALETTE.bridge, 1).fillRect(b.x, b.y, b.w, b.h);
    g.lineStyle(1, 0x4c4f50, 1);
    for (let y = b.y + 8; y < b.y + b.h; y += 12) g.lineBetween(b.x + 6, y, b.x + b.w - 6, y);
    g.fillStyle(PALETTE.rail, 1).fillRect(b.x, b.y, 6, b.h).fillRect(b.x + b.w - 6, b.y, 6, b.h);
    for (let y = b.y; y < b.y + b.h; y += 18) {
      g.fillStyle(0xa9adad, 1).fillRect(b.x - 1, y, 8, 5).fillRect(b.x + b.w - 7, y, 8, 5);
    }
  }
}

function drawFloor(g: Phaser.GameObjects.Graphics, b: MapBuilding) {
  const f = b.floor;
  switch (b.floorStyle) {
    case 'wood':
      g.fillStyle(PALETTE.woodFloor, 1).fillRect(f.x, f.y, f.w, f.h);
      g.lineStyle(1, PALETTE.woodLine, 0.9);
      for (let y = f.y + 14; y < f.y + f.h; y += 14) g.lineBetween(f.x, y, f.x + f.w, y);
      for (let y = f.y; y < f.y + f.h; y += 14) {
        const off = ((y - f.y) / 14) % 2 === 0 ? 0 : 45;
        for (let x = f.x + off; x < f.x + f.w; x += 90) g.lineBetween(x, y, x, y + 14);
      }
      break;
    case 'tile':
      g.fillStyle(PALETTE.tileFloor, 1).fillRect(f.x, f.y, f.w, f.h);
      for (let y = f.y; y < f.y + f.h; y += 24)
        for (let x = f.x; x < f.x + f.w; x += 24)
          if (((x - f.x) / 24 + (y - f.y) / 24) % 2 === 0) g.fillStyle(PALETTE.tileLight, 1).fillRect(x, y, 24, 24);
      break;
    case 'mud':
      g.fillStyle(0x4b3a2b, 1).fillRect(f.x, f.y, f.w, f.h);
      break;
    default:
      g.fillStyle(PALETTE.concrete, 1).fillRect(f.x, f.y, f.w, f.h);
      g.lineStyle(1, PALETTE.concreteLine, 1);
      for (let y = f.y + 40; y < f.y + f.h; y += 40) g.lineBetween(f.x, y, f.x + f.w, y);
      for (let x = f.x + 40; x < f.x + f.w; x += 40) g.lineBetween(x, f.y, x, f.y + f.h);
  }
}

export function drawWalls(g: Phaser.GameObjects.Graphics, walls: readonly Rect[]) {
  for (const w of walls) {
    g.fillStyle(0x000000, 0.3).fillRect(w.x + 3, w.y + 4, w.w, w.h);
    g.fillStyle(PALETTE.wallBase, 1).fillRect(w.x, w.y, w.w, w.h);
    g.fillStyle(PALETTE.wall, 1).fillRect(w.x + 1, w.y + 1, w.w - 2, w.h - 4);
    g.fillStyle(PALETTE.wallTop, 1).fillRect(w.x + 1, w.y + 1, w.w - 2, 3);
  }
}

function roofTiles(g: Phaser.GameObjects.Graphics, d: Rect) {
  g.fillStyle(0x000000, 0.35).fillRect(d.x + 6, d.y + 8, d.w, d.h);
  g.fillStyle(PALETTE.roof, 1).fillRect(d.x, d.y, d.w, d.h);
  g.lineStyle(2, PALETTE.roofDark, 1);
  for (let y = d.y + 10; y < d.y + d.h; y += 10) g.lineBetween(d.x, y, d.x + d.w, y);
  g.lineStyle(1, PALETTE.roofDark, 0.6);
  for (let y = d.y; y < d.y + d.h; y += 10)
    for (let x = d.x + (((y - d.y) / 10) % 2 ? 7 : 0); x < d.x + d.w; x += 14) g.lineBetween(x, y, x, y + 10);
  // Ridge + hip lines of a Kerala hipped roof
  const inset = Math.min(d.w, d.h) / 2;
  g.lineStyle(4, PALETTE.roofRidge, 1);
  g.lineBetween(d.x + inset, d.y + d.h / 2, d.x + d.w - inset, d.y + d.h / 2);
  g.lineStyle(3, PALETTE.roofRidge, 0.9);
  g.lineBetween(d.x, d.y, d.x + inset, d.y + d.h / 2);
  g.lineBetween(d.x, d.y + d.h, d.x + inset, d.y + d.h / 2);
  g.lineBetween(d.x + d.w, d.y, d.x + d.w - inset, d.y + d.h / 2);
  g.lineBetween(d.x + d.w, d.y + d.h, d.x + d.w - inset, d.y + d.h / 2);
}

function wood(g: Phaser.GameObjects.Graphics, d: Rect, color = 0x6b4a2f) {
  g.fillStyle(0x000000, 0.3).fillRect(d.x + 2, d.y + 3, d.w, d.h);
  g.fillStyle(color, 1).fillRect(d.x, d.y, d.w, d.h);
  g.fillStyle(0xffffff, 0.12).fillRect(d.x, d.y, d.w, 3);
}

export function drawDecoration(g: Phaser.GameObjects.Graphics, d: Decoration) {
  const cx = d.x + d.w / 2;
  const cy = d.y + d.h / 2;
  switch (d.kind) {
    case 'tree':
      g.fillStyle(0x000000, 0.3).fillEllipse(cx + 4, cy + 6, 26, 12);
      g.fillStyle(0x5b4130, 1).fillCircle(cx, cy, 8);
      g.fillStyle(0x6f5039, 1).fillCircle(cx - 2, cy - 2, 4);
      break;
    case 'lamp':
      g.fillStyle(0x2d2f30, 1).fillCircle(cx, cy, 5);
      g.fillStyle(0xf3d9a0, 1).fillCircle(cx, cy - 1, 2.5);
      break;
    case 'puddle':
      g.fillStyle(0x1c3a4a, 0.75).fillEllipse(cx, cy, d.w, d.h);
      g.lineStyle(1, 0x7fa6b8, 0.35).strokeEllipse(cx - d.w * 0.12, cy - d.h * 0.12, d.w * 0.5, d.h * 0.35);
      break;
    case 'auto': {
      g.fillStyle(0x000000, 0.35).fillRoundedRect(d.x + 3, d.y + 4, d.w, d.h, 10);
      g.fillStyle(0x1a1a1a, 1).fillCircle(d.x + 10, d.y + 6, 5).fillCircle(d.x + 10, d.y + d.h - 6, 5).fillCircle(d.x + d.w - 6, cy, 5);
      g.fillStyle(0xd8b640, 1).fillRoundedRect(d.x + 4, d.y + 4, d.w - 8, d.h - 8, 10);
      g.fillStyle(0x1f2426, 1).fillRoundedRect(d.x + 8, d.y + 6, d.w - 30, d.h - 12, 8);
      g.fillStyle(0x3f7d5c, 1).fillRect(d.x + d.w - 20, d.y + 10, 8, d.h - 20);
      break;
    }
    case 'bicycle':
      g.lineStyle(2, 0x1c1c1c, 1).strokeCircle(d.x + 8, cy, 7).strokeCircle(d.x + d.w - 8, cy, 7);
      g.lineStyle(2, 0x3f5f8a, 1).lineBetween(d.x + 8, cy, cx, cy - 4).lineBetween(cx, cy - 4, d.x + d.w - 8, cy);
      break;
    case 'scooter':
      g.fillStyle(0x000000, 0.35).fillEllipse(cx + 3, cy + 4, d.w, d.h);
      g.fillStyle(0x5a8f9c, 1).fillEllipse(cx, cy, d.w, d.h);
      g.fillStyle(0x222222, 1).fillEllipse(cx + 6, cy, d.w * 0.4, d.h * 0.45);
      g.fillStyle(0xd9d3c4, 1).fillRect(d.x + 2, cy - 12, 4, 24);
      break;
    case 'stall': {
      wood(g, d, 0x5a3e27);
      const stripeA = (d.x + d.y) % 2 ? 0x3f5f8a : 0xc9772b;
      for (let i = 0; i * 12 < d.w; i++) g.fillStyle(i % 2 ? 0xe8e1cf : stripeA, 0.95).fillRect(d.x + i * 12, d.y - 8, Math.min(12, d.w - i * 12), 14);
      g.fillStyle(0xd8b640, 1).fillCircle(d.x + 18, cy + 6, 5).fillCircle(d.x + 30, cy + 8, 4);
      g.fillStyle(0x2f6b4f, 1).fillCircle(d.x + d.w - 22, cy + 6, 6);
      break;
    }
    case 'desk':
    case 'bench':
    case 'shelf':
      wood(g, d, d.kind === 'shelf' ? 0x5b4130 : 0x6b4a2f);
      break;
    case 'counter':
      wood(g, d, 0x5a3e27);
      g.fillStyle(0xc9c2b0, 1).fillCircle(d.x + 20, cy, 5).fillCircle(d.x + 34, cy, 5); // glass tumblers
      g.fillStyle(0x8a6a4a, 1).fillRect(d.x + d.w - 40, d.y + 4, 26, d.h - 8); // tea urn
      break;
    case 'workbench':
      wood(g, d, 0x4f3a2a);
      g.fillStyle(0x9aa0a3, 1).fillRect(d.x + 12, d.y + 8, 22, 5).fillRect(d.x + 50, d.y + 10, 14, 10);
      break;
    case 'house_block':
      roofTiles(g, d);
      break;
    case 'shelter':
      g.fillStyle(0x000000, 0.3).fillRect(d.x + 3, d.y + 5, d.w, d.h + 30);
      g.fillStyle(0x6f7679, 1).fillRect(d.x, d.y, d.w, d.h);
      g.lineStyle(1, 0x5a6164, 1);
      for (let x = d.x + 6; x < d.x + d.w; x += 8) g.lineBetween(x, d.y, x, d.y + d.h);
      break;
    case 'bell':
      g.fillStyle(0x000000, 0.35).fillCircle(cx + 3, cy + 4, 12);
      g.fillStyle(0x3b3b3b, 1).fillCircle(cx, cy, 10);
      g.fillStyle(0xc99a3b, 1).fillCircle(cx, cy, 7);
      g.fillStyle(0xf2cc72, 1).fillCircle(cx - 2, cy - 2, 3);
      break;
    case 'cctv':
      g.fillStyle(0x2d2f30, 1).fillCircle(cx, cy, 6);
      g.fillStyle(0xc9c2b0, 1).fillRoundedRect(cx - 2, cy - 12, 14, 7, 2);
      break;
    case 'pump':
      g.fillStyle(0x000000, 0.35).fillRect(d.x + 3, d.y + 4, d.w, d.h);
      g.fillStyle(0x3f5f8a, 1).fillRoundedRect(d.x, d.y, d.w, d.h, 8);
      g.fillStyle(0x2c4466, 1).fillCircle(cx, cy, 16);
      g.fillStyle(0x9aa0a3, 1).fillRect(d.x + d.w, cy - 4, 40, 8);
      break;
    case 'generator':
      g.fillStyle(0x000000, 0.35).fillRect(d.x + 3, d.y + 4, d.w, d.h);
      g.fillStyle(0xc9772b, 1).fillRoundedRect(d.x, d.y, d.w, d.h, 6);
      g.lineStyle(2, 0x5b3a1b, 1);
      for (let y = d.y + 10; y < d.y + d.h - 6; y += 7) g.lineBetween(d.x + 8, y, d.x + d.w - 8, y);
      break;
    case 'panel':
      g.fillStyle(0x000000, 0.35).fillRect(d.x + 2, d.y + 3, d.w, d.h);
      g.fillStyle(0x5d6568, 1).fillRect(d.x, d.y, d.w, d.h);
      g.fillStyle(0x3f7d5c, 1).fillCircle(d.x + 7, d.y + 8, 2.5);
      g.fillStyle(0xe9b04f, 1).fillCircle(d.x + 15, d.y + 8, 2.5);
      g.fillStyle(0xb5573a, 1).fillCircle(d.x + 23, d.y + 8, 2.5);
      break;
    case 'radio':
      wood(g, d, 0x6b4a2f);
      g.fillStyle(0xd9d3c4, 1).fillCircle(d.x + 9, cy, 5);
      g.lineStyle(1.5, 0x9aa0a3, 1).lineBetween(d.x + d.w - 5, d.y, d.x + d.w + 6, d.y - 16);
      break;
    case 'stage':
      wood(g, d, 0x5a3e27);
      g.fillStyle(0xa23b3b, 0.9).fillRect(d.x, d.y, d.w, 8);
      break;
    case 'well':
      g.fillStyle(0x000000, 0.35).fillCircle(cx + 3, cy + 4, d.w / 2);
      g.fillStyle(0x8b8f8f, 1).fillCircle(cx, cy, d.w / 2);
      g.fillStyle(0x0d1d24, 1).fillCircle(cx, cy, d.w / 2 - 7);
      break;
    case 'banana':
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.fillStyle(0x4f8a3f, 0.9).fillEllipse(cx + Math.cos(a) * 12, cy + Math.sin(a) * 12, 26, 10);
      }
      break;
    case 'drum':
      g.fillStyle(0x000000, 0.35).fillCircle(cx + 2, cy + 3, d.w / 2);
      g.fillStyle(0x3f5f8a, 1).fillCircle(cx, cy, d.w / 2);
      g.lineStyle(2, 0x2c4466, 1).strokeCircle(cx, cy, d.w / 2 - 5);
      break;
    default:
      wood(g, d);
  }
}

/** Coconut palm canopy (drawn above players; faded when someone stands under it). */
export function drawCanopy(g: Phaser.GameObjects.Graphics, cx: number, cy: number, seed: number) {
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + seed;
    const len = 44 + ((i * 7 + Math.floor(seed * 10)) % 12);
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const px = -sa;
    const py = ca;
    const mid = len * 0.5;
    const width = 9;
    // Leaf: base → one side → drooping tip → other side
    const pts = [
      new Phaser.Math.Vector2(cx, cy),
      new Phaser.Math.Vector2(cx + ca * mid + px * width, cy + sa * mid + py * width),
      new Phaser.Math.Vector2(cx + ca * len, cy + sa * len + 4),
      new Phaser.Math.Vector2(cx + ca * mid - px * width, cy + sa * mid - py * width),
    ];
    g.fillStyle(i % 2 ? 0x2f5a37 : 0x3b6b40, 0.95);
    g.fillPoints(pts, true);
    g.lineStyle(1, 0x24472b, 0.9);
    g.lineBetween(cx, cy, cx + ca * len, cy + sa * len + 4);
  }
  g.fillStyle(0x5b4130, 1).fillCircle(cx, cy, 5);
  g.fillStyle(0x7a5a2a, 1).fillCircle(cx - 4, cy + 2, 3.5).fillCircle(cx + 3, cy + 3, 3.5).fillCircle(cx, cy - 3, 3.5);
}

const CHUNK = 800;

/** Draws objects once into GPU textures so the static map costs one quad per chunk per frame. */
function bake(scene: Phaser.Scene, keyPrefix: string, objects: Phaser.GameObjects.GameObject[], area: { x: number; y: number; w: number; h: number }, depth: number) {
  for (let cy = area.y; cy < area.y + area.h; cy += CHUNK) {
    for (let cx = area.x; cx < area.x + area.w; cx += CHUNK) {
      // Chunks overlap by 2px so linear filtering never shows a seam between them.
      const w = Math.min(CHUNK + 2, area.x + area.w - cx);
      const h = Math.min(CHUNK + 2, area.y + area.h - cy);
      const key = `${keyPrefix}_${cx}_${cy}`;
      if (!scene.textures.exists(key)) {
        const tex = scene.textures.addDynamicTexture(key, w, h);
        tex?.draw(objects, -cx, -cy);
      }
      scene.add.image(cx, cy, key).setOrigin(0).setDepth(depth);
    }
  }
}

/**
 * Builds the static map: ground, roads, floors, props and walls are baked into
 * chunked textures; only the canal water stays live (animated), with the banks
 * and bridges baked into a thin overlay above it.
 */
export function drawStatic(scene: Phaser.Scene, map: GameMapDef) {
  const grass = scene.make.tileSprite({ x: 0, y: 0, width: map.width, height: map.height, key: 'grass', origin: { x: 0, y: 0 } }, false);
  const ground = scene.make.graphics({}, false);
  drawRoads(ground, map);
  for (const b of map.buildings) drawFloor(ground, b);
  const props = scene.make.graphics({}, false);
  for (const d of map.decorations) drawDecoration(props, d);
  drawWalls(props, map.walls);
  for (const door of map.doors) {
    props.fillStyle(0x5a4632, 1);
    if (door.orientation === 'h') props.fillRect(door.x, door.y + door.h / 2 - 2, door.w, 4);
    else props.fillRect(door.x + door.w / 2 - 2, door.y, 4, door.h);
  }
  bake(scene, `base_${map.id}`, [grass, ground, props], { x: 0, y: 0, w: map.width, h: map.height }, 0);

  const water = map.water.map((w) => scene.add.tileSprite(w.x, w.y, w.w, w.h, 'water').setOrigin(0).setDepth(1));

  const overlay = scene.make.graphics({}, false);
  for (const w of map.water) {
    overlay.fillStyle(0x3b2e22, 1).fillRect(w.x, w.y - 6, w.w, 6).fillRect(w.x, w.y + w.h, w.w, 6);
    overlay.fillStyle(0x6b6258, 1).fillRect(w.x, w.y - 2, w.w, 2).fillRect(w.x, w.y + w.h, w.w, 2);
  }
  drawBridges(overlay, map);
  const top = Math.min(...map.water.map((w) => w.y), ...map.bridges.map((b) => b.y)) - 8;
  const bottom = Math.max(...map.water.map((w) => w.y + w.h), ...map.bridges.map((b) => b.y + b.h)) + 8;
  bake(scene, `canal_${map.id}`, [overlay], { x: 0, y: top, w: map.width, h: bottom - top }, 2);

  grass.destroy();
  ground.destroy();
  props.destroy();
  overlay.destroy();
  return { water };
}

/** Pre-renders a few palm canopy variants; each tree reuses one as an Image. */
export function makeCanopyTextures(scene: Phaser.Scene, variants = 4): string[] {
  const keys: string[] = [];
  for (let i = 0; i < variants; i++) {
    const key = `canopy_${i}`;
    keys.push(key);
    if (scene.textures.exists(key)) continue;
    const g = scene.make.graphics({}, false);
    drawCanopy(g, 70, 70, i / variants + 0.13);
    g.generateTexture(key, 140, 140);
    g.destroy();
  }
  return keys;
}

export function isCanopy(d: Decoration) {
  return d.kind === 'tree';
}
