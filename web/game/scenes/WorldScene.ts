import * as Phaser from 'phaser';
import {
  GAME,
  SABOTAGE_DEFS,
  boxOverlapsRect,
  dist,
  getMap,
  moveWithCollision,
  zoneAt,
  type Appearance,
  type GameMapDef,
  type PositionSnapshot,
  type Rect,
} from '@nizhal/shared';
import { useGame, sameActions, NO_ACTIONS, type ProximityActions } from '@/state/gameStore';
import { useSettings } from '@/state/settingsStore';
import { sendMove } from '@/services/net';
import { audio } from '@/services/audio';
import { SIGNS } from '@/utils/i18n/ml';
import { bridge } from '../bridge';
import { appearanceKey, drawCharacter, CHAR_FRAMES, CHAR_H, CHAR_W } from '../art/character';
import { drawStatic, makeCanopyTextures, makeTextures, PALETTE } from '../art/mapArt';

const TEX_SCALE = 2;
const SPRITE_SCALE = 1 / TEX_SCALE;
const FEET_ORIGIN_Y = 68 / CHAR_H;
const DEPTH = {
  bodies: 5,
  players: 10,
  canopy: 800,
  darkness: 900,
  markers: 910,
  rain: 950,
  flash: 960,
};

interface Sample {
  t: number;
  x: number;
  y: number;
  flags: number;
}

interface Actor {
  id: string;
  container: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  label: Phaser.GameObjects.Text;
  appearanceKey: string;
  samples: Sample[];
  lastSeen: number;
  x: number;
  y: number;
  moving: boolean;
  left: boolean;
  ghost: boolean;
}

export class WorldScene extends Phaser.Scene {
  private map!: GameMapDef;
  private me: Actor | null = null;
  private remotes = new Map<string, Actor>();
  private bodies = new Map<string, { img: Phaser.GameObjects.Image; victimId: string; x: number; y: number }>();
  private keys!: Record<'W' | 'A' | 'S' | 'D' | 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', Phaser.Input.Keyboard.Key>;
  private visionMask!: Phaser.GameObjects.Image;
  private darkRects!: Phaser.GameObjects.Graphics;
  private flash!: Phaser.GameObjects.Rectangle;
  private rainZone = new Phaser.Geom.Rectangle(-100, -40, 2000, 10);
  private rippleZone = new Phaser.Geom.Rectangle(0, 0, 100, 100);
  private rain: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private ripples: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private water: Phaser.GameObjects.TileSprite[] = [];
  private lampGlows: Phaser.GameObjects.Image[] = [];
  private canopies: { g: Phaser.GameObjects.Image; x: number; y: number }[] = [];
  private lockedDoors!: Phaser.GameObjects.Graphics;
  private markers!: Phaser.GameObjects.Graphics;
  private killRing!: Phaser.GameObjects.Graphics;
  private lastSend = 0;
  private sentX = 0;
  private sentY = 0;
  private sentMoving = false;
  private seq = 0;
  private vision = GAME.VISION_HUMAN;
  private lastProximity = 0;
  private lastZone = 0;
  private userZoom = 1;
  private unsubs: (() => void)[] = [];
  private nextLightning = 0;
  private printsLayer: Phaser.GameObjects.Graphics | null = null;
  private printCount = -1;

  constructor() {
    super('world');
  }

  create(): void {
    const gs = useGame.getState();
    this.map = getMap(gs.state?.mapId ?? 'kadalimukku_night');
    makeTextures(this);
    this.cameras.main.setBounds(0, 0, this.map.width, this.map.height).setBackgroundColor('#0e1512').setRoundPixels(false);

    this.water = drawStatic(this, this.map).water;
    this.buildSigns();
    this.buildLamps();
    this.buildCanopies();

    this.lockedDoors = this.add.graphics().setDepth(6);
    this.markers = this.add.graphics().setDepth(DEPTH.markers);
    this.killRing = this.add.graphics().setDepth(DEPTH.bodies - 1);

    const tut = bridge.tutorial;
    if (tut) {
      this.cameras.main.setBounds(tut.bounds.x, tut.bounds.y, tut.bounds.w, tut.bounds.h);
      this.drawBarriers(tut.barriers);
      // Below the darkness: footprints only show inside the player's light.
      this.printsLayer = this.add.graphics().setDepth(3);
    }

    // Night vision: a soft-edged mask image around the player plus four fills
    // covering the rest of the view. No per-frame render targets (cheap on phones).
    this.visionMask = this.add.image(0, 0, 'visionMask').setDepth(DEPTH.darkness);
    this.darkRects = this.add.graphics().setDepth(DEPTH.darkness);
    this.flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xdfe8ff, 1).setOrigin(0).setScrollFactor(0).setDepth(DEPTH.flash).setAlpha(0);
    this.buildWeather();

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT', false) as typeof this.keys;
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.userZoom = Phaser.Math.Clamp(this.userZoom - dy * 0.001, 0.75, 1.35);
      bridge.zoomChanges++;
      this.applyZoom();
    });

    this.scale.on('resize', this.onResize, this);
    this.applyZoom();

    bridge.snapshotListener = (s, at) => this.onSnapshot(s, at);
    if (bridge.lastSnapshot) this.onSnapshot(bridge.lastSnapshot.snap, bridge.lastSnapshot.at);

    this.unsubs.push(
      useGame.subscribe((s, prev) => {
        if (s.state?.lockedDoorIds !== prev.state?.lockedDoorIds) this.drawLockedDoors();
        if (s.state?.sabotage?.type !== prev.state?.sabotage?.type) this.updateLamps();
        if (s.state?.players !== prev.state?.players) this.syncAppearances();
      }),
    );
    this.drawLockedDoors();
    this.updateLamps();
    this.nextLightning = this.time.now + Phaser.Math.Between(12000, 30000);

    audio.startAmbience();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());
  }

  private cleanup(): void {
    this.unsubs.forEach((u) => u());
    this.unsubs = [];
    if (bridge.snapshotListener) bridge.snapshotListener = null;
    this.scale.off('resize', this.onResize, this);
    audio.stopAmbience();
  }

  // ── Build ──────────────────────────────────────────────────────────────
  private buildSigns(): void {
    for (const b of this.map.buildings) {
      if (!b.signKey) continue;
      const text = SIGNS[b.signKey];
      if (!text) continue;
      const x = b.floor.x + b.floor.w / 2;
      const y = b.floor.y - 4;
      const label = this.add
        .text(x, y, text, { fontFamily: '"Baloo Chettan 2", "Noto Sans Malayalam", sans-serif', fontSize: '15px', color: '#ece6d6' })
        .setOrigin(0.5, 1)
        .setResolution(2)
        .setDepth(7);
      const bg = this.add
        .rectangle(x, y + 1, label.width + 16, label.height + 2, 0x2f4f3a, 1)
        .setOrigin(0.5, 1)
        .setStrokeStyle(2, 0xd8b640, 0.8)
        .setDepth(6.9);
      void bg;
    }
  }

  private buildLamps(): void {
    for (const d of this.map.decorations) {
      if (d.kind !== 'lamp') continue;
      const glow = this.add
        .image(d.x + d.w / 2, d.y + d.h / 2, 'glow')
        .setScale(2.4)
        .setAlpha(0.4)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(DEPTH.darkness + 1);
      this.lampGlows.push(glow);
    }
  }

  private updateLamps(): void {
    const off = useGame.getState().state?.sabotage?.type === 'POWER_FAILURE';
    for (const g of this.lampGlows) g.setVisible(!off);
  }

  private buildCanopies(): void {
    const keys = makeCanopyTextures(this);
    this.map.decorations.forEach((d, i) => {
      if (d.kind !== 'tree') return;
      const cx = d.x + d.w / 2;
      const cy = d.y + d.h / 2 - 26;
      const g = this.add
        .image(cx, cy, keys[i % keys.length]!)
        .setAngle((i * 47) % 360)
        .setDepth(DEPTH.canopy)
        .setAlpha(0.92);
      this.canopies.push({ g, x: cx, y: cy + 26 });
    });
  }

  private buildWeather(): void {
    const s = useSettings.getState();
    if (!s.rain) return;
    const low = s.quality === 'low';
    this.rainZone.width = this.scale.width + 200;
    this.rain = this.add
      .particles(0, 0, 'rain', {
        emitZone: { type: 'random', source: this.rainZone, quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
        lifespan: 700,
        speedY: { min: 1100, max: 1400 },
        speedX: { min: -180, max: -140 },
        rotate: 8,
        scaleY: { min: 0.7, max: 1.4 },
        alpha: { start: 0.32, end: 0.12 },
        quantity: low ? 1 : 3,
        frequency: low ? 24 : 12,
      })
      .setScrollFactor(0)
      .setDepth(DEPTH.rain);
    if (!low) {
      this.ripples = this.add
        .particles(0, 0, 'ripple', {
          emitZone: { type: 'random', source: this.rippleZone, quantity: 1 } as Phaser.Types.GameObjects.Particles.EmitZoneData,
          lifespan: 520,
          scale: { start: 0.3, end: 1.3 },
          alpha: { start: 0.45, end: 0 },
          quantity: 2,
          frequency: 40,
        })
        .setDepth(2.5);
    }
  }

  // ── Resize / zoom ──────────────────────────────────────────────────────
  private onResize(size: Phaser.Structs.Size): void {
    this.flash.setSize(size.width, size.height);
    this.rainZone.width = size.width + 200;
    this.applyZoom();
  }

  private applyZoom(): void {
    const dpr = (this.game.registry.get('dpr') as number) ?? 1;
    const cssH = this.scale.height / dpr;
    const cssW = this.scale.width / dpr;
    // Show roughly 720 world units vertically (less on very wide phones).
    const base = Phaser.Math.Clamp(Math.min(cssH / 700, cssW / 1100), 0.42, 1.6);
    this.cameras.main.setZoom(base * this.userZoom * dpr);
  }

  // ── Characters ─────────────────────────────────────────────────────────
  private charTexture(a: Appearance): string {
    const key = `ch_${appearanceKey(a)}`;
    if (this.textures.exists(key)) return key;
    const fw = CHAR_W * TEX_SCALE;
    const fh = CHAR_H * TEX_SCALE;
    const tex = this.textures.createCanvas(key, fw * CHAR_FRAMES, fh)!;
    const ctx = tex.getContext();
    ctx.scale(TEX_SCALE, TEX_SCALE);
    for (let f = 0; f < CHAR_FRAMES; f++) drawCharacter(ctx, a, f, f * CHAR_W, 0);
    tex.refresh();
    for (let f = 0; f < CHAR_FRAMES; f++) tex.add(f, 0, f * fw, 0, fw, fh);
    return key;
  }

  private makeActor(id: string, appearance: Appearance, name: string, isMe: boolean): Actor {
    const key = this.charTexture(appearance);
    const sprite = this.add.image(0, 0, key, 0).setOrigin(0.5, FEET_ORIGIN_Y).setScale(SPRITE_SCALE);
    const fellowCat = useGame.getState().role?.fellowCats.some((c) => c.id === id) ?? false;
    const label = this.add
      .text(0, -44, name, {
        fontFamily: 'Manrope, "Noto Sans Malayalam", sans-serif',
        fontSize: '12px',
        fontStyle: '600',
        color: fellowCat ? '#e9b04f' : isMe ? '#ffffff' : '#e8e1cf',
        stroke: '#0e1512',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 1)
      .setResolution(2);
    const container = this.add.container(0, 0, [sprite, label]).setDepth(DEPTH.players);
    return { id, container, sprite, label, appearanceKey: key, samples: [], lastSeen: 0, x: 0, y: 0, moving: false, left: false, ghost: false };
  }

  private playerInfo(id: string) {
    return useGame.getState().state?.players.find((p) => p.id === id);
  }

  private syncAppearances(): void {
    for (const a of [...this.remotes.values(), ...(this.me ? [this.me] : [])]) {
      const info = this.playerInfo(a.id);
      if (!info) continue;
      const key = this.charTexture(info.appearance);
      if (key !== a.appearanceKey) {
        a.sprite.setTexture(key, 0);
        a.appearanceKey = key;
      }
      a.label.setText(info.name);
    }
  }

  private ensureMe(): Actor | null {
    if (this.me) return this.me;
    const { self } = useGame.getState();
    const myId = this.registry.get('selfId') as string | undefined;
    const info = myId ? this.playerInfo(myId) : undefined;
    if (!self || !myId || !info) return null;
    this.me = this.makeActor(myId, info.appearance, info.name, true);
    this.me.x = self.x;
    this.me.y = self.y;
    this.sentX = self.x;
    this.sentY = self.y;
    this.me.container.setPosition(self.x, self.y);
    this.cameras.main.startFollow(this.me.container, true, 0.14, 0.14);
    this.cameras.main.centerOn(self.x, self.y);
    return this.me;
  }

  // ── Network input ─────────────────────────────────────────────────────
  private onSnapshot(snap: PositionSnapshot, at: number): void {
    const selfId = this.registry.get('selfId') as string | undefined;
    for (const [id, x, y, flags] of snap.p) {
      if (id === selfId) continue;
      let actor = this.remotes.get(id);
      if (!actor) {
        const info = this.playerInfo(id);
        if (!info) continue;
        actor = this.makeActor(id, info.appearance, info.name, false);
        actor.x = x;
        actor.y = y;
        actor.container.setPosition(x, y);
        this.remotes.set(id, actor);
      }
      const last = actor.samples[actor.samples.length - 1];
      if (last && Math.hypot(last.x - x, last.y - y) > 160) actor.samples = []; // teleport → snap
      actor.samples.push({ t: at, x, y, flags });
      if (actor.samples.length > 20) actor.samples.shift();
      actor.lastSeen = at;
    }

    const seen = new Set<string>();
    for (const [bodyId, victimId, x, y] of snap.b) {
      seen.add(bodyId);
      if (this.bodies.has(bodyId)) continue;
      const info = this.playerInfo(victimId);
      if (!info) continue;
      const img = this.add
        .image(x, y - 8, this.charTexture(info.appearance), 4)
        .setScale(SPRITE_SCALE)
        .setAngle(-90)
        .setDepth(DEPTH.bodies)
        .setTint(0xb8c0c8);
      this.bodies.set(bodyId, { img, victimId, x, y });
    }
    for (const [id, b] of this.bodies) {
      if (!seen.has(id)) {
        b.img.destroy();
        this.bodies.delete(id);
      }
    }
  }

  // ── Frame loop ────────────────────────────────────────────────────────
  override update(time: number, delta: number): void {
    const gs = useGame.getState();
    const me = this.ensureMe();
    const now = performance.now();
    // Allow large steps on slow devices (collision sub-steps internally) so low FPS doesn't mean slow walking.
    const dt = Math.min(delta, 100) / 1000;

    if (me && bridge.pendingTeleport) {
      me.x = bridge.pendingTeleport.x;
      me.y = bridge.pendingTeleport.y;
      bridge.pendingTeleport = null;
      me.container.setPosition(me.x, me.y);
      this.cameras.main.centerOn(me.x, me.y);
    }

    const phase = gs.state?.phase;
    const alive = gs.self?.alive ?? true;
    const frozen = phase !== 'PLAYING' || (gs.panel !== null && gs.panel.kind !== 'map');

    if (me) {
      this.moveLocal(me, dt, frozen, alive, now);
      me.ghost = !alive;
      me.sprite.setAlpha(alive ? 1 : 0.45);
      this.animate(me, time);
      bridge.localPos.x = me.x;
      bridge.localPos.y = me.y;
    }

    this.interpolateRemotes(now, time, alive);
    this.updateCamera(gs.followId, alive);
    this.updateVision(dt, alive);
    this.updateWeather(time);
    this.updateCanopies();
    this.drawMarkers(time);

    if (me && time - this.lastProximity > 100) {
      this.lastProximity = time;
      this.computeProximity(me, alive, phase === 'PLAYING');
    }
    if (me && time - this.lastZone > 300) {
      this.lastZone = time;
      const z = zoneAt(this.map, me);
      if (z !== gs.zoneId) useGame.getState().set({ zoneId: z });
    }
  }

  private collidersFor(x: number, y: number): readonly Rect[] {
    const locked = useGame.getState().state?.lockedDoorIds ?? [];
    const barriers = bridge.tutorial?.barriers ?? [];
    if (!locked.length && !barriers.length) return this.map.colliders;
    const doors = this.map.doors.filter((d) => locked.includes(d.id) && !boxOverlapsRect(x, y, GAME.PLAYER_HALF, d));
    return [...this.map.colliders, ...barriers, ...doors];
  }

  private moveLocal(me: Actor, dt: number, frozen: boolean, alive: boolean, now: number): void {
    let vx = 0;
    let vy = 0;
    if (!frozen) {
      const k = this.keys;
      if (k.A.isDown || k.LEFT.isDown) vx -= 1;
      if (k.D.isDown || k.RIGHT.isDown) vx += 1;
      if (k.W.isDown || k.UP.isDown) vy -= 1;
      if (k.S.isDown || k.DOWN.isDown) vy += 1;
      if (vx === 0 && vy === 0) {
        vx = bridge.joy.x;
        vy = bridge.joy.y;
      }
      const len = Math.hypot(vx, vy);
      if (len > 1) {
        vx /= len;
        vy /= len;
      }
    }
    const moving = Math.hypot(vx, vy) > 0.08;
    if (moving) {
      const dx = vx * GAME.PLAYER_SPEED * dt;
      const dy = vy * GAME.PLAYER_SPEED * dt;
      if (alive) {
        const next = moveWithCollision(me.x, me.y, dx, dy, GAME.PLAYER_HALF, this.collidersFor(me.x, me.y), this.map.width, this.map.height);
        me.x = next.x;
        me.y = next.y;
      } else {
        me.x = Phaser.Math.Clamp(me.x + dx, GAME.PLAYER_HALF, this.map.width - GAME.PLAYER_HALF);
        me.y = Phaser.Math.Clamp(me.y + dy, GAME.PLAYER_HALF, this.map.height - GAME.PLAYER_HALF);
      }
      if (Math.abs(vx) > 0.1) me.left = vx < 0;
    }
    me.moving = moving;
    me.container.setPosition(me.x, me.y);
    me.container.setDepth(DEPTH.players + me.y / 10000);

    const changed = Math.abs(me.x - this.sentX) > 0.5 || Math.abs(me.y - this.sentY) > 0.5 || moving !== this.sentMoving;
    if (!frozen && changed && now - this.lastSend >= GAME.MOVE_SEND_INTERVAL_MS) {
      this.lastSend = now;
      this.sentX = me.x;
      this.sentY = me.y;
      this.sentMoving = moving;
      sendMove(Math.round(me.x * 10) / 10, Math.round(me.y * 10) / 10, moving, me.left, ++this.seq);
    }
  }

  private animate(a: Actor, time: number): void {
    a.sprite.setFlipX(a.left);
    a.sprite.setFrame(a.moving ? Math.floor(time / 130) % 4 : 0);
  }

  private interpolateRemotes(now: number, time: number, viewerAlive: boolean): void {
    const renderT = now - GAME.INTERPOLATION_DELAY_MS;
    for (const a of this.remotes.values()) {
      const visible = now - a.lastSeen < 350;
      a.container.setVisible(visible);
      if (!visible || a.samples.length === 0) continue;
      const s = a.samples;
      let x = s[s.length - 1]!.x;
      let y = s[s.length - 1]!.y;
      let flags = s[s.length - 1]!.flags;
      for (let i = s.length - 1; i > 0; i--) {
        const b = s[i]!;
        const p = s[i - 1]!;
        if (p.t <= renderT && renderT <= b.t) {
          const k = (renderT - p.t) / Math.max(1, b.t - p.t);
          x = p.x + (b.x - p.x) * k;
          y = p.y + (b.y - p.y) * k;
          flags = p.flags;
          break;
        }
      }
      if (renderT < s[0]!.t) {
        x = s[0]!.x;
        y = s[0]!.y;
      }
      a.x = x;
      a.y = y;
      a.moving = (flags & 1) === 1;
      a.left = (flags & 2) === 2;
      a.ghost = (flags & 4) === 4;
      a.container.setPosition(x, y).setDepth(DEPTH.players + y / 10000);
      a.sprite.setAlpha(a.ghost ? 0.4 : 1);
      a.label.setAlpha(a.ghost ? 0.6 : 1);
      this.animate(a, time);
    }
    void viewerAlive;
  }

  private updateCamera(followId: string | null, alive: boolean): void {
    const cam = this.cameras.main;
    const target = !alive && followId ? this.remotes.get(followId) : null;
    const desired = target?.container ?? this.me?.container;
    if (desired && (cam as unknown as { _follow: unknown })._follow !== desired) cam.startFollow(desired, true, 0.14, 0.14);
  }

  private updateVision(dt: number, alive: boolean): void {
    const target = useGame.getState().self?.visionRadius ?? GAME.VISION_HUMAN;
    this.vision += (Math.min(target, 2000) - this.vision) * Math.min(1, dt * 3);
    const view = this.cameras.main.worldView;
    const g = this.darkRects;
    g.clear();
    const vx0 = view.x - 40;
    const vy0 = view.y - 40;
    const vx1 = view.right + 40;
    const vy1 = view.bottom + 40;
    if (!alive || !this.me) {
      // Spectators see the whole town, only lightly dimmed.
      this.visionMask.setVisible(false);
      g.fillStyle(0x04070b, 0.22).fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
      return;
    }
    const alpha = 0.9;
    const r = this.vision;
    const cx = this.me.x;
    const cy = this.me.y - 20;
    this.visionMask.setVisible(true).setPosition(cx, cy).setDisplaySize(r * 2, r * 2).setAlpha(alpha);
    // Fills overlap the mask edge by ~1.5 screen px so no sub-pixel gap shows as a bright line.
    const o = 1.5 / this.cameras.main.zoom;
    const L = cx - r + o;
    const R = cx + r - o;
    const T = cy - r + o;
    const B = cy + r - o;
    g.fillStyle(0x04070b, alpha);
    if (T > vy0) g.fillRect(vx0, vy0, vx1 - vx0, T - vy0);
    if (B < vy1) g.fillRect(vx0, B, vx1 - vx0, vy1 - B);
    const top = Math.max(T, vy0);
    const bottom = Math.min(B, vy1);
    if (bottom > top) {
      if (L > vx0) g.fillRect(vx0, top, L - vx0, bottom - top);
      if (R < vx1) g.fillRect(R, top, vx1 - R, bottom - top);
    }
  }

  private updateWeather(time: number): void {
    for (const w of this.water) w.tilePositionX -= 0.25;
    const view = this.cameras.main.worldView;
    this.rippleZone.setTo(view.x, view.y, view.width, view.height);

    if (time > this.nextLightning) {
      this.nextLightning = time + Phaser.Math.Between(18000, 45000);
      const reduce = useSettings.getState().reduceFlashes;
      const peak = reduce ? 0.12 : 0.55;
      this.tweens.chain({
        targets: this.flash,
        tweens: [
          { alpha: peak, duration: 60 },
          { alpha: 0, duration: 120 },
          { alpha: peak * 0.6, duration: 50 },
          { alpha: 0, duration: 400 },
        ],
      });
      this.time.delayedCall(Phaser.Math.Between(500, 1800), () => audio.play('thunder'));
    }
  }

  private updateCanopies(): void {
    const me = this.me;
    for (const c of this.canopies) {
      const under = me ? dist(me.x, me.y, c.x, c.y) < 50 : false;
      const target = under ? 0.35 : 0.92;
      c.g.setAlpha(c.g.alpha + (target - c.g.alpha) * 0.15);
    }
  }

  private drawLockedDoors(): void {
    const g = this.lockedDoors;
    g.clear();
    const locked = useGame.getState().state?.lockedDoorIds ?? [];
    for (const d of this.map.doors) {
      if (!locked.includes(d.id)) continue;
      g.fillStyle(0x7d2e22, 1).fillRect(d.x, d.y, d.w, d.h);
      g.lineStyle(2, 0xc9a24a, 0.9);
      if (d.orientation === 'h') for (let x = d.x + 6; x < d.x + d.w; x += 10) g.lineBetween(x, d.y + 2, x, d.y + d.h - 2);
      else for (let y = d.y + 6; y < d.y + d.h; y += 10) g.lineBetween(d.x + 2, y, d.x + d.w - 2, y);
    }
  }

  private drawMarkers(time: number): void {
    const g = this.markers;
    g.clear();
    const { self, state, actions } = useGame.getState();
    if (!self || state?.phase !== 'PLAYING') {
      this.killRing.clear();
      return;
    }
    const pulse = 0.55 + Math.sin(time / 220) * 0.35;
    if (self.alive) {
      for (const t of self.tasks) {
        if (t.done) continue;
        const st = this.map.taskStations.find((s) => s.id === t.stationId);
        if (!st) continue;
        g.fillStyle(PALETTE.lamp, pulse).fillTriangle(st.x - 7, st.y - 30, st.x + 7, st.y - 30, st.x, st.y - 20);
        g.lineStyle(2, PALETTE.lamp, pulse * 0.8).strokeCircle(st.x, st.y, 16);
      }
    }
    const sab = state.sabotage;
    if (sab) {
      for (const id of SABOTAGE_DEFS[sab.type].repairStationIds) {
        if (sab.repairedStationIds.includes(id)) continue;
        const st = this.map.sabotageStations.find((s) => s.id === id);
        if (!st) continue;
        g.lineStyle(3, 0xd0553d, pulse).strokeCircle(st.x, st.y, 20 + pulse * 6);
        g.fillStyle(0xd0553d, pulse).fillCircle(st.x, st.y - 28, 5);
      }
    }
    // Alarm bell ring
    const e = this.map.emergency;
    g.lineStyle(2, 0xc99a3b, 0.35 + pulse * 0.2).strokeCircle(e.x, e.y, 26);
    this.drawTutorial(g, time, pulse);

    this.killRing.clear();
    if (actions.killTargetId) {
      const target = this.remotes.get(actions.killTargetId);
      if (target) this.killRing.lineStyle(2, 0xb5573a, 0.9).strokeEllipse(target.x, target.y, 40, 16);
    }
  }

  // ── Tutorial layers ──────────────────────────────────────────────────
  /** Flood barricades closing off the tutorial corner of town. */
  private drawBarriers(barriers: readonly Rect[]): void {
    const g = this.add.graphics().setDepth(6);
    for (const b of barriers) {
      g.fillStyle(0x1b1712, 1).fillRect(b.x - 2, b.y - 2, b.w + 4, b.h + 4);
      const vertical = b.h > b.w;
      const len = vertical ? b.h : b.w;
      for (let i = 0; i < len; i += 22) {
        const s = Math.min(11, len - i);
        g.fillStyle(0xd8b640, 1);
        if (vertical) g.fillRect(b.x, b.y + i, b.w, s);
        else g.fillRect(b.x + i, b.y, s, b.h);
      }
    }
  }

  private drawPrint(g: Phaser.GameObjects.Graphics, p: { x: number; y: number; a: number; kind: 'paw' | 'shoe' }): void {
    // Local (forward, right) offsets rotated by the heading.
    const fx = Math.cos(p.a);
    const fy = Math.sin(p.a);
    const at = (f: number, r: number): [number, number] => [p.x + fx * f - fy * r, p.y + fy * f + fx * r];
    g.fillStyle(0x070c0b, 0.62);
    if (p.kind === 'paw') {
      g.fillCircle(...at(0, 0), 4);
      for (const [f, r] of [[6, -4], [8, -1.5], [8, 1.5], [6, 4]] as const) g.fillCircle(...at(f, r), 1.8);
    } else {
      g.fillCircle(...at(4, 0), 3.8);
      g.fillCircle(...at(-4, 0), 3);
    }
  }

  private drawTutorial(g: Phaser.GameObjects.Graphics, time: number, pulse: number): void {
    const tut = bridge.tutorial;
    if (!tut) return;
    if (this.printsLayer && tut.prints.length !== this.printCount) {
      this.printCount = tut.prints.length;
      this.printsLayer.clear();
      for (const p of tut.prints) this.drawPrint(this.printsLayer, p);
    }
    for (const c of tut.clues) {
      if (c.found) continue;
      g.lineStyle(2, 0x9fd3e6, pulse).strokeCircle(c.x, c.y, 14 + pulse * 4);
      g.fillStyle(0x9fd3e6, pulse).fillCircle(c.x, c.y - 26, 4);
    }
    const target = tut.guide;
    if (!target || !this.me) return;
    g.lineStyle(3, PALETTE.lamp, 0.5 + pulse * 0.4).strokeCircle(target.x, target.y, 22 + pulse * 8);
    // Chevron orbiting the player, pointing at the objective.
    const ox = this.me.x;
    const oy = this.me.y - 20;
    const dx = target.x - ox;
    const dy = target.y - oy;
    const d = Math.hypot(dx, dy);
    if (d < 140) return;
    const ux = dx / d;
    const uy = dy / d;
    const r = 62 + Math.sin(time / 180) * 6;
    const cx = ox + ux * r;
    const cy = oy + uy * r;
    g.fillStyle(PALETTE.lamp, 0.95).fillTriangle(cx + ux * 14, cy + uy * 14, cx - ux * 8 - uy * 10, cy - uy * 8 + ux * 10, cx - ux * 8 + uy * 10, cy - uy * 8 - ux * 10);
  }

  private computeProximity(me: Actor, alive: boolean, playing: boolean): void {
    const gs = useGame.getState();
    const self = gs.self;
    const next: ProximityActions = { ...NO_ACTIONS };
    if (playing && alive && self) {
      let best: number = GAME.INTERACT_RANGE;
      for (const t of self.tasks) {
        if (t.done) continue;
        const st = this.map.taskStations.find((s) => s.id === t.stationId);
        if (!st) continue;
        const d = dist(me.x, me.y, st.x, st.y);
        if (d <= best) {
          best = d;
          next.taskId = t.id;
        }
      }
      const sab = gs.state?.sabotage;
      if (sab) {
        for (const id of SABOTAGE_DEFS[sab.type].repairStationIds) {
          if (sab.repairedStationIds.includes(id)) continue;
          const st = this.map.sabotageStations.find((s) => s.id === id);
          if (st && dist(me.x, me.y, st.x, st.y) <= GAME.INTERACT_RANGE) next.repairStationId = id;
        }
      }
      let bodyBest: number = GAME.REPORT_RANGE;
      for (const [id, b] of this.bodies) {
        const d = dist(me.x, me.y, b.x, b.y);
        if (d <= bodyBest) {
          bodyBest = d;
          next.bodyId = id;
        }
      }
      const critical = sab ? SABOTAGE_DEFS[sab.type].critical : false;
      next.emergency =
        self.emergencyLeft > 0 && !critical && dist(me.x, me.y, this.map.emergency.x, this.map.emergency.y) <= GAME.EMERGENCY_RANGE;

      if (self.role === 'CAT') {
        const fellow = new Set(gs.role?.fellowCats.map((c) => c.id));
        let killBest: number = GAME.KILL_RANGE - 4;
        for (const r of this.remotes.values()) {
          if (!r.container.visible || r.ghost || fellow.has(r.id)) continue;
          const d = dist(me.x, me.y, r.x, r.y);
          if (d <= killBest) {
            killBest = d;
            next.killTargetId = r.id;
          }
        }
      }
    }
    if (!sameActions(next, gs.actions)) useGame.getState().set({ actions: next });
  }
}
