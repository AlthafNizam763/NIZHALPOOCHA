'use client';
import {
  C2S,
  DEFAULT_SETTINGS,
  GAME,
  dist,
  type Ack,
  type Appearance,
  type ChatMessage,
  type GamePlayerView,
  type GameStateView,
  type Point,
  type SelfState,
  type VoteEntry,
  type VoteResult,
} from '@nizhal/shared';
import { useGame } from '@/state/gameStore';
import { useUi } from '@/state/uiStore';
import { serverNow } from '@/state/connectionStore';
import { bridge, type TutorialWorld } from '@/game/bridge';
import { CAST, CAST_IDS, type CastId } from '@/game/cast';
import { setOfflineHandler } from '@/services/net';
import { audio } from '@/services/audio';
import { t } from '@/hooks/useT';
import type { I18nKey } from '@/utils/i18n';
import { useTutorial } from './tutorialStore';

/*
 * The tutorial runs the real Phaser scene and match HUD against this local
 * "server": it answers the HUD's requests (see setOfflineHandler), drives five
 * scripted villagers, and walks the player through eight lessons in a fenced-off
 * corner of Kadalimukku (junction → bus stop → Electrical Room).
 */

const OK: Ack<undefined> = { ok: true, data: undefined };
const npcId = (id: CastId) => `npc_${id}`;

const BOUNDS = { x: 1100, y: 0, w: 1300, h: 940 };
/** Flood barricades: west of the junction road and along the south road. */
const BARRIERS = [
  { x: 1124, y: 0, w: 14, h: 919 },
  { x: 1124, y: 905, w: 1276, h: 14 },
];
// Open ground east of the junction (clear of the CCTV pole straight north of the map spawn).
const SPAWN = { x: 1385, y: 760 };
const ELECTRICAL_DOOR = { x: 2010, y: 330 };
const POWER_PANEL = { x: 1901, y: 170 };
const FUSE_BOARD = { x: 2120, y: 170 };
const CLUES: readonly { id: string; x: number; y: number; line: I18nKey }[] = [
  { id: 'c1', x: 1800, y: 262, line: 'tut.inv.c1' },
  { id: 'c2', x: 1640, y: 345, line: 'tut.inv.c2' },
  { id: 'c3', x: 1600, y: 490, line: 'tut.inv.c3' },
];
const BODY = { x: 1440, y: 505 };
const INSPECT_RANGE = 72;
const PAW_TRAIL: Point[] = [
  { x: 2095, y: 205 },
  { x: 1990, y: 236 },
  { x: 1880, y: 256 },
  { x: 1800, y: 262 },
  { x: 1720, y: 315 },
  { x: 1640, y: 345 },
  { x: 1690, y: 395 },
  { x: 1690, y: 450 },
  { x: 1600, y: 490 },
];
const SHOE_TRAIL: Point[] = [
  { x: 1600, y: 490 },
  { x: BODY.x + 20, y: BODY.y },
];

type Step =
  | 'reveal'
  | 'welcome'
  | 'move'
  | 'camera'
  | 'mapOpen'
  | 'goElectrical'
  | 'wrong'
  | 'usePanel'
  | 'powerBack'
  | 'task'
  | 'taskDone'
  | 'invIntro'
  | 'investigate'
  | 'bodyReveal'
  | 'report'
  | 'reportSplash'
  | 'meeting'
  | 'think'
  | 'vote'
  | 'tally'
  | 'done';

interface Npc {
  id: CastId;
  x: number;
  y: number;
  path: Point[];
  loop: boolean;
  leg: number;
  wait: number;
  speed: number;
  left: boolean;
  moving: boolean;
  visible: boolean;
}

function npc(id: CastId, path: Point[], speed: number): Npc {
  const start = path[0]!;
  return { id, x: start.x, y: start.y, path, loop: true, leg: 0, wait: Math.random() * 1.5, speed, left: false, moving: false, visible: true };
}

/** Footprints every ~34 units along a polyline, alternating left/right. */
function trail(points: readonly Point[], kind: 'paw' | 'shoe'): TutorialWorld['prints'] {
  const out: TutorialWorld['prints'] = [];
  let side = 1;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const heading = Math.atan2(b.y - a.y, b.x - a.x);
    for (let d = 0; d < len; d += 34) {
      const k = d / len;
      side = -side;
      out.push({
        x: a.x + (b.x - a.x) * k - Math.sin(heading) * side * 6,
        y: a.y + (b.y - a.y) * k + Math.cos(heading) * side * 6,
        a: heading,
        kind,
      });
    }
  }
  return out;
}

export interface TutorialPlayer {
  id: string;
  name: string;
  appearance: Appearance;
}

export class TutorialDirector {
  private readonly world: TutorialWorld = { bounds: BOUNDS, barriers: BARRIERS, guide: null, prints: [], clues: [] };
  private npcs: Npc[] = [];
  private step: Step = 'reveal';
  private timers: number[] = [];
  private loop = 0;
  private lastTick = 0;
  private zoomAtStart = 0;
  private nextClue = 0;
  private inspecting = false;
  private bodyDown = false;
  private chatted = false;
  private playerVote: string | null = null;
  private npcVotes: VoteEntry[] = [];

  constructor(private readonly me: TutorialPlayer) {}

  // ── Lifecycle ────────────────────────────────────────────────────────
  start(): void {
    useTutorial.getState().reset();
    bridge.tutorial = this.world;
    bridge.lastSnapshot = null;
    bridge.resetInput();
    setOfflineHandler((event, payload) => this.handle(event, payload));

    const now = serverNow();
    useGame.getState().reset();
    useGame.getState().set({ state: this.initialState(now), role: { role: 'HUMAN', fellowCats: [] }, self: this.initialSelf() });
    bridge.teleport(SPAWN.x, SPAWN.y);
    audio.play('reveal');

    this.npcs = [
      npc('ammu', [{ x: 1200, y: 570 }, { x: 1200, y: 850 }, { x: 1270, y: 850 }, { x: 1270, y: 570 }], 110),
      npc('rahul', [{ x: 1420, y: 640 }, { x: 1600, y: 640 }, { x: 1600, y: 700 }, { x: 1420, y: 700 }], 100),
      npc('fathima', [{ x: 1360, y: 505 }, { x: 1560, y: 505 }], 90),
      npc('joseph', [{ x: BODY.x, y: BODY.y - 5 }], 0),
      npc('meera', [{ x: 1650, y: 745 }, { x: 1790, y: 745 }], 90),
    ];
    this.lastTick = performance.now();
    this.loop = window.setInterval(() => this.tick(), GAME.SERVER_TICK_MS);
    this.go('reveal');
  }

  stop(): void {
    window.clearInterval(this.loop);
    this.timers.forEach((id) => window.clearTimeout(id));
    this.timers = [];
    setOfflineHandler(null);
    bridge.tutorial = null;
    bridge.lastSnapshot = null;
    bridge.pendingTeleport = null;
    bridge.resetInput();
    useGame.getState().reset();
    useTutorial.getState().reset();
  }

  private after(ms: number, fn: () => void): void {
    this.timers.push(window.setTimeout(fn, ms));
  }

  /** Advance only if we are still on `from` (guards against double triggers). */
  private goFrom(from: Step, to: Step): void {
    if (this.step === from) this.go(to);
  }

  // ── Match state helpers ──────────────────────────────────────────────
  private players(josephDown = false): GamePlayerView[] {
    return [
      { id: this.me.id, name: this.me.name, appearance: this.me.appearance, slot: 0, status: 'alive', connected: true },
      ...CAST_IDS.map((id, i) => ({
        id: npcId(id),
        name: t(CAST[id].nameKey),
        appearance: CAST[id].appearance,
        slot: i + 1,
        status: id === 'joseph' && josephDown ? ('dead' as const) : ('alive' as const),
        connected: true,
      })),
    ];
  }

  private initialState(now: number): GameStateView {
    return {
      phase: 'ROLE_REVEAL',
      phaseEndsAt: now + 4500,
      mapId: 'kadalimukku_old_town',
      settings: { ...DEFAULT_SETTINGS, catCount: 1, confirmEjects: true, anonymousVotes: false, voiceChat: false },
      hostId: this.me.id,
      players: this.players(),
      taskProgress: { done: 0, total: 6 },
      sabotage: null,
      lockedDoorIds: [],
      modeState: { survivalEndsAt: null, survivalRemainingMs: null, antidote: null, camerasOnline: true },
      meeting: null,
      voteResult: null,
      startedAt: null,
      serverNow: now,
    };
  }

  private initialSelf(): SelfState {
    return {
      alive: true,
      role: 'HUMAN',
      tasks: [],
      killReadyAt: null,
      sabotageReadyAt: null,
      emergencyLeft: 0,
      emergencyReadyAt: 0,
      visionRadius: GAME.VISION_HUMAN,
      infectedUntil: null,
      watchingCameras: false,
      x: SPAWN.x,
      y: SPAWN.y,
      teleportSeq: 1,
    };
  }

  private patchState(patch: Partial<GameStateView>): void {
    const gs = useGame.getState();
    if (gs.state) gs.set({ state: { ...gs.state, ...patch, serverNow: serverNow() } });
  }

  private patchSelf(patch: Partial<SelfState>): void {
    const gs = useGame.getState();
    if (gs.self) gs.set({ self: { ...gs.self, ...patch } });
  }

  private coach(patch: Parameters<ReturnType<typeof useTutorial.getState>['set']>[0]): void {
    useTutorial.getState().set(patch);
  }

  // ── The lesson script ────────────────────────────────────────────────
  private go(step: Step): void {
    this.step = step;
    switch (step) {
      case 'reveal':
        this.after(4500, () => this.go('welcome'));
        break;
      case 'welcome':
        this.patchState({ phase: 'PLAYING', phaseEndsAt: null, startedAt: serverNow() });
        this.coach({ thought: 'tut.welcome' });
        this.after(2600, () => this.go('move'));
        break;
      case 'move':
        this.coach({ lesson: 'move', thought: null, objective: { touch: 'tut.move.touch', keys: 'tut.move.keys' } });
        break;
      case 'camera':
        this.zoomAtStart = bridge.zoomChanges;
        this.coach({ lesson: 'camera', objective: { touch: 'tut.camera.touch', keys: 'tut.camera.keys' }, highlight: 'map' });
        break;
      case 'mapOpen':
        this.coach({ objective: 'tut.camera.close', highlight: null });
        break;
      case 'goElectrical':
        this.world.guide = ELECTRICAL_DOOR;
        this.coach({ lesson: 'interact', objective: 'tut.goElectrical', highlight: null });
        break;
      case 'wrong':
        this.powerFailure();
        this.world.guide = POWER_PANEL;
        this.coach({ objective: null, thought: 'tut.somethingWrong' });
        this.after(2000, () => this.go('usePanel'));
        break;
      case 'usePanel':
        this.coach({ thought: null, objective: { touch: 'tut.usePanel.touch', keys: 'tut.usePanel.keys' }, highlight: 'action-repair' });
        break;
      case 'powerBack':
        this.world.guide = null;
        this.coach({ objective: null, highlight: null, thought: 'tut.powerBack' });
        this.after(2400, () => this.go('task'));
        break;
      case 'task':
        this.patchSelf({ tasks: [{ id: 'tut_fuse', type: 'repair_fuse', stationId: 'st_repair_fuse', done: false }] });
        this.world.guide = FUSE_BOARD;
        this.coach({ lesson: 'task', thought: null, objective: { touch: 'tut.task.go.touch', keys: 'tut.task.go.keys' }, highlight: 'action-task' });
        break;
      case 'taskDone':
        this.world.guide = null;
        this.coach({ objective: null, highlight: null, thought: 'tut.task.done' });
        this.after(2600, () => this.go('invIntro'));
        break;
      case 'invIntro':
        this.world.prints = [...trail(PAW_TRAIL, 'paw'), ...trail(SHOE_TRAIL, 'shoe')];
        this.hideNpc('joseph');
        this.hideNpc('rahul');
        this.coach({ lesson: 'investigate', thought: 'tut.inv.intro' });
        this.after(2400, () => this.go('investigate'));
        break;
      case 'investigate':
        this.revealClue(0);
        this.coach({ thought: null, objective: { touch: 'tut.inv.follow.touch', keys: 'tut.inv.follow.keys' } });
        break;
      case 'bodyReveal':
        this.bodyDown = true;
        this.rahulFlees();
        this.world.guide = BODY;
        audio.play('stinger');
        this.coach({ lesson: 'report', objective: null, thought: 'tut.report.see', inspectable: null });
        this.after(3200, () => this.go('report'));
        break;
      case 'report':
        this.coach({ thought: null, objective: { touch: 'tut.report.do.touch', keys: 'tut.report.do.keys' }, highlight: 'action-report' });
        break;
      case 'reportSplash':
        this.startMeeting();
        this.after(GAME.REPORT_SPLASH_MS, () => this.go('meeting'));
        break;
      case 'meeting':
        this.patchState({ phase: 'MEETING' });
        this.coach({ lesson: 'meeting', objective: 'tut.meeting.intro' });
        this.after(1500, () => this.npcChat('meera', { quickId: 'where_body' }));
        this.after(4000, () => this.npcChat('rahul', { text: t('tut.chat.rahul') }));
        this.after(5000, () => this.step === 'meeting' && !this.chatted && this.coach({ objective: 'tut.meeting.chat', highlight: 'quick-chat' }));
        this.after(8500, () => this.npcChat('fathima', { text: t('tut.chat.fathima') }));
        this.after(11000, () => this.npcChat('ammu', { quickId: 'sus' }));
        // Players who never chat still move on.
        this.after(24000, () => this.goFrom('meeting', 'think'));
        break;
      case 'think':
        this.coach({ objective: null, highlight: null, thought: 'tut.meeting.think' });
        this.after(3800, () => this.go('vote'));
        break;
      case 'vote':
        this.startVoting();
        break;
      case 'tally':
        this.tally();
        this.after(GAME.VOTE_RESULT_MS, () => this.go('done'));
        break;
      case 'done':
        this.patchState({ phase: 'FINISHED' });
        this.coach({ lesson: null, finished: true });
        break;
    }
  }

  private tick(): void {
    const now = performance.now();
    const dt = Math.min(0.2, (now - this.lastTick) / 1000);
    this.lastTick = now;
    this.updateNpcs(dt);
    bridge.pushSnapshot({
      t: serverNow(),
      p: this.npcs.filter((n) => n.visible).map((n) => [npcId(n.id), Math.round(n.x), Math.round(n.y), (n.moving ? 1 : 0) | (n.left ? 2 : 0)]),
      b: this.bodyDown ? [['body_joseph', npcId('joseph'), BODY.x, BODY.y]] : [],
    });

    const pos = bridge.localPos;
    const placed = pos.x > 0 || pos.y > 0;
    const gs = useGame.getState();
    switch (this.step) {
      case 'move':
        if (placed && dist(pos.x, pos.y, SPAWN.x, SPAWN.y) > 120) this.go('camera');
        break;
      case 'camera':
        if (bridge.zoomChanges !== this.zoomAtStart) this.go('goElectrical');
        else if (gs.panel?.kind === 'map') this.go('mapOpen');
        break;
      case 'mapOpen':
        if (gs.panel?.kind !== 'map') this.go('goElectrical');
        break;
      case 'goElectrical':
        if (gs.zoneId === 'electrical') this.go('wrong');
        break;
      case 'investigate': {
        const clue = CLUES[this.nextClue];
        const inRange = !!clue && !this.inspecting && dist(pos.x, pos.y, clue.x, clue.y) <= INSPECT_RANGE;
        const id = inRange ? clue.id : null;
        if (useTutorial.getState().inspectable !== id) this.coach({ inspectable: id });
        break;
      }
      case 'vote': {
        const votingEndsAt = gs.state?.meeting?.votingEndsAt ?? 0;
        if ((this.playerVote !== null && this.npcVotes.length === 4) || serverNow() > votingEndsAt) this.go('tally');
        break;
      }
    }
  }

  // ── Villagers ────────────────────────────────────────────────────────
  private updateNpcs(dt: number): void {
    for (const n of this.npcs) {
      if (!n.visible) continue;
      if (n.wait > 0) {
        n.wait -= dt;
        n.moving = false;
        continue;
      }
      const target = n.path[n.leg]!;
      const dx = target.x - n.x;
      const dy = target.y - n.y;
      const d = Math.hypot(dx, dy);
      const stepLen = n.speed * dt;
      if (d <= stepLen || n.speed === 0) {
        n.x = target.x;
        n.y = target.y;
        n.moving = false;
        if (n.leg < n.path.length - 1) n.leg++;
        else if (n.loop) n.leg = 0;
        else n.visible = false;
        if (n.loop) n.wait = 0.6 + Math.random() * 1.6;
        continue;
      }
      n.x += (dx / d) * stepLen;
      n.y += (dy / d) * stepLen;
      n.moving = true;
      if (Math.abs(dx) > 1) n.left = dx < 0;
    }
  }

  private findNpc(id: CastId): Npc {
    return this.npcs.find((n) => n.id === id)!;
  }

  private hideNpc(id: CastId): void {
    this.findNpc(id).visible = false;
  }

  /** Rahul bolts from the body, right past the player, towards the workshop. */
  private rahulFlees(): void {
    const r = this.findNpc('rahul');
    Object.assign(r, {
      x: BODY.x + 30,
      y: BODY.y - 25,
      path: [
        { x: 1560, y: 535 },
        { x: 1800, y: 540 },
        { x: 1800, y: 740 },
        { x: 1840, y: 740 },
      ],
      loop: false,
      leg: 0,
      wait: 0.3,
      speed: 250,
      visible: true,
    });
  }

  // ── Actions ──────────────────────────────────────────────────────────
  private powerFailure(): void {
    this.patchState({ sabotage: { type: 'POWER_FAILURE', startedAt: serverNow(), endsAt: null, critical: false, repairedStationIds: [] } });
    this.patchSelf({ visionRadius: GAME.VISION_POWER_OUT });
    audio.play('powerDown');
    audio.play('sabotage');
    useUi.getState().toast('sabotage.alert.POWER_FAILURE', undefined, 'danger');
  }

  private revealClue(i: number): void {
    const clue = CLUES[i]!;
    this.nextClue = i;
    this.world.clues = [...this.world.clues, { id: clue.id, x: clue.x, y: clue.y, found: false }];
    this.world.guide = { x: clue.x, y: clue.y };
  }

  /** Called by the overlay's Inspect button (or E). */
  inspect(): void {
    const clue = CLUES[this.nextClue];
    if (this.step !== 'investigate' || this.inspecting || !clue || useTutorial.getState().inspectable !== clue.id) return;
    this.inspecting = true;
    this.world.clues = this.world.clues.map((c) => (c.id === clue.id ? { ...c, found: true } : c));
    this.world.guide = null;
    audio.play('interact');
    this.coach({ thought: clue.line, inspectable: null });
    const last = this.nextClue === CLUES.length - 1;
    this.after(last ? 2200 : 2600, () => {
      this.inspecting = false;
      if (last) return this.go('bodyReveal');
      this.revealClue(this.nextClue + 1);
      this.coach({ thought: null });
    });
  }

  private startMeeting(): void {
    const now = serverNow();
    audio.play('report');
    this.after(600, () => audio.play('meeting'));
    bridge.resetInput();
    this.bodyDown = false;
    this.world.guide = null;
    this.npcs.forEach((n) => (n.visible = false));
    useGame.getState().set({ panel: null, chat: [], voteResult: null });
    this.patchState({
      phase: 'REPORT',
      players: this.players(true),
      meeting: {
        reason: 'report',
        callerId: this.me.id,
        reportedVictimId: npcId('joseph'),
        discussionEndsAt: now + GAME.REPORT_SPLASH_MS + 60_000,
        votingEndsAt: now + GAME.REPORT_SPLASH_MS + 120_000,
        votedIds: [],
      },
    });
    this.coach({ objective: null, highlight: null, thought: null });
  }

  private addChat(senderId: string, senderName: string, p: { text?: string; quickId?: string }): void {
    const msg: ChatMessage = {
      id: `${senderId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      senderId,
      senderName,
      text: p.quickId ? '' : (p.text ?? '').slice(0, GAME.MAX_CHAT_LENGTH),
      quickId: p.quickId ?? null,
      at: serverNow(),
      channel: 'meeting',
    };
    const gs = useGame.getState();
    gs.set({ chat: [...gs.chat, msg] });
  }

  private npcChat(id: CastId, p: { text?: string; quickId?: string }): void {
    const phase = useGame.getState().state?.phase;
    if (phase !== 'MEETING' && phase !== 'VOTING') return;
    this.addChat(npcId(id), t(CAST[id].nameKey), p);
  }

  private startVoting(): void {
    const gs = useGame.getState();
    const m = gs.state?.meeting;
    if (!m) return;
    const now = serverNow();
    this.patchState({ phase: 'VOTING', meeting: { ...m, discussionEndsAt: now, votingEndsAt: now + 45_000 } });
    audio.play('warning');
    this.coach({ lesson: 'vote', thought: null, objective: 'tut.vote.do', highlight: 'vote-grid' });
    const plan: [CastId, string, number][] = [
      ['ammu', npcId('rahul'), 2500],
      ['meera', npcId('rahul'), 4500],
      ['fathima', 'skip', 6500],
      ['rahul', npcId('fathima'), 8000],
    ];
    for (const [voter, target, at] of plan) {
      this.after(at, () => {
        if (this.step !== 'vote') return;
        this.npcVotes.push({ voterId: npcId(voter), targetId: target });
        this.markVoted(npcId(voter));
      });
    }
  }

  private markVoted(id: string): void {
    const m = useGame.getState().state?.meeting;
    if (!m || m.votedIds.includes(id)) return;
    audio.play('vote');
    this.patchState({ meeting: { ...m, votedIds: [...m.votedIds, id] } });
  }

  private tally(): void {
    const votes = [...this.npcVotes, ...(this.playerVote !== null ? [{ voterId: this.me.id, targetId: this.playerVote }] : [])];
    const tally: Record<string, number> = {};
    for (const v of votes) tally[v.targetId] = (tally[v.targetId] ?? 0) + 1;
    const ranked = Object.entries(tally).sort((a, b) => b[1] - a[1]);
    let outcome: VoteResult['outcome'] = 'no_votes';
    let ejectedId: string | null = null;
    if (ranked.length) {
      if (ranked.length > 1 && ranked[0]![1] === ranked[1]![1]) outcome = 'tie';
      else if (ranked[0]![0] === 'skip') outcome = 'skipped';
      else {
        outcome = 'ejected';
        ejectedId = ranked[0]![0];
      }
    }
    const caught = ejectedId === npcId('rahul');
    const result: VoteResult = {
      ejectedId,
      outcome,
      tally,
      votes,
      ejectedRole: ejectedId ? (caught ? 'CAT' : 'HUMAN') : null,
      catsRemaining: caught ? 0 : 1,
    };
    audio.play('result');
    const players = (useGame.getState().state?.players ?? []).map((p) => (p.id === ejectedId ? { ...p, status: 'ejected' as const } : p));
    useGame.getState().set({ voteResult: result });
    this.patchState({ phase: 'RESULT', voteResult: result, players });
    this.coach({ objective: null, highlight: null, thought: null, outcome: caught ? 'caught' : 'missed' });
  }

  // ── Requests from the HUD ────────────────────────────────────────────
  private handle(event: string, payload: unknown): Ack<unknown> {
    const gs = useGame.getState();
    switch (event) {
      case C2S.TASK_START:
      case C2S.SABOTAGE_REPAIR_START:
      case C2S.ROOM_LEAVE:
        return OK;

      case C2S.TASK_COMPLETE: {
        const tasks = gs.self?.tasks ?? [];
        if (!tasks.some((x) => !x.done)) return { ok: false, error: 'ALREADY_DONE' };
        this.patchSelf({ tasks: tasks.map((x) => ({ ...x, done: true })) });
        const progress = gs.state?.taskProgress;
        if (progress) this.patchState({ taskProgress: { ...progress, done: progress.done + 1 } });
        audio.play('taskDone');
        useUi.getState().toast('task.done', undefined, 'good');
        this.goFrom('task', 'taskDone');
        return OK;
      }

      case C2S.SABOTAGE_REPAIR:
        if (!gs.state?.sabotage) return { ok: false, error: 'INVALID_ACTION' };
        this.patchState({ sabotage: null });
        this.patchSelf({ visionRadius: GAME.VISION_HUMAN });
        useUi.getState().toast('sabotage.fixed', { name: t('sabotage.POWER_FAILURE') }, 'good');
        this.goFrom('usePanel', 'powerBack');
        return OK;

      case C2S.PLAYER_REPORT:
        if (this.step !== 'report') return { ok: false, error: 'INVALID_ACTION' };
        this.go('reportSplash');
        return OK;

      case C2S.MEETING_CHAT: {
        if (gs.state?.phase !== 'MEETING' && gs.state?.phase !== 'VOTING') return { ok: false, error: 'INVALID_PHASE' };
        const p = (payload ?? {}) as { text?: string; quickId?: string };
        if (!p.quickId && !p.text?.trim()) return { ok: false, error: 'INVALID_PAYLOAD' };
        this.addChat(this.me.id, this.me.name, p);
        if (this.step === 'meeting' && !this.chatted) {
          this.chatted = true;
          this.coach({ objective: 'tut.meeting.intro', highlight: null });
          this.after(1800, () => this.goFrom('meeting', 'think'));
        }
        return OK;
      }

      case C2S.VOTE_CAST: {
        if (this.step !== 'vote') return { ok: false, error: 'INVALID_PHASE' };
        if (this.playerVote !== null) return { ok: false, error: 'ALREADY_VOTED' };
        const target = (payload as { targetId?: string } | undefined)?.targetId;
        const alive = gs.state?.players.some((p) => p.id === target && p.status === 'alive');
        if (target !== 'skip' && !alive) return { ok: false, error: 'INVALID_TARGET' };
        this.playerVote = target!;
        this.markVoted(this.me.id);
        this.coach({ objective: 'tut.vote.wait', highlight: null });
        return OK;
      }

      default:
        return { ok: false, error: 'INVALID_ACTION' };
    }
  }
}
