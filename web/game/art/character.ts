import {
  CLOTH_COLORS,
  HAIR_COLORS,
  SKIN_TONES,
  type Appearance,
} from '@nizhal/shared';

/**
 * Original stylised Kerala villager characters, drawn procedurally so the same
 * art is used in Phaser textures and React avatars. Cats use exactly this code —
 * there is no visual difference between roles.
 *
 * Logical frame: 48 × 72 units. Feet rest at y = 68.
 * Frames: 0–3 walk cycle (0 doubles as idle), 4 = lying (eyes closed).
 */
export const CHAR_W = 48;
export const CHAR_H = 72;
export const CHAR_FRAMES = 5;

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

function shade(n: number, amt: number): string {
  const r = Math.max(0, Math.min(255, ((n >> 16) & 255) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
  const b = Math.max(0, Math.min(255, (n & 255) + amt));
  return `rgb(${r},${g},${b})`;
}

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
}

function ellipse(ctx: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function appearanceKey(a: Appearance): string {
  return `${a.body}-${a.skin}-${a.hair}-${a.hairColor}-${a.top}-${a.topStyle}-${a.bottom}-${a.footwear}-${a.accessory}`;
}

/** Draws one frame with its top-left at (ox, oy), in logical units (caller scales). */
export function drawCharacter(ctx: CanvasRenderingContext2D, a: Appearance, frame: number, ox = 0, oy = 0): void {
  ctx.save();
  ctx.translate(ox, oy + 8);
  const lying = frame === 4;
  const phase = lying ? 0 : [0, 1, 0, -1][frame % 4]!;
  const girl = a.body === 'girl';
  const skinN = SKIN_TONES[a.skin] ?? SKIN_TONES[0];
  const skin = hex(skinN);
  const hairN = HAIR_COLORS[a.hairColor] ?? HAIR_COLORS[0];
  const hair = hex(hairN);
  const topN = CLOTH_COLORS[a.top] ?? CLOTH_COLORS[0];
  const top = hex(topN);
  const bottomN = CLOTH_COLORS[a.bottom] ?? CLOTH_COLORS[4];
  const bottom = hex(bottomN);
  const raincoat = a.topStyle === 'raincoat';
  const bob = lying ? 0 : Math.abs(phase) * 0.8;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ellipse(ctx, 24, 60, 12, 3.5);

  ctx.translate(0, -bob);

  // Backpack body peeking out behind the torso
  if (a.accessory === 'backpack') {
    const bp = CLOTH_COLORS[(a.top + 3) % CLOTH_COLORS.length]!;
    ctx.fillStyle = shade(bp, -30);
    rr(ctx, 11, 27, 26, 18, 5);
  }

  // Long hair / braid behind the shoulders
  if (girl && (a.hair === 0 || a.hair === 1)) {
    ctx.fillStyle = shade(hairN, -10);
    rr(ctx, 14, 10, 20, a.hair === 0 ? 26 : 16, 8);
  }

  // Legs
  const leftLift = Math.max(0, phase) * 2;
  const rightLift = Math.max(0, -phase) * 2;
  const legColor = girl ? skin : bottom;
  ctx.fillStyle = legColor;
  rr(ctx, 18, 43, 5.5, 13 - leftLift, 2);
  rr(ctx, 24.5, 43, 5.5, 13 - rightLift, 2);

  // Footwear
  const foot = (x: number, lift: number) => {
    const y = 55 - lift;
    if (a.footwear === 'shoes') {
      ctx.fillStyle = '#26221f';
      rr(ctx, x - 0.5, y, 7, 3.6, 1.8);
      ctx.fillStyle = '#d9d3c4';
      ctx.fillRect(x, y + 2.8, 6, 0.8);
    } else {
      ctx.fillStyle = skin;
      rr(ctx, x, y, 6, 3, 1.5);
      ctx.fillStyle = '#6b3d22';
      ctx.fillRect(x - 0.3, y + 0.6, 6.6, 1.1);
    }
  };
  foot(17.5, leftLift);
  foot(24.5, rightLift);

  // Girl: pavada-style skirt with a gold (kasavu) border
  if (girl) {
    ctx.fillStyle = bottom;
    ctx.beginPath();
    ctx.moveTo(16, 38);
    ctx.lineTo(32, 38);
    ctx.lineTo(35 + phase * 0.6, 53);
    ctx.lineTo(13 + phase * 0.6, 53);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d8b640';
    ctx.fillRect(13.3 + phase * 0.6, 51, 21.4, 2);
  }

  // Arms (swing opposite to legs)
  const armSwing = phase * 1.6;
  const sleeve = raincoat ? shade(topN, -8) : top;
  const arm = (x: number, swing: number) => {
    ctx.fillStyle = sleeve;
    rr(ctx, x, 28 + swing, 5, raincoat ? 12 : 7, 2.5);
    ctx.fillStyle = skin;
    if (!raincoat) rr(ctx, x + 0.5, 34 + swing, 4, 6, 2);
    ellipse(ctx, x + 2.5, 41 + swing, 2.6, 2.4);
  };
  arm(11, armSwing);
  arm(32, -armSwing);

  // Torso
  ctx.fillStyle = top;
  if (raincoat) {
    rr(ctx, 14, 26, 20, 24, 6);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    rr(ctx, 16.5, 28, 3, 19, 1.5);
    ctx.fillStyle = shade(topN, -40);
    for (const by of [31, 36, 41]) ellipse(ctx, 24, by, 0.9, 0.9);
  } else {
    rr(ctx, 15, 26, 18, girl ? 14 : 18, 5);
    if (a.topStyle === 'shirt') {
      ctx.fillStyle = shade(topN, 40);
      ctx.beginPath();
      ctx.moveTo(20, 26);
      ctx.lineTo(24, 31);
      ctx.lineTo(28, 26);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(topN, -35);
      ctx.fillRect(23.6, 31, 0.8, girl ? 8 : 12);
      ellipse(ctx, 21.5, 36, 1.1, 1.1);
    } else {
      ctx.fillStyle = shade(topN, -30);
      ctx.fillRect(15.5, 34, 17, 2);
    }
  }
  if (!girl && !raincoat) {
    ctx.fillStyle = shade(bottomN, -20);
    ctx.fillRect(15, 42, 18, 2.5); // waistband
  }

  // Backpack straps
  if (a.accessory === 'backpack') {
    const bp = CLOTH_COLORS[(a.top + 3) % CLOTH_COLORS.length]!;
    ctx.fillStyle = shade(bp, -50);
    ctx.fillRect(17.5, 26.5, 2.2, 12);
    ctx.fillRect(28.3, 26.5, 2.2, 12);
  }

  // Raincoat hood behind head
  if (raincoat && a.accessory !== 'cap' && a.accessory !== 'umbrella') {
    ctx.fillStyle = shade(topN, -12);
    ellipse(ctx, 24, 15, 13, 12);
  }

  // Neck + head
  ctx.fillStyle = shade(skinN, -18);
  ctx.fillRect(21, 22, 6, 6);
  ctx.fillStyle = skin;
  ellipse(ctx, 13.8, 17, 2.2, 2.6);
  ellipse(ctx, 34.2, 17, 2.2, 2.6);
  ellipse(ctx, 24, 16, 10.5, 10.5);

  // Face
  if (lying) {
    ctx.strokeStyle = '#1b1511';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(18.8, 17.6);
    ctx.lineTo(21.8, 17.6);
    ctx.moveTo(26.2, 17.6);
    ctx.lineTo(29.2, 17.6);
    ctx.stroke();
  } else {
    ctx.fillStyle = '#1b1511';
    ellipse(ctx, 20.3, 17.4, 1.5, 1.8);
    ellipse(ctx, 27.7, 17.4, 1.5, 1.8);
    ctx.fillStyle = '#fff';
    ellipse(ctx, 20.8, 16.8, 0.5, 0.5);
    ellipse(ctx, 28.2, 16.8, 0.5, 0.5);
    ctx.strokeStyle = shade(skinN, -70);
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(24, 20.6, 1.8, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(214,110,110,0.25)';
  ellipse(ctx, 18.3, 20.3, 1.8, 1.1);
  ellipse(ctx, 29.7, 20.3, 1.8, 1.1);

  // Hair (front)
  ctx.fillStyle = hair;
  const cap = (depth: number) => {
    ctx.beginPath();
    ctx.ellipse(24, 14.5, 11.2, depth, 0, Math.PI, 0);
    ctx.fill();
  };
  if (!girl) {
    switch (a.hair) {
      case 0: // short
        cap(10);
        ctx.fillRect(13, 13.5, 22, 2.5);
        break;
      case 1: // side part with swoop
        cap(10);
        ctx.beginPath();
        ctx.moveTo(13, 15);
        ctx.quadraticCurveTo(22, 6, 35, 14);
        ctx.lineTo(35, 10);
        ctx.quadraticCurveTo(24, 2, 13, 11);
        ctx.fill();
        break;
      case 2: // curly
        for (const [cx, cy] of [[15, 12], [19, 7.5], [24, 6], [29, 7.5], [33, 12], [21.5, 10], [26.5, 10]] as const) ellipse(ctx, cx, cy, 4, 4);
        break;
      default: // buzz
        ctx.globalAlpha = 0.75;
        cap(8.5);
        ctx.globalAlpha = 1;
    }
  } else {
    cap(10.5);
    ctx.fillRect(13, 13, 3, 6);
    ctx.fillRect(32, 13, 3, 6);
    ctx.strokeStyle = shade(hairN, 40);
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(24, 4.5);
    ctx.lineTo(24, 10);
    ctx.stroke();
    switch (a.hair) {
      case 0: // braid over the shoulder
        for (let i = 0; i < 5; i++) ellipse(ctx, 32.5 + i * 0.4, 24 + i * 4, 2.6, 2.3);
        ctx.fillStyle = '#f4f1e6'; // jasmine
        ellipse(ctx, 33.8, 20.5, 1.2, 1.2);
        ellipse(ctx, 35, 22, 1.2, 1.2);
        break;
      case 1: // bob
        rr(ctx, 12.5, 12, 4, 12, 2);
        rr(ctx, 31.5, 12, 4, 12, 2);
        break;
      case 2: // bun with jasmine
        ellipse(ctx, 24, 4.5, 5, 4.5);
        ctx.fillStyle = '#f4f1e6';
        for (const [jx, jy] of [[19.5, 5], [22, 1.5], [26, 1.5], [28.5, 5]] as const) ellipse(ctx, jx, jy, 1.1, 1.1);
        break;
      default: // ponytail
        ctx.beginPath();
        ctx.moveTo(32, 8);
        ctx.quadraticCurveTo(41, 14, 36, 30);
        ctx.quadraticCurveTo(35, 18, 30, 11);
        ctx.fill();
    }
  }

  // Accessories
  if (a.accessory === 'glasses' && !lying) {
    ctx.strokeStyle = '#1f2a2e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(20.3, 17.4, 3, 0, Math.PI * 2);
    ctx.moveTo(30.7, 17.4);
    ctx.arc(27.7, 17.4, 3, 0, Math.PI * 2);
    ctx.moveTo(23.3, 17);
    ctx.lineTo(24.7, 17);
    ctx.stroke();
  }
  if (a.accessory === 'cap') {
    const c = CLOTH_COLORS[(a.top + 5) % CLOTH_COLORS.length]!;
    ctx.fillStyle = hex(c);
    ctx.beginPath();
    ctx.ellipse(24, 11, 11.5, 8, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = shade(c, -35);
    ellipse(ctx, 24, 11.5, 12, 2.6);
  }
  if (a.accessory === 'umbrella' && !lying) {
    ctx.strokeStyle = '#3b2a1a';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(35 - armSwing * 0.2, 41);
    ctx.lineTo(24, -4);
    ctx.stroke();
    ctx.fillStyle = '#17202a';
    ctx.beginPath();
    ctx.moveTo(2, 3);
    ctx.quadraticCurveTo(24, -14, 46, 3);
    for (let i = 0; i < 5; i++) {
      const x0 = 46 - i * 8.8;
      ctx.quadraticCurveTo(x0 - 4.4, 0.5, x0 - 8.8, 3);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(24, -5);
    ctx.lineTo(12, 2);
    ctx.moveTo(24, -5);
    ctx.lineTo(36, 2);
    ctx.stroke();
  }

  ctx.restore();
}
