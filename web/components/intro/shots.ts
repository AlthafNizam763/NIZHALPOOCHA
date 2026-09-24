import type { Appearance } from '@nizhal/shared';
import { audio } from '@/services/audio';
import type { I18nKey } from '@/utils/i18n';
import { CAST, type CastId } from '@/game/cast';
import { clamp01, ramp, rng, type CamKey, type Stage } from './stage';
import {
  C,
  auto,
  bicycle,
  busShelter,
  canal,
  catSilhouette,
  cctv,
  clouds,
  glow,
  hills,
  keralaHouse,
  ksebPole,
  nilavilakku,
  palm,
  pawprint,
  puddle,
  puff,
  pumpHouse,
  road,
  sky,
  splashes,
  steam,
  streetLamp,
  teaShop,
  umbrella,
} from './scenery';

type Tr = (key: I18nKey) => string;

export interface Shot {
  id: string;
  /** Seconds. */
  dur: number;
  cam: readonly CamKey[];
  /** Screen rain 0..1 (or per-moment), and wind strength. */
  rain: number | ((t: number) => number);
  wind?: number;
  /** Seconds fading up from black (0 = hard cut). */
  fadeIn: number;
  subs: readonly { at: number; key: I18nKey }[];
  cues?: readonly { at: number; run: (s: Stage) => void }[];
  draw: (s: Stage, t: number, tr: Tr) => void;
}

const cast = (id: CastId): Appearance => CAST[id].appearance;
/** On/off pattern for a failing bulb. */
const flicker = (t: number, seed: number, rate = 14) => (rng(Math.floor(t * rate) * 97 + seed)() > 0.42 ? 1 : 0.06);

/** Draw with an identity transform; `u` = device pixels per 1/900 of screen height. */
function screen(s: Stage, draw: (u: number) => void): void {
  const c = s.ctx;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  draw(s.h / 900);
  c.restore();
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string): void {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.strokeStyle = stroke;
    c.lineWidth = 3;
    c.stroke();
  }
}

/** Far town strip used by several exteriors. */
function farTown(s: Stage, baseY: number, lit: number, seed: number): void {
  const r = rng(seed);
  for (let i = 0; i < 16; i++) {
    const x = -300 + i * 150 + r() * 60;
    keralaHouse(s, x, baseY + r() * 20, 90 + r() * 40, 50 + r() * 16, { roof: '#2a120c', wall: '#121a17', lit: r() > 0.4 ? lit : 0, gable: r() > 0.5 });
  }
}

const LINEUP: CastId[] = ['ammu', 'joseph', 'rahul', 'fathima', 'meera'];

export const SHOTS: readonly Shot[] = [
  // 1 ── Black screen + rain
  {
    id: 'black',
    dur: 5,
    cam: [{ t: 0, x: 800, y: 450, z: 1 }],
    rain: 0,
    fadeIn: 0,
    subs: [{ at: 1.2, key: 'intro.l1' }],
    cues: [
      { at: 0.8, run: () => audio.play('thunder') },
      { at: 3.4, run: (s) => s.lightning(0.45) },
    ],
    draw: (s) => {
      s.fill('#000', 1);
      if (s.flash > 0.01) {
        s.ctx.save();
        s.ctx.globalAlpha = s.flash;
        sky(s, '#0d1522', '#26394a');
        hills(s, 620, '#050807', 120, 11);
        s.ctx.restore();
      }
    },
  },

  // 2 ── Kadalimukku establishing shot
  {
    id: 'establishing',
    dur: 8,
    cam: [
      { t: 0, x: 640, y: 380, z: 1 },
      { t: 1, x: 830, y: 470, z: 1.2 },
    ],
    rain: 0.75,
    fadeIn: 1.2,
    subs: [{ at: 0.6, key: 'intro.l2' }],
    cues: [{ at: 5.2, run: (s) => s.lightning(0.35) }],
    draw: (s, t, tr) => {
      sky(s);
      glow(s, 1180, 140, 260, 'rgba(160,180,210,0.5)', 0.22);
      clouds(s, 110, '#1b2630', 0.8, 1, 1);
      s.parallax(0.25, () => {
        const c = s.ctx;
        c.fillStyle = '#0c1a20'; // the sea, far left
        c.fillRect(-900, 540, 1300, 200);
        c.strokeStyle = 'rgba(150,180,200,0.18)';
        c.beginPath();
        for (let i = 0; i < 20; i++) {
          const x = -800 + ((i * 97 + s.time * 12) % 1200);
          c.moveTo(x, 560 + (i % 5) * 14);
          c.lineTo(x + 40, 560 + (i % 5) * 14);
        }
        c.stroke();
        hills(s, 560, C.hill, 80, 3);
      });
      clouds(s, 260, '#141e25', 0.6, 1.6, 2);
      s.parallax(0.55, () => {
        farTown(s, 690, 1, 5);
        for (const x of [-200, 180, 520, 1250, 1620]) palm(s, x, 700, 190, 20, C.far);
        // water tank + KSEB tower silhouettes
        const c = s.ctx;
        c.fillStyle = C.far;
        c.fillRect(960, 520, 12, 170);
        c.fillRect(1040, 520, 12, 170);
        c.fillRect(940, 470, 130, 56);
        c.strokeStyle = C.far;
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(1400, 690);
        c.lineTo(1440, 430);
        c.lineTo(1480, 690);
        c.moveTo(1410, 600);
        c.lineTo(1470, 540);
        c.moveTo(1470, 600);
        c.lineTo(1410, 540);
        c.stroke();
      });
      // canal in the foreground, catching the town lights
      canal(s, 800, 0);
      for (const x of [220, 520, 760, 1080, 1340]) glow(s, x, 830, 60, 'rgba(233,176,79,0.8)', 0.18 + 0.05 * Math.sin(s.time * 3 + x));
      palm(s, 60, 960, 420, 60, C.near, 1.3);
      palm(s, 1560, 980, 460, -80, C.near, 1.3);
      // location card, top-left below the player controls (subtitles own the bottom)
      const a = ramp(t, 1.4, 2.4) * (1 - ramp(t, 6.4, 7.4));
      if (a > 0) {
        screen(s, (u) => {
          const top = s.h * 0.2;
          s.ctx.fillStyle = `rgba(233,176,79,${a})`;
          s.ctx.fillRect(48 * u, top, 4 * u, 70 * u);
          s.text(tr('intro.card.place'), 66 * u, top + 40 * u, 38 * u, C.paper, { alpha: a });
          s.text(tr('intro.card.time'), 66 * u, top + 68 * u, 20 * u, C.lamp, { alpha: a, font: 'body', weight: 600 });
        });
      }
    },
  },

  // 3 ── Town during the monsoon
  {
    id: 'street',
    dur: 8,
    cam: [
      { t: 0, x: 640, y: 480, z: 1.12 },
      { t: 1, x: 930, y: 470, z: 1.12 },
    ],
    rain: 0.9,
    fadeIn: 0.7,
    subs: [{ at: 0.4, key: 'intro.l3' }],
    cues: [{ at: 3.6, run: () => audio.play('whoosh') }],
    draw: (s, t) => {
      sky(s);
      clouds(s, 90, '#18222a', 0.7, 1.2, 4);
      s.parallax(0.45, () => {
        farTown(s, 640, 1, 9);
        for (const x of [60, 700, 1500]) palm(s, x, 650, 240, 30, C.mid);
      });
      road(s, 700, 300, [
        { x: 908, on: 1 },
        { x: 1408, on: 1 },
        { x: 420, on: 0.7 },
      ]);
      teaShop(s, 420, 700, 1);
      steam(s, 400, 628);
      steam(s, 450, 630);
      ksebPole(s, 1100, 700, 380, 1700);
      streetLamp(s, 880, 700, 300, 1);
      streetLamp(s, 1380, 700, 300, 1);
      s.char(cast('fathima'), 620, 706, 150, { frame: 0 });
      auto(s, 1200, 760, 1.1, 0.6);
      puddle(s, 700, 820, 170);
      puddle(s, 1030, 860, 230);
      splashes(s, 200, 1600, 720, 890, 30);
      // villagers walking through the rain
      const ax = 160 + t * 95;
      s.char(cast('ammu'), ax, 800, 160, { frame: s.walkFrame(t) });
      const jx = 1640 - t * 80;
      s.char(cast('joseph'), jx, 840, 170, { frame: s.walkFrame(t + 0.3), flip: true });
      // an auto hissing past in the foreground
      if (t > 3 && t < 6.5) auto(s, -300 + (t - 3) * 700, 900, 1.5, 1);
    },
  },

  // 4 ── Strange incidents begin
  {
    id: 'unease',
    dur: 6,
    cam: [
      { t: 0, x: 880, y: 430, z: 1.15, rot: 0 },
      { t: 1, x: 910, y: 400, z: 1.45, rot: -0.035 },
    ],
    rain: 1,
    wind: 1.6,
    fadeIn: 0.6,
    subs: [{ at: 0.4, key: 'intro.l4' }],
    cues: [
      { at: 0.1, run: () => audio.startDrone() },
      { at: 1.4, run: () => audio.play('flicker') },
      { at: 3.6, run: () => audio.play('flicker') },
    ],
    draw: (s, t) => {
      sky(s);
      clouds(s, 90, '#18222a', 0.8, 2.6, 4);
      s.parallax(0.45, () => {
        farTown(s, 640, 0.6, 9);
        for (const x of [60, 700, 1500]) palm(s, x, 650, 240, 30, C.mid, 2);
      });
      const l1 = t > 1.3 ? flicker(t, 1) : 1;
      const l2 = t > 3.5 ? flicker(t, 2, 18) : 1;
      road(s, 700, 300, [
        { x: 908, on: l1 },
        { x: 1408, on: l2 },
      ]);
      teaShop(s, 420, 700, t > 1.3 ? flicker(t, 3, 9) : 1);
      ksebPole(s, 1100, 700, 380, 1700);
      streetLamp(s, 880, 700, 300, l1);
      streetLamp(s, 1380, 700, 300, l2);
      auto(s, 1200, 760, 1.1, 0);
      puddle(s, 1030, 860, 230);
      splashes(s, 200, 1600, 720, 890, 40);
      // loose paper tumbling in the wind
      const px = -100 + ((t * 320) % 1900);
      s.ctx.save();
      s.ctx.translate(px, 780 - Math.abs(Math.sin(t * 5)) * 40);
      s.ctx.rotate(t * 6);
      s.ctx.fillStyle = '#b6c1bd';
      s.ctx.fillRect(-10, -7, 20, 14);
      s.ctx.restore();
    },
  },

  // 5 ── Power failure
  {
    id: 'power',
    dur: 7,
    cam: [
      { t: 0, x: 800, y: 460, z: 1 },
      { t: 1, x: 800, y: 440, z: 1.08 },
    ],
    rain: 0.9,
    fadeIn: 0.6,
    subs: [{ at: 0.3, key: 'intro.l5' }],
    cues: [
      ...[1.4, 2.0, 2.6, 3.2].map((at) => ({ at, run: () => audio.play('powerDown') })),
      { at: 3.9, run: () => audio.play('powerDown') },
      { at: 5.4, run: (s: Stage) => s.lightning(0.7) },
      { at: 5.9, run: () => audio.play('thunderClose') },
    ],
    draw: (s, t) => {
      sky(s);
      clouds(s, 110, '#18222a', 0.8, 1.4, 6);
      const windows = t < 3.9 ? 1 : 0;
      s.parallax(0.5, () => farTown(s, 640, windows, 12));
      const lamps = [250, 650, 1050, 1450];
      const on = lamps.map((_, i) => (t < 1.4 + i * 0.6 ? 1 : 0));
      road(s, 720, 300, lamps.map((x, i) => ({ x: x + 28, on: on[i]! })));
      for (const x of [120, 480, 880, 1260]) keralaHouse(s, x, 720, 220, 120, { lit: windows, veranda: true });
      lamps.forEach((x, i) => streetLamp(s, x, 720, 320, on[i]!));
      splashes(s, 0, 1600, 740, 890, 30);
      if (t > 4.2) s.fill('#000', 0.35 * ramp(t, 4.2, 5));
    },
  },

  // 6 ── CCTV failure
  {
    id: 'cctv',
    dur: 7.5,
    cam: [
      { t: 0, x: 790, y: 420, z: 1.7 },
      { t: 0.4, x: 830, y: 400, z: 2 },
      { t: 1, x: 830, y: 400, z: 2 },
    ],
    // No rain over the camera's own feed.
    rain: (t) => (t < 3 ? 0.8 : 0),
    fadeIn: 0.4,
    subs: [{ at: 0.3, key: 'intro.l6' }],
    cues: [
      { at: 3, run: () => audio.play('interact') },
      { at: 5.1, run: () => audio.play('static') },
    ],
    draw: (s, t) => {
      if (t < 3) {
        sky(s);
        clouds(s, 150, '#18222a', 0.8, 1.4, 8);
        cctv(s, 700, 560, 3, Math.floor(t * 2) % 2 === 0);
        return;
      }
      // The camera's own feed, shown full screen.
      screen(s, (u) => {
        const c = s.ctx;
        const W = s.w;
        const H = s.h;
        c.fillStyle = '#1b1f1e';
        c.fillRect(0, 0, W, H);
        c.fillStyle = '#2c3230';
        c.fillRect(0, H * 0.62, W, H * 0.38); // road
        c.fillStyle = '#3a403e';
        c.fillRect(W * 0.1, H * 0.3, W * 0.28, H * 0.32); // shelter
        c.fillRect(W * 0.62, H * 0.2, W * 0.05, H * 0.42); // bell post
        c.fillStyle = '#4a504e';
        c.beginPath();
        c.arc(W * 0.645, H * 0.22, 18 * u, 0, Math.PI * 2);
        c.fill();
        // a figure crosses the junction
        if (t > 3.4 && t < 5.2) {
          const fx = (t - 3.4) / 1.8;
          s.char(cast('rahul'), W * (0.05 + fx * 0.5), H * 0.8, 260 * u, { frame: s.walkFrame(t), silhouette: '#5a605e' });
        }
        // scanlines + grain
        c.fillStyle = 'rgba(0,0,0,0.18)';
        for (let y = 0; y < H; y += 4 * u) c.fillRect(0, y, W, 1.5 * u);
        const r = rng(Math.floor(t * 30));
        c.fillStyle = 'rgba(255,255,255,0.05)';
        for (let i = 0; i < 160; i++) c.fillRect(r() * W, r() * H, 2 * u, 2 * u);
        // static burst, then NO SIGNAL
        if (t > 5.1) {
          const k = clamp01((t - 5.1) / 0.4);
          const rr = rng(Math.floor(t * 40) + 5);
          for (let i = 0; i < 900 * k; i++) {
            const g = Math.floor(rr() * 255);
            c.fillStyle = `rgb(${g},${g},${g})`;
            c.fillRect(rr() * W, rr() * H, 6 * u, 3 * u);
          }
          if (t > 5.6) {
            c.fillStyle = 'rgba(10,12,40,0.9)';
            c.fillRect(W / 2 - 170 * u, H / 2 - 40 * u, 340 * u, 80 * u);
            s.text('NO SIGNAL', W / 2, H / 2 + 14 * u, 40 * u, '#e8e1cf', { align: 'center', font: 'body' });
          }
        }
        s.text('CAM-02  JUNCTION', 60 * u, 150 * u, 24 * u, '#d8e0dc', { font: 'body', weight: 600 });
        const secs = 12 + Math.floor(t - 3);
        s.text(`23:47:${String(secs).padStart(2, '0')}`, W - 60 * u, 150 * u, 24 * u, '#d8e0dc', { font: 'body', weight: 600, align: 'right' });
        if (Math.floor(t * 2) % 2 === 0 && t < 5.1) {
          c.fillStyle = '#ff3b30';
          c.beginPath();
          c.arc(70 * u, 184 * u, 8 * u, 0, Math.PI * 2);
          c.fill();
          s.text('REC', 88 * u, 192 * u, 20 * u, '#ff3b30', { font: 'body' });
        }
      });
    },
  },

  // 7 ── Water pump failure
  {
    id: 'pump',
    dur: 7,
    cam: [
      { t: 0, x: 760, y: 520, z: 1.25 },
      { t: 1, x: 920, y: 560, z: 1.08 },
    ],
    rain: 0.8,
    fadeIn: 0.5,
    subs: [{ at: 0.3, key: 'intro.l7' }],
    cues: [{ at: 1, run: () => audio.play('pumpStall') }],
    draw: (s, t) => {
      sky(s);
      clouds(s, 120, '#18222a', 0.8, 1.2, 10);
      s.parallax(0.5, () => {
        for (const x of [100, 400, 1300, 1600]) palm(s, x, 600, 260, 20, C.mid);
      });
      const c = s.ctx;
      c.fillStyle = '#1a2320';
      c.fillRect(-900, 700, 3400, 400);
      const flow = 1 - ramp(t, 1.1, 3.4);
      pumpHouse(s, 560, 700, flow, flow);
      // kadavu steps down into the canal
      for (let i = 0; i < 6; i++) {
        c.fillStyle = i % 2 ? '#3b3f38' : '#474b43';
        c.fillRect(1020 + i * 40, 700 + i * 32, 700, 32);
      }
      canal(s, 900, ramp(t, 2.8, 7) * 150);
      splashes(s, 0, 1000, 710, 880, 20);
    },
  },

  // 8 ── Missing objects
  {
    id: 'missing',
    dur: 8,
    cam: [
      { t: 0, x: 800, y: 520, z: 1.1 },
      { t: 1, x: 930, y: 540, z: 1.2 },
    ],
    rain: 0,
    fadeIn: 0.6,
    subs: [
      { at: 0.3, key: 'intro.l8a' },
      { at: 4.8, key: 'intro.l8b' },
    ],
    cues: [1.2, 2.4, 3.6, 4.8].map((at) => ({ at, run: () => audio.play('vanish') })),
    draw: (s, t) => {
      const c = s.ctx;
      // whitewashed wall with a window onto the rain
      c.fillStyle = '#262b27';
      c.fillRect(-900, -600, 3400, 1240);
      c.fillStyle = '#0d1a22';
      c.fillRect(260, 220, 300, 220);
      c.strokeStyle = 'rgba(170,200,215,0.35)';
      c.lineWidth = 1.5;
      c.beginPath();
      for (let i = 0; i < 26; i++) {
        const x = 270 + ((i * 37 + s.time * 600) % 280);
        const y = 230 + ((i * 53 + s.time * 900) % 190);
        c.moveTo(x, y);
        c.lineTo(x - 4, y + 16);
      }
      c.stroke();
      c.fillStyle = C.wood;
      c.fillRect(250, 210, 320, 12);
      c.fillRect(250, 436, 320, 12);
      c.fillRect(404, 210, 10, 236);
      // red-oxide floor
      const g = c.createLinearGradient(0, 640, 0, 1000);
      g.addColorStop(0, '#5a1f17');
      g.addColorStop(1, '#260c09');
      c.fillStyle = g;
      c.fillRect(-900, 640, 3400, 500);
      // wooden pillar and doorway into darkness
      c.fillStyle = '#05070a';
      c.fillRect(1380, 200, 260, 450);
      c.fillStyle = C.wood;
      c.fillRect(1250, 120, 34, 540);
      // hanging bulb
      glow(s, 800, 190, 380, 'rgba(255,200,120,0.9)', 0.35 + 0.04 * Math.sin(s.time * 9));
      c.fillStyle = C.lampHot;
      c.beginPath();
      c.arc(800, 190, 8, 0, Math.PI * 2);
      c.fill();
      // table
      c.fillStyle = '#3a220f';
      c.fillRect(520, 650, 200, 16);
      c.fillRect(534, 666, 12, 70);
      c.fillRect(694, 666, 12, 70);
      const gone = (at: number) => clamp01(1 - (t - at) / 0.25);
      // keys on a nail
      c.fillStyle = '#6b6f6a';
      c.fillRect(818, 400, 4, 12);
      if (gone(1.2) > 0) {
        c.globalAlpha = gone(1.2);
        c.strokeStyle = '#c9a24a';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(820, 426, 10, 0, Math.PI * 2);
        c.moveTo(820, 436);
        c.lineTo(826, 460);
        c.stroke();
        c.globalAlpha = 1;
      }
      puff(s, 820, 440, (t - 1.2) / 0.9);
      // steel tumbler of tea
      if (gone(2.4) > 0) {
        c.globalAlpha = gone(2.4);
        c.fillStyle = '#b8bfc0';
        c.fillRect(600, 612, 26, 38);
        c.globalAlpha = 1;
        steam(s, 613, 606, gone(2.4));
      }
      puff(s, 613, 630, (t - 2.4) / 0.9);
      umbrella(s, 1226, 650, 1.6, gone(3.6));
      puff(s, 1226, 590, (t - 3.6) / 0.9);
      bicycle(s, 980, 760, 1.5, gone(4.8));
      puff(s, 980, 690, (t - 4.8) / 0.9);
      // wet pawprints walk off into the dark doorway
      for (let i = 0; i < 9; i++) {
        const k = i / 8;
        const px = 760 + k * 700 + (i % 2 ? 14 : -14);
        const py = 760 - k * 90;
        pawprint(s, px, py, 1.4 - k * 0.5, clamp01((t - 5 - i * 0.25) / 0.2) * 0.8, '#12090a');
      }
    },
  },

  // 9 ── The old Kerala house
  {
    id: 'tharavad',
    dur: 8,
    cam: [
      { t: 0, x: 800, y: 430, z: 0.95 },
      { t: 1, x: 800, y: 590, z: 1.6 },
    ],
    rain: 0.9,
    fadeIn: 0.7,
    subs: [{ at: 0.6, key: 'intro.l9' }],
    cues: [
      { at: 1.2, run: (s) => s.lightning(0.9) },
      { at: 1.6, run: () => audio.play('thunderClose') },
    ],
    draw: (s) => {
      sky(s);
      clouds(s, 80, '#1b2630', 0.8, 1, 13);
      s.parallax(0.4, () => hills(s, 520, C.hill, 70, 7));
      s.parallax(0.7, () => {
        for (const x of [0, 220, 1380, 1600]) palm(s, x, 740, 320, x < 800 ? 40 : -40, C.mid, 1.3);
      });
      const c = s.ctx;
      c.fillStyle = '#10130f';
      c.fillRect(-900, 760, 3400, 400);
      keralaHouse(s, 800, 760, 760, 300, { lit: 0.25, veranda: true });
      // veranda floor
      c.fillStyle = '#3b140f';
      c.fillRect(420, 748, 760, 14);
      nilavilakku(s, 800, 748, 0.8);
      // two elders on the thinnai, lit only by the lamp
      const elder: Appearance = { body: 'boy', skin: 2, hair: 3, hairColor: 4, top: 4, topStyle: 'shirt', bottom: 4, footwear: 'sandals', accessory: 'glasses' };
      const elder2: Appearance = { body: 'girl', skin: 3, hair: 2, hairColor: 4, top: 7, topStyle: 'shirt', bottom: 4, footwear: 'sandals', accessory: 'none' };
      s.char(elder, 690, 748, 120, { silhouette: '#130d08' });
      s.char(elder2, 910, 748, 115, { silhouette: '#130d08', flip: true });
      glow(s, 800, 660, 200, 'rgba(255,170,80,0.7)', 0.25);
      palm(s, -80, 1000, 520, 90, C.near, 1.4);
      splashes(s, 0, 1600, 770, 900, 30);
    },
  },

  // 10 ── The Nizhalpoocha legend, on palm-leaf manuscripts
  {
    id: 'legend',
    dur: 10,
    cam: [
      { t: 0, x: 620, y: 360, z: 1.25 },
      { t: 0.5, x: 800, y: 460, z: 1.02 },
      { t: 1, x: 980, y: 560, z: 1.25 },
    ],
    rain: 0,
    fadeIn: 0.8,
    subs: [
      { at: 0.4, key: 'intro.l10a' },
      { at: 4.6, key: 'intro.l10b' },
    ],
    draw: (s, t) => {
      const c = s.ctx;
      c.fillStyle = '#140d07';
      c.fillRect(-900, -600, 3400, 2100);
      const ink = '#3a2410';
      const leaf = (y: number) => {
        roundRect(c, 150, y - 70, 1300, 140, 60, '#c9a86a');
        c.strokeStyle = 'rgba(120,90,40,0.35)';
        c.lineWidth = 1.5;
        c.beginPath();
        for (let i = 0; i < 6; i++) {
          c.moveTo(200, y - 50 + i * 20);
          c.lineTo(1400, y - 50 + i * 20);
        }
        c.stroke();
        c.fillStyle = '#6b4a24';
        c.beginPath();
        c.arc(260, y, 8, 0, Math.PI * 2);
        c.arc(1340, y, 8, 0, Math.PI * 2);
        c.fill();
      };
      const figure = (x: number, y: number, k: number) => {
        c.fillStyle = ink;
        c.beginPath();
        c.arc(x, y - 44 * k, 9 * k, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.moveTo(x - 12 * k, y);
        c.lineTo(x - 7 * k, y - 34 * k);
        c.lineTo(x + 7 * k, y - 34 * k);
        c.lineTo(x + 12 * k, y);
        c.closePath();
        c.fill();
      };
      leaf(260);
      s.text('നിഴൽപ്പൂച്ച', 330, 280, 44, ink);
      for (let i = 0; i < 5; i++) figure(700 + i * 120, 310, 1.2);
      leaf(460);
      for (let i = 0; i < 4; i++) figure(380 + i * 150, 510, 1.2);
      // the shadow cat slinking behind the villagers
      const slink = 1000 + Math.sin(s.time * 0.8) * 30;
      catSilhouette(s, slink, 520, 0.5, 0, ink);
      leaf(660);
      figure(800, 710, 1.4);
      // …and one figure whose shadow, cast on the leaf beside it, is a cat
      c.save();
      c.globalAlpha = 0.5;
      catSilhouette(s, 866, 712, 0.44, 0, ink);
      c.restore();
      for (const x of [400, 560, 1040, 1200]) figure(x, 710, 1.2);
      // oil lamp light breathing over the leaves
      const breath = 0.5 + 0.08 * Math.sin(t * 9) + 0.05 * Math.sin(t * 4.1);
      glow(s, 120, 800, 900, 'rgba(255,170,70,0.6)', breath * 0.5);
      nilavilakku(s, 110, 900, 1.2);
    },
  },

  // 11 ── A mysterious Cat silhouette on the rooftops
  {
    id: 'silhouette',
    dur: 6.5,
    cam: [
      { t: 0, x: 800, y: 380, z: 1.3 },
      { t: 1, x: 810, y: 350, z: 1.5 },
    ],
    rain: 1,
    fadeIn: 0.6,
    subs: [{ at: 3.3, key: 'intro.l11' }],
    cues: [
      { at: 2, run: (s) => s.lightning(1) },
      { at: 2.05, run: () => audio.play('stinger') },
      { at: 4.4, run: (s) => s.lightning(0.8) },
      { at: 4.9, run: () => audio.play('thunderClose') },
    ],
    draw: (s, t) => {
      sky(s, '#05090f', '#101a22');
      clouds(s, 150, '#16202a', 0.9, 2, 21);
      keralaHouse(s, 800, 1000, 1400, 420, { roof: '#0b0806', wall: '#07090a', gable: false });
      const eyes = t < 1.9 ? ramp(t, 0.4, 1.1) * (0.8 + 0.2 * Math.sin(t * 3)) : 0;
      if (t < 3) catSilhouette(s, 800, 350, 1.3, eyes);
    },
  },

  // 12 ── Five neighbours
  {
    id: 'five',
    dur: 9,
    cam: [
      { t: 0, x: 420, y: 580, z: 1.7 },
      { t: 1, x: 1180, y: 580, z: 1.7 },
    ],
    rain: 0.9,
    fadeIn: 0.8,
    subs: [{ at: 0.3, key: 'intro.l12' }],
    draw: (s, _t, tr) => {
      sky(s);
      const c = s.ctx;
      c.fillStyle = '#121917';
      c.fillRect(-900, 760, 3400, 400);
      busShelter(s, 800, 760, 1100);
      streetLamp(s, 160, 760, 400, 1);
      LINEUP.forEach((id, i) => {
        const x = 420 + i * 190;
        const bob = Math.sin(s.time * 2 + i) * 2;
        s.char(cast(id), x, 760 + bob * 0.2, 190, { flip: i > 2 });
        // name card above the head, fading in as the camera passes
        const a = clamp01(1.4 - Math.abs(s.cam.x - x) / 70);
        if (a > 0.02) {
          const label = tr(CAST[id].whoKey);
          c.font = '700 20px Manrope, "Noto Sans Malayalam", sans-serif';
          const w = c.measureText(label).width + 28;
          c.save();
          c.globalAlpha = a;
          roundRect(c, x - w / 2, 522, w, 38, 10, 'rgba(8,12,11,0.85)', 'rgba(233,176,79,0.8)');
          c.restore();
          s.text(label, x, 548, 20, C.paper, { align: 'center', alpha: a, font: 'body' });
        }
      });
      splashes(s, -200, 1800, 770, 900, 26);
    },
  },

  // 13 ── One shadow is not like the others
  {
    id: 'shadow',
    dur: 6,
    cam: [
      { t: 0, x: 800, y: 560, z: 1.15 },
      { t: 1, x: 800, y: 540, z: 1.25 },
    ],
    rain: 0.7,
    fadeIn: 0,
    subs: [{ at: 3.2, key: 'intro.l13' }],
    cues: [
      { at: 2.1, run: (s) => s.lightning(1) },
      { at: 2.15, run: () => audio.play('stinger') },
      { at: 3.1, run: () => audio.play('heartbeat') },
      { at: 4.1, run: () => audio.play('heartbeat') },
    ],
    draw: (s, t) => {
      sky(s);
      const c = s.ctx;
      c.fillStyle = '#121917';
      c.fillRect(-900, 760, 3400, 400);
      busShelter(s, 800, 760, 1100);
      const catTime = t > 2.1 && t < 2.75;
      const shadowAlpha = 0.45 + s.flash * 0.4;
      LINEUP.forEach((id, i) => {
        const x = 420 + i * 190;
        const sx = x + (x - 800) * 0.12;
        c.save();
        c.globalAlpha = shadowAlpha;
        s.char(cast(id), sx, 700, 260, { silhouette: '#030506', flip: i > 2 });
        c.restore();
        if (id === 'rahul' && catTime) {
          // ears and a tail on this one shadow, for a heartbeat
          const top = 700 - 260 * (68 / 72) + 18;
          c.save();
          c.globalAlpha = shadowAlpha;
          c.fillStyle = '#030506';
          c.beginPath();
          c.moveTo(sx - 26, top + 14);
          c.lineTo(sx - 20, top - 30);
          c.lineTo(sx - 4, top + 4);
          c.moveTo(sx + 26, top + 14);
          c.lineTo(sx + 20, top - 30);
          c.lineTo(sx + 4, top + 4);
          c.fill();
          c.strokeStyle = '#030506';
          c.lineWidth = 14;
          c.lineCap = 'round';
          c.beginPath();
          c.moveTo(sx + 30, 600);
          c.bezierCurveTo(sx + 120, 590, sx + 130, 480, sx + 80, 460);
          c.stroke();
          c.restore();
        }
      });
      LINEUP.forEach((id, i) => s.char(cast(id), 420 + i * 190, 760, 190, { flip: i > 2 }));
    },
  },

  // 14 ── The Cat looks completely human
  {
    id: 'human',
    dur: 8,
    cam: [
      { t: 0, x: 800, y: 560, z: 1 },
      { t: 1, x: 800, y: 560, z: 1.08 },
    ],
    rain: 0.45,
    fadeIn: 0.7,
    subs: [
      { at: 0.3, key: 'intro.l14a' },
      { at: 4.2, key: 'intro.l14b' },
    ],
    draw: (s, t) => {
      const c = s.ctx;
      c.fillStyle = '#0c1210';
      c.fillRect(-900, -600, 3400, 2100);
      const xs = [360, 580, 800, 1020, 1240];
      LINEUP.forEach((id, i) => s.char(cast(id), xs[i]!, 880, 320, { flip: i > 2 }));
      // darkness, with a torch beam sweeping across the faces
      s.fill('#000', 0.55);
      const sweep = 260 + ramp(t, 0.5, 6.8) * 1080;
      glow(s, sweep, 620, 230, 'rgba(255,235,190,0.9)', 0.4);
      xs.forEach((x) => {
        const a = clamp01(1 - Math.abs(sweep - x) / 140);
        if (a > 0.02) s.text('?', x, 440, 70, C.lamp, { align: 'center', alpha: a });
      });
    },
  },

  // 15 ── The Human objective
  {
    id: 'objective',
    dur: 11,
    cam: [{ t: 0, x: 800, y: 460, z: 1 }],
    rain: 0.3,
    fadeIn: 0.6,
    subs: [
      { at: 0.3, key: 'intro.l15a' },
      { at: 4, key: 'intro.l15b' },
      { at: 7.6, key: 'intro.l15c' },
    ],
    cues: [0.4, 2.8, 5.2, 7.6].map((at) => ({ at, run: () => audio.play('interact') })),
    draw: (s, t, tr) => {
      const c = s.ctx;
      c.fillStyle = '#0b100e';
      c.fillRect(-900, -600, 3400, 2100);
      const labels: I18nKey[] = ['intro.obj.tasks', 'intro.obj.investigate', 'intro.obj.report', 'intro.obj.vote'];
      labels.forEach((key, i) => {
        const appear = ramp(t, 0.4 + i * 2.4, 0.9 + i * 2.4);
        if (appear <= 0) return;
        const cx = 260 + i * 360;
        const cy = 440;
        c.save();
        c.translate(cx, cy);
        c.scale(0.85 + appear * 0.15, 0.85 + appear * 0.15);
        c.globalAlpha = appear;
        roundRect(c, -150, -190, 300, 380, 22, '#111a17', 'rgba(233,176,79,0.85)');
        c.lineWidth = 6;
        c.strokeStyle = C.paper;
        c.fillStyle = C.paper;
        c.lineCap = 'round';
        c.lineJoin = 'round';
        if (i === 0) {
          // fuse board + wrench
          c.strokeRect(-70, -120, 140, 150);
          for (let k = 0; k < 3; k++) c.fillRect(-48 + k * 36, -90, 20, 40 + ((k + Math.floor(s.time * 2)) % 2) * 20);
          c.beginPath();
          c.moveTo(40, 60);
          c.lineTo(-40, 120);
          c.stroke();
          c.beginPath();
          c.arc(48, 54, 16, 0, Math.PI * 2);
          c.stroke();
        } else if (i === 1) {
          // magnifier over pawprints
          pawprint(s, -40, 40, 1.8, 0.9, '#c9a86a');
          pawprint(s, 30, -30, 1.8, 0.9, '#c9a86a');
          const mx = Math.sin(s.time * 1.5) * 20;
          c.beginPath();
          c.arc(mx, -10, 56, 0, Math.PI * 2);
          c.stroke();
          c.beginPath();
          c.moveTo(mx + 40, 30);
          c.lineTo(mx + 90, 90);
          c.stroke();
        } else if (i === 2) {
          // the junction alarm bell, ringing
          const sw = Math.sin(s.time * 10) * 0.25;
          c.save();
          c.rotate(sw);
          c.beginPath();
          c.moveTo(-60, 40);
          c.quadraticCurveTo(-60, -90, 0, -100);
          c.quadraticCurveTo(60, -90, 60, 40);
          c.closePath();
          c.stroke();
          c.restore();
          for (const d of [-1, 1]) {
            c.beginPath();
            c.arc(0, -30, 100, d > 0 ? -0.5 : Math.PI - 0.3, d > 0 ? 0.3 : Math.PI + 0.5);
            c.stroke();
          }
        } else {
          // ballot box with a slip going in
          c.strokeRect(-80, -20, 160, 120);
          c.beginPath();
          c.moveTo(-30, -20);
          c.lineTo(30, -20);
          c.stroke();
          const drop = (s.time * 0.8) % 1;
          c.fillStyle = C.lamp;
          c.fillRect(-20, -110 + drop * 90, 40, 50);
        }
        c.restore();
        s.text(tr(key), cx, cy + 160, 34, C.lamp, { align: 'center', alpha: appear });
      });
    },
  },

  // 16 ── Title, then into the tutorial
  {
    id: 'title',
    dur: 7,
    cam: [
      { t: 0, x: 800, y: 450, z: 1.05 },
      { t: 1, x: 800, y: 450, z: 1 },
    ],
    rain: 0.7,
    fadeIn: 0.8,
    subs: [{ at: 2.6, key: 'intro.l16' }],
    cues: [
      { at: 0.9, run: (s) => s.lightning(0.8) },
      { at: 1.2, run: () => audio.play('thunderClose') },
      { at: 5.5, run: () => audio.stopDrone() },
    ],
    draw: (s, t) => {
      s.fill('#040605', 1);
      const a = ramp(t, 0.9, 2.1);
      s.text('NIZHALPOOCHA', 800, 440, 120, C.paper, { align: 'center', alpha: a, weight: 800 });
      s.text('നിഴൽപ്പൂച്ച', 800, 530, 64, C.lamp, { align: 'center', alpha: a });
      const eyes = ramp(t, 2.2, 3) * (Math.floor(s.time * 1.3) % 5 === 0 ? 0.1 : 1);
      if (eyes > 0) {
        for (const ex of [770, 830]) {
          s.ctx.fillStyle = `rgba(233,176,79,${eyes})`;
          s.ctx.beginPath();
          s.ctx.ellipse(ex, 300, 13, 8, 0, 0, Math.PI * 2);
          s.ctx.fill();
        }
        glow(s, 800, 300, 120, 'rgba(233,176,79,0.8)', eyes * 0.3);
      }
    },
  },
];

export const FILM_LENGTH = SHOTS.reduce((sum, s) => sum + s.dur, 0);
