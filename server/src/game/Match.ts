import {
  EMPTY_STATS,
  GAME,
  S2C,
  SABOTAGE_DEFS,
  TASK_DEFS,
  canTransition,
  dist,
  effectiveCatCount,
  getMap,
  isBlocked,
  boxOverlapsRect,
  matchRewards,
  segmentBlocked,
  spawnPoints,
  teamOf,
  type Appearance,
  type ChatMessage,
  type ChatPayload,
  type EndPlayerView,
  type ErrorCode,
  type GameEndView,
  type GameMapDef,
  type GameStateView,
  type KnownStatus,
  type Phase,
  type PlayerMatchStats,
  type PlayerMovePayload,
  type PositionSnapshot,
  type Rect,
  type ResumePayload,
  type Role,
  type RoleInfo,
  type RoomSettings,
  type SabotageType,
  type SelfState,
  type TaskAssignment,
  type Team,
  type VoteResult,
  type WinReason,
} from '@nizhal/shared';
import type { Clock, TimerHandle } from '../utils/clock';
import { createLogger } from '../utils/logger';
import { secureShuffle, shortId, uid } from '../utils/random';
import { assignTasks } from '../tasks/assignTasks';
import { resolveVotes } from '../voting/resolveVotes';
import { isQuickChatId, sanitizeChat } from '../meetings/chat';
import { evaluateWin, type WinResult } from './winConditions';
import type { Outbox } from './outbox';

const log = createLogger('match');

export type Result = { ok: true } | { ok: false; error: ErrorCode };
const OK: Result = { ok: true };
const fail = (error: ErrorCode): Result => ({ ok: false, error });

export interface MatchMember {
  id: string;
  name: string;
  appearance: Appearance;
  slot: number;
  connected: boolean;
}

export interface MatchSummary {
  matchId: string;
  roomCode: string;
  mapId: RoomSettings['mapId'];
  mode: RoomSettings['mode'];
  winner: Team;
  reason: WinReason;
  startedAt: number;
  endedAt: number;
  players: {
    id: string;
    name: string;
    role: Role;
    status: MatchPlayer['status'];
    won: boolean;
    stats: PlayerMatchStats;
    xp: number;
    coins: number;
  }[];
}

export interface MatchHooks {
  getHostId(): string;
  onEnd(summary: MatchSummary): void;
  /** Called after any state broadcast (phase changes, deaths…) — used to re-sync voice channels. */
  onChange?(): void;
}

export interface MatchTimings {
  roleRevealMs: number;
  reportSplashMs: number;
  voteResultMs: number;
  tickMs: number;
  reconnectGraceMs: number;
}

const DEFAULT_TIMINGS: MatchTimings = {
  roleRevealMs: GAME.ROLE_REVEAL_MS,
  reportSplashMs: GAME.REPORT_SPLASH_MS,
  voteResultMs: GAME.VOTE_RESULT_MS,
  tickMs: GAME.SERVER_TICK_MS,
  reconnectGraceMs: GAME.RECONNECT_GRACE_MS,
};

interface MatchPlayer {
  id: string;
  name: string;
  appearance: Appearance;
  slot: number;
  role: Role;
  alive: boolean;
  status: 'alive' | 'dead' | 'ejected' | 'left';
  /** Whether the death is public knowledge (after a meeting / eject / leaving). */
  deathRevealed: boolean;
  connected: boolean;
  x: number;
  y: number;
  moving: boolean;
  left: boolean;
  moveBudget: number;
  lastMoveAt: number;
  lastCorrectionAt: number;
  teleportSeq: number;
  tasks: TaskAssignment[];
  activeTask: { taskId: string; startedAt: number } | null;
  activeRepair: { stationId: string; startedAt: number } | null;
  killReadyAt: number;
  sabotageReadyAt: number;
  emergencyLeft: number;
  lastChatAt: number;
  stats: PlayerMatchStats;
  disconnectTimer: TimerHandle | null;
}

interface Body {
  id: string;
  victimId: string;
  x: number;
  y: number;
}

interface MajorSabotage {
  type: SabotageType;
  startedAt: number;
  endsAt: number | null;
  repaired: Set<string>;
  timer: TimerHandle | null;
}

interface DoorLock {
  buildingId: string;
  doorIds: string[];
  endsAt: number;
  timer: TimerHandle;
}

interface Meeting {
  reason: 'report' | 'emergency';
  callerId: string;
  reportedVictimId: string | null;
  discussionEndsAt: number;
  votingEndsAt: number;
  votes: Map<string, string | 'skip'>;
}

export class Match {
  readonly id = uid('m_');
  phase: Phase = 'ROLE_REVEAL';
  private phaseEndsAt: number | null = null;
  private phaseTimer: TimerHandle | null = null;
  private tickTimer: TimerHandle | null = null;
  private readonly map: GameMapDef;
  private readonly players = new Map<string, MatchPlayer>();
  private readonly bodies = new Map<string, Body>();
  private sabotage: MajorSabotage | null = null;
  private doorLock: DoorLock | null = null;
  private meeting: Meeting | null = null;
  private voteResult: VoteResult | null = null;
  private chat: ChatMessage[] = [];
  private emergencyReadyAt = 0;
  private startedAt = 0;
  private meetingsHeld = 0;
  private readonly timings: MatchTimings;

  constructor(
    private readonly roomCode: string,
    private readonly settings: RoomSettings,
    members: MatchMember[],
    private readonly outbox: Outbox,
    private readonly clock: Clock,
    private readonly hooks: MatchHooks,
    timings: Partial<MatchTimings> = {},
  ) {
    this.timings = { ...DEFAULT_TIMINGS, ...timings };
    this.map = getMap(settings.mapId);

    // ── Role assignment: server-only, cryptographically shuffled ──
    const catCount = effectiveCatCount(members.length, settings.catCount);
    const shuffled = secureShuffle(members.map((m) => m.id));
    const cats = new Set(shuffled.slice(0, catCount));
    const spawns = spawnPoints(this.map, members.length);
    const now = clock.now();

    members
      .slice()
      .sort((a, b) => a.slot - b.slot)
      .forEach((m, i) => {
        const spawn = spawns[i] ?? this.map.spawn;
        this.players.set(m.id, {
          id: m.id,
          name: m.name,
          appearance: m.appearance,
          slot: m.slot,
          role: cats.has(m.id) ? 'CAT' : 'HUMAN',
          alive: true,
          status: 'alive',
          deathRevealed: false,
          connected: m.connected,
          x: spawn.x,
          y: spawn.y,
          moving: false,
          left: false,
          moveBudget: 0,
          lastMoveAt: now,
          lastCorrectionAt: 0,
          teleportSeq: 1,
          tasks: assignTasks(this.map, settings.tasksPerPlayer),
          activeTask: null,
          activeRepair: null,
          killReadyAt: 0,
          sabotageReadyAt: 0,
          emergencyLeft: settings.emergencyMeetings,
          lastChatAt: 0,
          stats: { ...EMPTY_STATS },
          disconnectTimer: null,
        });
      });
  }

  // ════════════════════════════════════════════════════════════════════════
  // Lifecycle
  // ════════════════════════════════════════════════════════════════════════

  start(): void {
    const now = this.clock.now();
    this.startedAt = now;
    this.phase = 'ROLE_REVEAL';
    this.phaseEndsAt = now + this.timings.roleRevealMs;

    for (const p of this.players.values()) {
      this.outbox.toPlayer(p.id, S2C.GAME_ROLE, this.roleInfoFor(p));
      this.sendSelf(p);
    }
    this.broadcastState();
    this.phaseTimer = this.clock.setTimeout(() => this.beginPlaying(true), this.timings.roleRevealMs);
    this.tickTimer = this.clock.setInterval(() => this.tick(), this.timings.tickMs);
    log.info(`[${this.roomCode}] match ${this.id} started with ${this.players.size} players`);
  }

  dispose(): void {
    this.phaseTimer?.cancel();
    this.tickTimer?.cancel();
    this.sabotage?.timer?.cancel();
    this.doorLock?.timer.cancel();
    for (const p of this.players.values()) p.disconnectTimer?.cancel();
  }

  private setPhase(to: Phase, endsAt: number | null): boolean {
    if (!canTransition(this.phase, to)) {
      log.error(`[${this.roomCode}] illegal transition ${this.phase} → ${to}`);
      return false;
    }
    this.phase = to;
    this.phaseEndsAt = endsAt;
    return true;
  }

  private beginPlaying(first: boolean): void {
    const now = this.clock.now();
    if (!this.setPhase('PLAYING', null)) return;
    this.meeting = null;
    this.voteResult = null;
    this.chat = [];

    const spawns = spawnPoints(this.map, this.players.size);
    let i = 0;
    for (const p of [...this.players.values()].sort((a, b) => a.slot - b.slot)) {
      const s = spawns[i++] ?? this.map.spawn;
      p.x = s.x;
      p.y = s.y;
      p.moving = false;
      p.moveBudget = 0;
      p.lastMoveAt = now;
      p.teleportSeq++;
      p.activeTask = null;
      p.activeRepair = null;
      if (p.role === 'CAT') {
        p.killReadyAt = now + (first ? GAME.FIRST_KILL_COOLDOWN_MS : this.settings.killCooldownS * 1000);
        p.sabotageReadyAt = now + GAME.FIRST_SABOTAGE_COOLDOWN_MS;
      }
    }
    this.emergencyReadyAt = now + GAME.EMERGENCY_COOLDOWN_AFTER_MEETING_MS;
    for (const p of this.players.values()) this.sendSelf(p);
    this.broadcastState();
  }

  // ════════════════════════════════════════════════════════════════════════
  // Movement
  // ════════════════════════════════════════════════════════════════════════

  handleMove(playerId: string, m: PlayerMovePayload): void {
    if (this.phase !== 'PLAYING') return;
    const p = this.players.get(playerId);
    if (!p || p.status === 'left') return;
    if (p.activeTask || p.activeRepair) {
      // Moving away cancels the in-progress interaction.
      const station = this.stationPosFor(p);
      if (station && dist(m.x, m.y, station.x, station.y) > GAME.INTERACT_RANGE * 1.6) {
        p.activeTask = null;
        p.activeRepair = null;
      }
    }

    const now = this.clock.now();
    const dt = Math.min(now - p.lastMoveAt, GAME.MOVE_MAX_DT_MS);
    p.lastMoveAt = now;
    const maxBudget = GAME.PLAYER_SPEED * 0.45;
    p.moveBudget = Math.min(maxBudget, p.moveBudget + ((GAME.PLAYER_SPEED * dt) / 1000) * GAME.MOVE_TOLERANCE);

    const d = dist(p.x, p.y, m.x, m.y);
    const inBounds =
      m.x >= GAME.PLAYER_HALF - 1 &&
      m.y >= GAME.PLAYER_HALF - 1 &&
      m.x <= this.map.width - GAME.PLAYER_HALF + 1 &&
      m.y <= this.map.height - GAME.PLAYER_HALF + 1;

    let valid = inBounds && d <= p.moveBudget + GAME.MOVE_SLACK;
    if (valid && p.alive) {
      const colliders = this.activeCollidersFor(p.x, p.y);
      const half = GAME.PLAYER_HALF - 1.5;
      valid = !isBlocked(m.x, m.y, half, colliders) && !segmentBlocked(p.x, p.y, m.x, m.y, half, colliders);
    }

    if (!valid) {
      if (now - p.lastCorrectionAt > 250) {
        p.lastCorrectionAt = now;
        p.teleportSeq++;
        this.sendSelf(p);
      }
      p.moving = false;
      return;
    }

    p.moveBudget = Math.max(0, p.moveBudget - d);
    p.x = m.x;
    p.y = m.y;
    p.moving = m.moving;
    p.left = m.left;
  }

  /** Static colliders plus locked doors (except a door the player is standing in). */
  private activeCollidersFor(x: number, y: number): readonly Rect[] {
    if (!this.doorLock) return this.map.colliders;
    const extra = this.map.doors.filter(
      (d) => this.doorLock!.doorIds.includes(d.id) && !boxOverlapsRect(x, y, GAME.PLAYER_HALF, d),
    );
    return extra.length ? [...this.map.colliders, ...extra] : this.map.colliders;
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tasks
  // ════════════════════════════════════════════════════════════════════════

  startTask(playerId: string, taskId: string): Result {
    if (this.phase !== 'PLAYING') return fail('INVALID_PHASE');
    const p = this.players.get(playerId);
    if (!p || !p.alive) return fail('NOT_ALLOWED');
    if (p.role !== 'HUMAN') return fail('NOT_ALLOWED');
    const task = p.tasks.find((t) => t.id === taskId);
    if (!task) return fail('INVALID_TARGET');
    if (task.done) return fail('ALREADY_DONE');
    const station = this.map.taskStations.find((s) => s.id === task.stationId);
    if (!station || dist(p.x, p.y, station.x, station.y) > GAME.INTERACT_RANGE) return fail('OUT_OF_RANGE');
    p.activeTask = { taskId, startedAt: this.clock.now() };
    p.activeRepair = null;
    return OK;
  }

  completeTask(playerId: string, taskId: string): Result {
    if (this.phase !== 'PLAYING') return fail('INVALID_PHASE');
    const p = this.players.get(playerId);
    if (!p || !p.alive || p.role !== 'HUMAN') return fail('NOT_ALLOWED');
    const task = p.tasks.find((t) => t.id === taskId);
    if (!task) return fail('INVALID_TARGET');
    if (task.done) return fail('ALREADY_DONE');
    if (!p.activeTask || p.activeTask.taskId !== taskId) return fail('INVALID_ACTION');
    if (this.clock.now() - p.activeTask.startedAt < TASK_DEFS[task.type].minDurationMs) return fail('TOO_FAST');
    const station = this.map.taskStations.find((s) => s.id === task.stationId);
    if (!station || dist(p.x, p.y, station.x, station.y) > GAME.INTERACT_RANGE * 1.5) return fail('OUT_OF_RANGE');

    task.done = true;
    p.activeTask = null;
    p.stats.tasksDone++;
    this.outbox.toPlayer(p.id, S2C.TASK_UPDATED, { taskId, done: true });
    this.sendSelf(p);
    this.broadcastState();
    this.checkWin();
    return OK;
  }

  private taskProgress(): { done: number; total: number } {
    let done = 0;
    let total = 0;
    for (const p of this.players.values()) {
      if (p.role !== 'HUMAN') continue;
      const d = p.tasks.filter((t) => t.done).length;
      done += d;
      // A human who is gone only contributes the tasks they finished.
      total += p.alive ? p.tasks.length : d;
    }
    return { done, total };
  }

  // ════════════════════════════════════════════════════════════════════════
  // Cat: kill
  // ════════════════════════════════════════════════════════════════════════

  kill(killerId: string, targetId: string): Result {
    if (this.phase !== 'PLAYING') return fail('INVALID_PHASE');
    const killer = this.players.get(killerId);
    if (!killer || !killer.alive || !killer.connected) return fail('NOT_ALLOWED');
    if (killer.role !== 'CAT') return fail('NOT_ALLOWED');
    const target = this.players.get(targetId);
    if (!target || target.id === killer.id || !target.alive || target.role === 'CAT') return fail('INVALID_TARGET');
    const now = this.clock.now();
    if (now < killer.killReadyAt) return fail('COOLDOWN');
    if (dist(killer.x, killer.y, target.x, target.y) > GAME.KILL_RANGE) return fail('OUT_OF_RANGE');
    // Line of sight: building walls and locked doors block; props like poles do not.
    const sight = this.doorLock
      ? [...this.map.walls, ...this.map.doors.filter((d) => this.doorLock!.doorIds.includes(d.id))]
      : this.map.walls;
    if (segmentBlocked(killer.x, killer.y, target.x, target.y, 1, sight)) return fail('OUT_OF_RANGE');

    target.alive = false;
    target.status = 'dead';
    target.moving = false;
    target.activeTask = null;
    target.activeRepair = null;
    const body: Body = { id: `b_${shortId()}`, victimId: target.id, x: Math.round(target.x), y: Math.round(target.y) };
    this.bodies.set(body.id, body);

    killer.killReadyAt = now + this.settings.killCooldownS * 1000;
    killer.stats.kills++;

    // Private notifications only: the victim, the killer and fellow Cats.
    this.outbox.toPlayer(target.id, S2C.PLAYER_KILLED, { victimId: target.id, x: body.x, y: body.y, byYou: false, you: true });
    for (const c of this.players.values()) {
      if (c.role === 'CAT' && c.id !== target.id) {
        this.outbox.toPlayer(c.id, S2C.PLAYER_KILLED, {
          victimId: target.id,
          x: body.x,
          y: body.y,
          byYou: c.id === killer.id,
          you: false,
        });
      }
    }
    this.sendSelf(target);
    this.sendSelf(killer);
    // Spectators learn about deaths immediately; living players do not.
    this.broadcastState((v) => !v.alive);
    this.checkWin();
    return OK;
  }

  // ════════════════════════════════════════════════════════════════════════
  // Cat: sabotage  /  repairs
  // ════════════════════════════════════════════════════════════════════════

  startSabotage(playerId: string, type: SabotageType, targetBuildingId?: string): Result {
    if (this.phase !== 'PLAYING') return fail('INVALID_PHASE');
    const p = this.players.get(playerId);
    if (!p || p.role !== 'CAT' || p.status === 'left') return fail('NOT_ALLOWED');
    const now = this.clock.now();
    if (now < p.sabotageReadyAt) return fail('COOLDOWN');
    const def = SABOTAGE_DEFS[type];

    if (type === 'DOOR_LOCK') {
      if (this.doorLock) return fail('INVALID_ACTION');
      const b = this.map.buildings.find((x) => x.id === targetBuildingId);
      if (!b || !b.lockable) return fail('INVALID_TARGET');
      const doorIds = this.map.doors.filter((d) => d.buildingId === b.id).map((d) => d.id);
      const endsAt = now + (def.durationMs ?? 10_000);
      this.doorLock = { buildingId: b.id, doorIds, endsAt, timer: this.clock.setTimeout(() => this.endDoorLock(), endsAt - now) };
    } else {
      if (this.sabotage) return fail('INVALID_ACTION');
      const endsAt = def.durationMs ? now + def.durationMs : null;
      this.sabotage = {
        type,
        startedAt: now,
        endsAt,
        repaired: new Set(),
        timer: def.critical && endsAt ? this.clock.setTimeout(() => this.criticalExpired(), endsAt - now) : null,
      };
    }

    p.stats.sabotages++;
    for (const c of this.players.values()) {
      if (c.role === 'CAT') {
        c.sabotageReadyAt = now + GAME.SABOTAGE_COOLDOWN_MS;
        this.sendSelf(c);
      }
    }
    for (const o of this.players.values()) this.outbox.toPlayer(o.id, S2C.SABOTAGE_STARTED, { type });
    if (type === 'POWER_FAILURE') for (const o of this.players.values()) if (o.role === 'HUMAN') this.sendSelf(o);
    this.broadcastState();
    return OK;
  }

  private endDoorLock(): void {
    if (!this.doorLock) return;
    this.doorLock.timer.cancel();
    this.doorLock = null;
    for (const o of this.players.values()) this.outbox.toPlayer(o.id, S2C.SABOTAGE_ENDED, { type: 'DOOR_LOCK', repaired: false });
    this.broadcastState();
  }

  private criticalExpired(): void {
    if (!this.sabotage || this.phase !== 'PLAYING') return;
    log.info(`[${this.roomCode}] critical sabotage ${this.sabotage.type} expired`);
    this.end({ winner: 'CATS', reason: 'critical_sabotage' });
  }

  private endSabotage(repaired: boolean): void {
    if (!this.sabotage) return;
    const type = this.sabotage.type;
    this.sabotage.timer?.cancel();
    this.sabotage = null;
    for (const o of this.players.values()) o.activeRepair = null;
    for (const o of this.players.values()) this.outbox.toPlayer(o.id, S2C.SABOTAGE_ENDED, { type, repaired });
    if (type === 'POWER_FAILURE') for (const o of this.players.values()) if (o.role === 'HUMAN') this.sendSelf(o);
  }

  startRepair(playerId: string, stationId: string): Result {
    if (this.phase !== 'PLAYING') return fail('INVALID_PHASE');
    const p = this.players.get(playerId);
    if (!p || !p.alive) return fail('NOT_ALLOWED');
    if (!this.sabotage) return fail('INVALID_ACTION');
    const def = SABOTAGE_DEFS[this.sabotage.type];
    if (!def.repairStationIds.includes(stationId) || this.sabotage.repaired.has(stationId)) return fail('INVALID_TARGET');
    const st = this.map.sabotageStations.find((s) => s.id === stationId);
    if (!st || dist(p.x, p.y, st.x, st.y) > GAME.INTERACT_RANGE) return fail('OUT_OF_RANGE');
    p.activeRepair = { stationId, startedAt: this.clock.now() };
    p.activeTask = null;
    return OK;
  }

  completeRepair(playerId: string, stationId: string): Result {
    if (this.phase !== 'PLAYING') return fail('INVALID_PHASE');
    const p = this.players.get(playerId);
    if (!p || !p.alive) return fail('NOT_ALLOWED');
    if (!this.sabotage) return fail('INVALID_ACTION');
    if (!p.activeRepair || p.activeRepair.stationId !== stationId) return fail('INVALID_ACTION');
    const def = SABOTAGE_DEFS[this.sabotage.type];
    if (this.clock.now() - p.activeRepair.startedAt < def.repairMinMs) return fail('TOO_FAST');
    const st = this.map.sabotageStations.find((s) => s.id === stationId);
    if (!st || dist(p.x, p.y, st.x, st.y) > GAME.INTERACT_RANGE * 1.5) return fail('OUT_OF_RANGE');

    p.activeRepair = null;
    this.sabotage.repaired.add(stationId);
    p.stats.repairs++;
    const fixed =
      def.repairMode === 'any' || def.repairStationIds.every((id) => this.sabotage!.repaired.has(id));
    if (fixed) this.endSabotage(true);
    this.broadcastState();
    return OK;
  }

  // ════════════════════════════════════════════════════════════════════════
  // Reports & meetings
  // ════════════════════════════════════════════════════════════════════════

  report(playerId: string, bodyId: string): Result {
    if (this.phase !== 'PLAYING') return fail('INVALID_PHASE');
    const p = this.players.get(playerId);
    if (!p || !p.alive) return fail('NOT_ALLOWED');
    const body = this.bodies.get(bodyId);
    if (!body) return fail('INVALID_TARGET');
    if (dist(p.x, p.y, body.x, body.y) > GAME.REPORT_RANGE) return fail('OUT_OF_RANGE');
    p.stats.reports++;
    this.startMeeting('report', p.id, body.victimId);
    return OK;
  }

  callEmergency(playerId: string): Result {
    if (this.phase !== 'PLAYING') return fail('INVALID_PHASE');
    const p = this.players.get(playerId);
    if (!p || !p.alive) return fail('NOT_ALLOWED');
    if (p.emergencyLeft <= 0) return fail('NOT_ALLOWED');
    if (this.clock.now() < this.emergencyReadyAt) return fail('COOLDOWN');
    if (this.sabotage && SABOTAGE_DEFS[this.sabotage.type].critical) return fail('NOT_ALLOWED');
    if (dist(p.x, p.y, this.map.emergency.x, this.map.emergency.y) > GAME.EMERGENCY_RANGE) return fail('OUT_OF_RANGE');
    p.emergencyLeft--;
    p.stats.meetingsCalled++;
    this.startMeeting('emergency', p.id, null);
    return OK;
  }

  private startMeeting(reason: 'report' | 'emergency', callerId: string, reportedVictimId: string | null): void {
    const now = this.clock.now();
    if (!this.setPhase('REPORT', now + this.timings.reportSplashMs)) return;
    this.meetingsHeld++;

    // All deaths so far become public; the town clears the bodies.
    for (const o of this.players.values()) if (!o.alive) o.deathRevealed = true;
    this.bodies.clear();
    if (this.sabotage) this.endSabotage(false);
    if (this.doorLock) {
      this.doorLock.timer.cancel();
      this.doorLock = null;
    }
    for (const o of this.players.values()) {
      o.activeTask = null;
      o.activeRepair = null;
      o.moving = false;
    }

    const discussion = this.settings.discussionS * 1000;
    const discussionEndsAt = now + this.timings.reportSplashMs + discussion;
    this.meeting = {
      reason,
      callerId,
      reportedVictimId,
      discussionEndsAt,
      votingEndsAt: discussionEndsAt + this.settings.votingS * 1000,
      votes: new Map(),
    };
    this.chat = [];

    for (const o of this.players.values()) {
      this.outbox.toPlayer(o.id, S2C.MEETING_STARTED, { reason, callerId, reportedVictimId });
      this.sendSelf(o);
    }
    this.broadcastState();

    this.phaseTimer?.cancel();
    this.phaseTimer = this.clock.setTimeout(() => this.beginDiscussion(), this.timings.reportSplashMs);
  }

  private beginDiscussion(): void {
    if (!this.meeting) return;
    const now = this.clock.now();
    this.meeting.discussionEndsAt = now + this.settings.discussionS * 1000;
    this.meeting.votingEndsAt = this.meeting.discussionEndsAt + this.settings.votingS * 1000;
    if (!this.setPhase('MEETING', this.meeting.discussionEndsAt)) return;
    this.broadcastState();
    this.phaseTimer = this.clock.setTimeout(() => this.beginVoting(), this.settings.discussionS * 1000);
  }

  private beginVoting(): void {
    if (!this.meeting) return;
    const now = this.clock.now();
    this.meeting.votingEndsAt = now + this.settings.votingS * 1000;
    if (!this.setPhase('VOTING', this.meeting.votingEndsAt)) return;
    for (const o of this.players.values()) this.outbox.toPlayer(o.id, S2C.VOTING_STARTED, { votingEndsAt: this.meeting.votingEndsAt });
    this.broadcastState();
    this.phaseTimer = this.clock.setTimeout(() => this.finishVoting(), this.settings.votingS * 1000);
  }

  sendChat(playerId: string, payload: ChatPayload): Result {
    if (this.phase !== 'MEETING' && this.phase !== 'VOTING') return fail('INVALID_PHASE');
    const p = this.players.get(playerId);
    if (!p || p.status === 'left') return fail('NOT_ALLOWED');
    const now = this.clock.now();
    if (now - p.lastChatAt < GAME.CHAT_MIN_INTERVAL_MS) return fail('RATE_LIMITED');

    let text = '';
    let quickId: string | null = null;
    if (payload.quickId) {
      if (!isQuickChatId(payload.quickId)) return fail('INVALID_PAYLOAD');
      quickId = payload.quickId;
    } else {
      const clean = sanitizeChat(payload.text ?? '');
      if (!clean) return fail('INVALID_PAYLOAD');
      text = clean;
    }
    p.lastChatAt = now;
    const msg: ChatMessage = {
      id: shortId(),
      senderId: p.id,
      senderName: p.name,
      text,
      quickId,
      at: now,
      channel: p.alive ? 'meeting' : 'dead',
    };
    this.chat.push(msg);
    if (this.chat.length > 200) this.chat.shift();
    for (const o of this.players.values()) {
      if (msg.channel === 'dead' && o.alive) continue; // dead chat never reaches the living
      this.outbox.toPlayer(o.id, S2C.MEETING_CHAT, msg);
    }
    return OK;
  }

  castVote(playerId: string, targetId: string | 'skip'): Result {
    if (this.phase !== 'VOTING' || !this.meeting) return fail('INVALID_PHASE');
    const p = this.players.get(playerId);
    if (!p || !p.alive) return fail('NOT_ALLOWED');
    if (this.meeting.votes.has(p.id)) return fail('ALREADY_VOTED');
    if (targetId !== 'skip') {
      const t = this.players.get(targetId);
      if (!t || !t.alive) return fail('INVALID_TARGET');
    }
    this.meeting.votes.set(p.id, targetId);
    p.stats.votesCast++;
    const votedIds = [...this.meeting.votes.keys()];
    for (const o of this.players.values()) this.outbox.toPlayer(o.id, S2C.VOTING_UPDATED, { votedIds });
    this.maybeFinishVotingEarly();
    return OK;
  }

  private maybeFinishVotingEarly(): void {
    if (this.phase !== 'VOTING' || !this.meeting) return;
    const living = [...this.players.values()].filter((o) => o.alive);
    if (living.every((o) => this.meeting!.votes.has(o.id))) this.finishVoting();
  }

  private finishVoting(): void {
    if (this.phase !== 'VOTING' || !this.meeting) return;
    this.phaseTimer?.cancel();
    const now = this.clock.now();
    const meeting = this.meeting;
    // Votes from players who died/left mid-vote are discarded.
    for (const [voter, target] of meeting.votes) {
      if (!this.players.get(voter)?.alive) meeting.votes.delete(voter);
      else if (target !== 'skip' && !this.players.get(target)?.alive) meeting.votes.set(voter, 'skip');
    }
    const r = resolveVotes(meeting.votes);

    let ejectedRole: Role | null = null;
    if (r.ejectedId) {
      const ej = this.players.get(r.ejectedId)!;
      ej.alive = false;
      ej.status = 'ejected';
      ej.deathRevealed = true;
      ejectedRole = ej.role;
    }
    for (const [voter, target] of meeting.votes) {
      if (target !== 'skip' && this.players.get(target)?.role === 'CAT') {
        const v = this.players.get(voter);
        if (v) v.stats.correctVotes++;
      }
    }
    const catsRemaining = [...this.players.values()].filter((o) => o.role === 'CAT' && o.alive).length;
    this.voteResult = {
      ejectedId: r.ejectedId,
      outcome: r.outcome,
      tally: r.tally,
      votes: this.settings.anonymousVotes ? null : [...meeting.votes].map(([voterId, targetId]) => ({ voterId, targetId })),
      ejectedRole: this.settings.confirmEjects ? ejectedRole : null,
      catsRemaining: this.settings.confirmEjects ? catsRemaining : null,
    };

    if (!this.setPhase('RESULT', now + this.timings.voteResultMs)) return;
    for (const o of this.players.values()) {
      this.outbox.toPlayer(o.id, S2C.VOTE_RESULT, this.voteResult);
      if (o.id === r.ejectedId) this.sendSelf(o);
    }
    this.broadcastState();
    this.phaseTimer = this.clock.setTimeout(() => {
      const win = this.currentWin();
      if (win) this.end(win);
      else this.beginPlaying(false);
    }, this.timings.voteResultMs);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Connection
  // ════════════════════════════════════════════════════════════════════════

  hasPlayer(id: string): boolean {
    return this.players.has(id);
  }

  /** Real alive state (server-internal; used for voice channel assignment). */
  isAlive(id: string): boolean | undefined {
    return this.players.get(id)?.alive;
  }

  setConnected(playerId: string, connected: boolean): void {
    const p = this.players.get(playerId);
    if (!p || p.status === 'left' || this.phase === 'FINISHED') return;
    p.connected = connected;
    p.disconnectTimer?.cancel();
    p.disconnectTimer = null;
    if (!connected) {
      p.moving = false;
      p.activeTask = null;
      p.activeRepair = null;
      p.disconnectTimer = this.clock.setTimeout(() => this.playerLeft(playerId), this.timings.reconnectGraceMs);
    } else {
      p.lastMoveAt = this.clock.now();
      p.moveBudget = 0;
      for (const o of this.players.values()) if (o.id !== p.id) this.outbox.toPlayer(o.id, S2C.PLAYER_RECONNECTED, { id: p.id });
    }
    this.broadcastState();
  }

  /** Player permanently left (explicit leave or reconnect grace expired). */
  playerLeft(playerId: string): void {
    const p = this.players.get(playerId);
    if (!p || p.status === 'left' || this.phase === 'FINISHED') return;
    p.disconnectTimer?.cancel();
    p.disconnectTimer = null;
    p.alive = false;
    p.status = 'left';
    p.connected = false;
    p.deathRevealed = true;
    for (const o of this.players.values()) if (o.id !== p.id) this.outbox.toPlayer(o.id, S2C.PLAYER_LEFT, { id: p.id, name: p.name });
    if (this.meeting) this.meeting.votes.delete(p.id);
    this.broadcastState();
    if (this.checkWin()) return;
    this.maybeFinishVotingEarly();
  }

  resumeFor(playerId: string): Omit<ResumePayload, 'room'> | null {
    const p = this.players.get(playerId);
    if (!p || p.status === 'left') return null;
    return {
      state: this.stateFor(p),
      role: this.roleInfoFor(p),
      self: this.selfFor(p),
      chat: this.chat.filter((m) => m.channel === 'meeting' || !p.alive),
    };
  }

  // ════════════════════════════════════════════════════════════════════════
  // Win / end
  // ════════════════════════════════════════════════════════════════════════

  /** Returns true when the match ended. */
  private checkWin(): boolean {
    if (this.phase === 'FINISHED') return true;
    // During the vote result screen the outcome is resolved when the screen ends.
    if (this.phase === 'RESULT') return false;
    const res = this.currentWin();
    if (res) {
      this.end(res);
      return true;
    }
    return false;
  }

  private currentWin(): WinResult | null {
    const { done, total } = this.taskProgress();
    return evaluateWin({
      players: [...this.players.values()].map((p) => ({ role: p.role, alive: p.alive })),
      tasksDone: done,
      tasksTotal: total,
    });
  }

  private end(win: WinResult): void {
    if (this.phase === 'FINISHED') return;
    this.dispose();
    this.phase = 'FINISHED';
    this.phaseEndsAt = null;
    const endedAt = this.clock.now();
    const { done, total } = this.taskProgress();

    const endPlayers: EndPlayerView[] = [...this.players.values()]
      .sort((a, b) => a.slot - b.slot)
      .map((p) => ({ id: p.id, name: p.name, appearance: p.appearance, role: p.role, status: p.status, stats: p.stats }));
    const totals = {
      tasksDone: done,
      tasksTotal: total,
      kills: endPlayers.reduce((s, p) => s + p.stats.kills, 0),
      sabotages: endPlayers.reduce((s, p) => s + p.stats.sabotages, 0),
      meetings: this.meetingsHeld,
    };

    const summary: MatchSummary = {
      matchId: this.id,
      roomCode: this.roomCode,
      mapId: this.settings.mapId,
      mode: this.settings.mode,
      winner: win.winner,
      reason: win.reason,
      startedAt: this.startedAt,
      endedAt,
      players: [],
    };

    for (const p of this.players.values()) {
      const won = teamOf(p.role) === win.winner;
      const rewards = matchRewards({ won, survived: p.alive, stats: p.stats });
      summary.players.push({ id: p.id, name: p.name, role: p.role, status: p.status, won, stats: p.stats, ...rewards });
      const view: GameEndView = {
        matchId: this.id,
        winner: win.winner,
        reason: win.reason,
        durationMs: endedAt - this.startedAt,
        players: endPlayers,
        totals,
        you: { id: p.id, won, role: p.role, ...rewards },
      };
      this.outbox.toPlayer(p.id, S2C.GAME_ENDED, view);
    }
    log.info(`[${this.roomCode}] match ${this.id} ended: ${win.winner} (${win.reason})`);
    this.hooks.onEnd(summary);
  }

  // ════════════════════════════════════════════════════════════════════════
  // Views (per viewer — this is where hidden information is filtered)
  // ════════════════════════════════════════════════════════════════════════

  private roleInfoFor(p: MatchPlayer): RoleInfo {
    return {
      role: p.role,
      fellowCats:
        p.role === 'CAT'
          ? [...this.players.values()].filter((o) => o.role === 'CAT' && o.id !== p.id).map((o) => ({ id: o.id, name: o.name }))
          : [],
    };
  }

  private visionFor(p: MatchPlayer): number {
    if (!p.alive) return GAME.VISION_SPECTATOR;
    if (p.role === 'CAT') return GAME.VISION_CAT;
    return this.sabotage?.type === 'POWER_FAILURE' ? GAME.VISION_POWER_OUT : GAME.VISION_HUMAN;
  }

  private selfFor(p: MatchPlayer): SelfState {
    const isCat = p.role === 'CAT';
    return {
      alive: p.alive,
      role: p.role,
      tasks: p.tasks.map((t) => ({ ...t })),
      killReadyAt: isCat ? p.killReadyAt : null,
      sabotageReadyAt: isCat ? p.sabotageReadyAt : null,
      emergencyLeft: p.emergencyLeft,
      emergencyReadyAt: this.emergencyReadyAt,
      visionRadius: this.visionFor(p),
      x: Math.round(p.x),
      y: Math.round(p.y),
      teleportSeq: p.teleportSeq,
    };
  }

  private sendSelf(p: MatchPlayer): void {
    this.outbox.toPlayer(p.id, S2C.GAME_SELF, this.selfFor(p));
  }

  private knownStatus(viewer: MatchPlayer, o: MatchPlayer): KnownStatus {
    if (o.id === viewer.id || !viewer.alive || o.deathRevealed) return o.status;
    return 'alive';
  }

  stateFor(viewer: MatchPlayer): GameStateView {
    const comms = this.sabotage?.type === 'COMMS_FAILURE';
    const m = this.meeting;
    return {
      phase: this.phase,
      phaseEndsAt: this.phaseEndsAt,
      mapId: this.settings.mapId,
      settings: this.settings,
      hostId: this.hooks.getHostId(),
      players: [...this.players.values()]
        .sort((a, b) => a.slot - b.slot)
        .map((o) => ({
          id: o.id,
          name: o.name,
          appearance: o.appearance,
          slot: o.slot,
          status: this.knownStatus(viewer, o),
          connected: o.connected,
        })),
      taskProgress: comms ? null : this.taskProgress(),
      sabotage: this.sabotage
        ? {
            type: this.sabotage.type,
            startedAt: this.sabotage.startedAt,
            endsAt: this.sabotage.endsAt,
            critical: SABOTAGE_DEFS[this.sabotage.type].critical,
            repairedStationIds: [...this.sabotage.repaired],
          }
        : null,
      lockedDoorIds: this.doorLock ? [...this.doorLock.doorIds] : [],
      meeting: m
        ? {
            reason: m.reason,
            callerId: m.callerId,
            reportedVictimId: m.reportedVictimId,
            discussionEndsAt: m.discussionEndsAt,
            votingEndsAt: m.votingEndsAt,
            votedIds: [...m.votes.keys()],
          }
        : null,
      voteResult: this.phase === 'RESULT' ? this.voteResult : null,
      startedAt: this.startedAt,
      serverNow: this.clock.now(),
    };
  }

  private broadcastState(filter?: (viewer: MatchPlayer) => boolean): void {
    for (const p of this.players.values()) {
      if (p.status === 'left' || (filter && !filter(p))) continue;
      this.outbox.toPlayer(p.id, S2C.GAME_STATE, this.stateFor(p));
    }
    this.hooks.onChange?.();
  }

  /** Position snapshots with interest management: the living only receive what they could see. */
  private tick(): void {
    if (this.phase !== 'PLAYING') return;
    const t = this.clock.now();
    const all = [...this.players.values()];
    for (const viewer of all) {
      if (!viewer.connected || viewer.status === 'left') continue;
      const spectator = !viewer.alive;
      const range = this.visionFor(viewer) + GAME.VISION_MARGIN;
      const snap: PositionSnapshot = { t, p: [], b: [] };
      for (const o of all) {
        if (o.status === 'left') continue;
        if (!spectator) {
          if (!o.alive) continue; // ghosts are invisible to the living
          if (o.id !== viewer.id && dist(viewer.x, viewer.y, o.x, o.y) > range) continue;
        }
        const flags = (o.moving ? 1 : 0) | (o.left ? 2 : 0) | (o.alive ? 0 : 4);
        snap.p.push([o.id, Math.round(o.x), Math.round(o.y), flags]);
      }
      for (const b of this.bodies.values()) {
        if (spectator || dist(viewer.x, viewer.y, b.x, b.y) <= range) snap.b.push([b.id, b.victimId, b.x, b.y]);
      }
      this.outbox.toPlayer(viewer.id, S2C.GAME_SNAPSHOT, snap);
    }
  }

  private stationPosFor(p: MatchPlayer): { x: number; y: number } | null {
    if (p.activeTask) {
      const task = p.tasks.find((t) => t.id === p.activeTask!.taskId);
      return this.map.taskStations.find((s) => s.id === task?.stationId) ?? null;
    }
    if (p.activeRepair) return this.map.sabotageStations.find((s) => s.id === p.activeRepair!.stationId) ?? null;
    return null;
  }

  // ── Test/debug helpers (never exposed over the network) ─────────────────
  /** @internal */
  debugPlayer(id: string): Readonly<MatchPlayer> | undefined {
    return this.players.get(id);
  }
  /** @internal */
  debugSetPosition(id: string, x: number, y: number): void {
    const p = this.players.get(id);
    if (p) {
      p.x = x;
      p.y = y;
    }
  }
  /** @internal */
  debugBodies(): Body[] {
    return [...this.bodies.values()];
  }
}
