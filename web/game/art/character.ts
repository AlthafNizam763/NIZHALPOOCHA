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
 *
 * `mood` only changes the face and is purely cosmetic UI flavour (menus, story,
 * reveals). It must never be derived from a player's role.
 */
export type Mood = 'neutral' | 'happy' | 'suspicious' | 'scared' | 'sly' | 'blink';

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
export function drawCharacter(ctx: CanvasRenderingContext2D, a: Appearance, frame: number, ox = 0, oy = 0, mood: Mood = 'neutral'): void {
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
  // Boys in white or gold "bottoms" wear a mundu with a kasavu border.
  const mundu = !girl && (a.bottom === 4 || a.bottom === 7);
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
  const legColor = girl || mundu ? skin : bottom;
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

  // Boy: mundu wrapped from the waist to the shins, gold border and front fold
  if (mundu) {
    ctx.fillStyle = bottom;
    ctx.beginPath();
    ctx.moveTo(15.5, 41);
    ctx.lineTo(32.5, 41);
    ctx.lineTo(33.5 + phase * 0.5, 53.5);
    ctx.lineTo(14.5 + phase * 0.5, 53.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = a.bottom === 7 ? '#8a5a12' : '#d8b640';
    ctx.fillRect(14.7 + phase * 0.5, 51.6, 18.6, 1.9);
    ctx.fillRect(26.2 + phase * 0.3, 41.5, 1.2, 11);
    ctx.fillStyle = shade(bottomN, -28);
    ctx.fillRect(22.5, 42, 0.7, 9.5);
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
  drawFace(ctx, lying ? 'blink' : mood, skinN, hairN);
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

/** Eyes, brows and mouth. Head centre is (24, 16), radius 10.5. */
function drawFace(ctx: CanvasRenderingContext2D, mood: Mood, skinN: number, hairN: number) {
  const ink = '#1b1511';
  const lx = 20.3;
  const rx = 27.7;
  const ey = 17.4;
  const line = (pts: number[], w = 0.9, color = ink) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0]!, pts[1]!);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i]!, pts[i + 1]!);
    ctx.stroke();
  };
  const brow = shade(hairN, -20);

  // Brows
  if (mood === 'scared') {
    line([lx - 2, 13.4, lx + 1.6, 12.4], 1, brow);
    line([rx - 1.6, 12.4, rx + 2, 13.4], 1, brow);
  } else if (mood === 'suspicious' || mood === 'sly') {
    line([lx - 2, 13.8, lx + 1.8, 14.6], 1.1, brow);
    line([rx - 1.8, mood === 'sly' ? 13.4 : 14.6, rx + 2, mood === 'sly' ? 12.9 : 13.8], 1.1, brow);
  } else if (mood !== 'blink') {
    line([lx - 1.8, 13.8, lx + 1.6, 13.5], 0.9, brow);
    line([rx - 1.6, 13.5, rx + 1.8, 13.8], 0.9, brow);
  }

  // Eyes
  if (mood === 'blink') {
    line([lx - 1.5, ey + 0.2, lx + 1.5, ey + 0.2], 1);
    line([rx - 1.5, ey + 0.2, rx + 1.5, ey + 0.2], 1);
  } else if (mood === 'happy') {
    line([lx - 1.6, ey + 0.6, lx, ey - 1, lx + 1.6, ey + 0.6], 1.1);
    line([rx - 1.6, ey + 0.6, rx, ey - 1, rx + 1.6, ey + 0.6], 1.1);
  } else {
    const big = mood === 'scared';
    const gaze = mood === 'suspicious' ? 0.7 : mood === 'sly' ? -0.7 : 0;
    for (const x of [lx, rx]) {
      ctx.fillStyle = '#fbf6ea';
      ellipse(ctx, x, ey, big ? 2.2 : 1.9, big ? 2.5 : 2.1);
      ctx.fillStyle = ink;
      ellipse(ctx, x + gaze, ey + 0.2, big ? 0.9 : 1.3, big ? 1.1 : 1.6);
      ctx.fillStyle = '#fff';
      ellipse(ctx, x + gaze + 0.5, ey - 0.5, 0.45, 0.45);
      if (mood === 'suspicious' || mood === 'sly') {
        // heavy upper lid
        ctx.fillStyle = hex(skinN);
        ctx.fillRect(x - 2.3, ey - 2.6, 4.6, mood === 'sly' ? 2.3 : 1.9);
        line([x - 2, ey - (mood === 'sly' ? 0.3 : 0.7), x + 2, ey - (mood === 'sly' ? 0.3 : 0.7)], 0.8);
      }
    }
  }

  // Mouth
  const lip = shade(skinN, -70);
  if (mood === 'happy') {
    ctx.fillStyle = '#5a1f1a';
    ctx.beginPath();
    ctx.arc(24, 20.2, 2.3, 0.05 * Math.PI, 0.95 * Math.PI);
    ctx.closePath();
    ctx.fill();
  } else if (mood === 'scared') {
    ctx.fillStyle = '#5a1f1a';
    ellipse(ctx, 24, 21.4, 1.1, 1.4);
  } else if (mood === 'suspicious') {
    line([22.4, 21.3, 25.8, 21], 0.9, lip);
  } else if (mood === 'sly') {
    ctx.strokeStyle = lip;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(22.2, 21);
    ctx.quadraticCurveTo(24.5, 21.8, 26.4, 19.9);
    ctx.stroke();
  } else {
    ctx.strokeStyle = lip;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(24, 20.6, 1.8, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();
  }
}
