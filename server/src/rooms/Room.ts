import {
  GAME,
  S2C,
  catLimits,
  isInMatch,
  voiceChannelFor,
  type VoiceSignal,
  isValidCatCount,
  roomSettingsSchema,
  type Appearance,
  type ErrorCode,
  type LobbyPlayer,
  type PartialRoomSettings,
  type Phase,
  type PublicRoomSummary,
  type ResumePayload,
  type RoomSettings,
  type RoomSnapshot,
} from '@nizhal/shared';
import type { Clock, TimerHandle } from '../utils/clock';
import { createLogger } from '../utils/logger';
import { Match, type MatchSummary, type MatchTimings, type Result } from '../game/Match';
import type { Outbox } from '../game/outbox';
import { VoiceManager } from '../voice/VoiceManager';

const log = createLogger('room');
const OK: Result = { ok: true };
const fail = (error: ErrorCode): Result => ({ ok: false, error });

/** Lobby members stay this long after a disconnect before being removed. */
const LOBBY_GRACE_MS = 30_000;

interface Member {
  id: string;
  name: string;
  appearance: Appearance;
  slot: number;
  ready: boolean;
  connected: boolean;
  leaveTimer: TimerHandle | null;
}

export interface RoomDeps {
  outbox: Outbox;
  clock: Clock;
  onMatchEnd(summary: MatchSummary): void;
  onMemberRemoved(roomCode: string, playerId: string): void;
  onEmpty(roomCode: string): void;
  matchTimings?: Partial<MatchTimings>;
}

export class Room {
  hostId: string;
  settings: RoomSettings;
  private readonly members = new Map<string, Member>();
  private lobbyPhase: 'WAITING' | 'LOBBY' | 'STARTING' = 'WAITING';
  private countdown: { endsAt: number; timer: TimerHandle } | null = null;
  match: Match | null = null;
  lastActivity: number;
  readonly voice: VoiceManager;

  constructor(
    readonly code: string,
    hostId: string,
    settings: RoomSettings,
    private readonly deps: RoomDeps,
  ) {
    this.hostId = hostId;
    this.settings = settings;
    this.lastActivity = deps.clock.now();
    this.voice = new VoiceManager(deps.outbox, () => ({
      enabled: this.settings.voiceChat,
      members: [...this.members.values()].map((m) => ({
        id: m.id,
        connected: m.connected,
        channel: voiceChannelFor(this.phase, this.match !== null, this.match?.isAlive(m.id)),
      })),
    }));
  }

  // ── Queries ───────────────────────────────────────────────────────────────
  get phase(): Phase {
    if (this.match) return this.match.phase;
    return this.lobbyPhase;
  }

  get size(): number {
    return this.members.size;
  }

  get isFull(): boolean {
    return this.members.size >= this.settings.maxPlayers;
  }

  has(id: string): boolean {
    return this.members.has(id);
  }

  get joinable(): boolean {
    return !this.match && this.lobbyPhase !== 'STARTING' && !this.isFull;
  }

  snapshot(): RoomSnapshot {
    return {
      code: this.code,
      hostId: this.hostId,
      phase: this.phase,
      settings: this.settings,
      countdownEndsAt: this.countdown?.endsAt ?? null,
      players: [...this.members.values()]
        .sort((a, b) => a.slot - b.slot)
        .map<LobbyPlayer>((m) => ({
          id: m.id,
          name: m.name,
          appearance: m.appearance,
          slot: m.slot,
          isHost: m.id === this.hostId,
          ready: m.ready,
          connected: m.connected,
        })),
    };
  }

  publicSummary(): PublicRoomSummary {
    const host = this.members.get(this.hostId);
    return {
      code: this.code,
      hostName: host?.name ?? '—',
      players: this.members.size,
      maxPlayers: this.settings.maxPlayers,
      status: this.match || this.lobbyPhase === 'STARTING' ? 'playing' : this.isFull ? 'full' : 'open',
      voiceChat: this.settings.voiceChat,
      mapId: this.settings.mapId,
    };
  }

  resumeFor(id: string): ResumePayload | null {
    if (!this.members.has(id)) return null;
    const inMatch = this.match?.resumeFor(id) ?? null;
    return { room: this.snapshot(), state: null, role: null, self: null, chat: [], ...(inMatch ?? {}) };
  }

  // ── Membership ────────────────────────────────────────────────────────────
  addMember(id: string, name: string, appearance: Appearance): Result {
    if (this.members.has(id)) return OK;
    if (this.match || this.lobbyPhase === 'STARTING') return fail('GAME_IN_PROGRESS');
    if (this.isFull) return fail('ROOM_FULL');
    const used = new Set([...this.members.values()].map((m) => m.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    this.members.set(id, { id, name, appearance, slot, ready: false, connected: true, leaveTimer: null });
    this.touch();
    this.refreshLobbyPhase();
    for (const m of this.members.values()) if (m.id !== id) this.deps.outbox.toPlayer(m.id, S2C.PLAYER_JOINED, { id, name });
    this.broadcastRoom();
    return OK;
  }

  removeMember(id: string, reason: 'leave' | 'kick' | 'timeout'): void {
    const m = this.members.get(id);
    if (!m) return;
    m.leaveTimer?.cancel();
    this.members.delete(id);
    this.voice.leave(id);
    this.deps.onMemberRemoved(this.code, id);
    if (reason === 'kick') this.deps.outbox.toPlayer(id, S2C.KICKED);
    this.match?.playerLeft(id);

    if (this.members.size === 0) {
      this.dispose();
      this.deps.onEmpty(this.code);
      return;
    }
    if (!this.match) {
      for (const o of this.members.values()) this.deps.outbox.toPlayer(o.id, S2C.PLAYER_LEFT, { id, name: m.name });
    }
    if (id === this.hostId) this.migrateHost();
    if (this.lobbyPhase === 'STARTING' && !this.match) this.cancelCountdown();
    this.refreshLobbyPhase();
    this.broadcastRoom();
  }

  private migrateHost(): void {
    const next =
      [...this.members.values()].filter((m) => m.connected).sort((a, b) => a.slot - b.slot)[0] ??
      [...this.members.values()].sort((a, b) => a.slot - b.slot)[0];
    if (!next) return;
    this.hostId = next.id;
    next.ready = false;
    for (const o of this.members.values()) this.deps.outbox.toPlayer(o.id, S2C.HOST_CHANGED, { hostId: next.id, name: next.name });
    log.info(`[${this.code}] host migrated to ${next.id}`);
  }

  handleDisconnect(id: string): void {
    const m = this.members.get(id);
    if (!m) return;
    m.connected = false;
    if (this.match?.hasPlayer(id)) {
      this.match.setConnected(id, false);
    } else {
      m.leaveTimer?.cancel();
      m.leaveTimer = this.deps.clock.setTimeout(() => this.removeMember(id, 'timeout'), LOBBY_GRACE_MS);
      if (this.lobbyPhase === 'STARTING') this.cancelCountdown();
    }
    // Host who drops in the lobby hands over immediately so the room isn't stuck.
    if (id === this.hostId && !this.match) this.migrateHost();
    this.broadcastRoom();
  }

  handleReconnect(id: string): void {
    const m = this.members.get(id);
    if (!m) return;
    m.connected = true;
    m.leaveTimer?.cancel();
    m.leaveTimer = null;
    if (this.match?.hasPlayer(id)) this.match.setConnected(id, true);
    this.broadcastRoom();
  }

  // ── Lobby actions ────────────────────────────────────────────────────────
  setReady(id: string, ready: boolean): Result {
    const m = this.members.get(id);
    if (!m) return fail('NOT_IN_ROOM');
    if (this.match || this.lobbyPhase === 'STARTING') return fail('INVALID_PHASE');
    m.ready = ready;
    this.touch();
    this.broadcastRoom();
    return OK;
  }

  updateProfile(id: string, name?: string, appearance?: Appearance): Result {
    const m = this.members.get(id);
    if (!m) return fail('NOT_IN_ROOM');
    if (this.match || this.lobbyPhase === 'STARTING') return fail('INVALID_PHASE');
    if (name) m.name = name;
    if (appearance) m.appearance = appearance;
    this.broadcastRoom();
    return OK;
  }

  updateSettings(id: string, patch: PartialRoomSettings): Result {
    if (id !== this.hostId) return fail('NOT_HOST');
    if (this.match || this.lobbyPhase === 'STARTING') return fail('INVALID_PHASE');
    const next = roomSettingsSchema.safeParse({ ...this.settings, ...patch });
    if (!next.success) return fail('INVALID_CONFIG');
    if (next.data.maxPlayers < this.members.size) return fail('INVALID_CONFIG');
    this.settings = next.data;
    // Settings changed → readiness must be reconfirmed.
    for (const m of this.members.values()) if (m.id !== this.hostId) m.ready = false;
    this.touch();
    this.broadcastRoom();
    return OK;
  }

  kick(requesterId: string, targetId: string): Result {
    if (requesterId !== this.hostId) return fail('NOT_HOST');
    if (this.match) return fail('INVALID_PHASE');
    if (targetId === requesterId || !this.members.has(targetId)) return fail('INVALID_TARGET');
    this.removeMember(targetId, 'kick');
    return OK;
  }

  requestStart(requesterId: string): Result {
    if (requesterId !== this.hostId) return fail('NOT_HOST');
    if (this.match || this.lobbyPhase === 'STARTING') return fail('INVALID_PHASE');
    const check = this.validateStart();
    if (!check.ok) return check;
    const now = this.deps.clock.now();
    const endsAt = now + GAME.START_COUNTDOWN_MS;
    this.lobbyPhase = 'STARTING';
    this.countdown = { endsAt, timer: this.deps.clock.setTimeout(() => this.launchMatch(), GAME.START_COUNTDOWN_MS) };
    for (const m of this.members.values()) this.deps.outbox.toPlayer(m.id, S2C.GAME_STARTING, { countdownEndsAt: endsAt, serverNow: now });
    this.broadcastRoom();
    return OK;
  }

  private validateStart(): Result {
    const n = this.members.size;
    if (n < GAME.MIN_PLAYERS) return fail('NOT_ENOUGH_PLAYERS');
    if (n > GAME.MAX_PLAYERS) return fail('INVALID_CONFIG');
    if (!isValidCatCount(n, this.settings.catCount)) return fail('INVALID_CONFIG');
    for (const m of this.members.values()) {
      if (!m.connected) return fail('NOT_ALL_READY');
      if (m.id !== this.hostId && !m.ready) return fail('NOT_ALL_READY');
    }
    return OK;
  }

  private cancelCountdown(): void {
    this.countdown?.timer.cancel();
    this.countdown = null;
    this.lobbyPhase = 'LOBBY';
    this.refreshLobbyPhase();
  }

  private launchMatch(): void {
    this.countdown = null;
    const check = this.validateStart();
    if (!check.ok) {
      log.warn(`[${this.code}] start aborted: ${check.error}`);
      this.lobbyPhase = 'LOBBY';
      this.refreshLobbyPhase();
      this.broadcastRoom();
      return;
    }
    this.match = new Match(
      this.code,
      this.settings,
      [...this.members.values()].map((m) => ({ id: m.id, name: m.name, appearance: m.appearance, slot: m.slot, connected: m.connected })),
      this.deps.outbox,
      this.deps.clock,
      { getHostId: () => this.hostId, onEnd: (s) => this.onMatchEnd(s), onChange: () => this.voice.sync() },
      this.deps.matchTimings,
    );
    this.match.start();
    this.broadcastRoom();
  }

  private onMatchEnd(summary: MatchSummary): void {
    const match = this.match;
    this.match = null;
    match?.dispose();
    for (const m of this.members.values()) {
      m.ready = false;
      if (!m.connected && !m.leaveTimer) {
        m.leaveTimer = this.deps.clock.setTimeout(() => this.removeMember(m.id, 'timeout'), LOBBY_GRACE_MS);
      }
    }
    if (!this.members.get(this.hostId)?.connected) this.migrateHost();
    this.lobbyPhase = 'LOBBY';
    this.refreshLobbyPhase();
    this.deps.onMatchEnd(summary);
    this.broadcastRoom();
  }

  private refreshLobbyPhase(): void {
    if (this.lobbyPhase === 'STARTING') return;
    this.lobbyPhase = this.members.size >= GAME.MIN_PLAYERS ? 'LOBBY' : 'WAITING';
  }

  private touch(): void {
    this.lastActivity = this.deps.clock.now();
  }

  broadcastRoom(): void {
    const snap = this.snapshot();
    for (const m of this.members.values()) this.deps.outbox.toPlayer(m.id, S2C.ROOM_UPDATED, snap);
    this.voice.sync();
  }

  // ── Voice ────────────────────────────────────────────────────────────────
  voiceJoin(id: string): Result {
    if (!this.members.has(id)) return fail('NOT_IN_ROOM');
    if (!this.settings.voiceChat) return fail('NOT_ALLOWED');
    this.voice.join(id);
    return OK;
  }

  voiceLeave(id: string): void {
    this.voice.leave(id);
  }

  voiceMute(id: string, muted: boolean): Result {
    return this.voice.setMuted(id, muted) ? OK : fail('INVALID_ACTION');
  }

  voiceSignal(from: string, to: string, data: VoiceSignal): boolean {
    return this.voice.relay(from, to, data);
  }

  dispose(): void {
    this.countdown?.timer.cancel();
    this.match?.dispose();
    this.match = null;
    for (const m of this.members.values()) m.leaveTimer?.cancel();
  }

  /** Cat range valid for the current lobby size (shown in the settings UI). */
  catRange() {
    return catLimits(Math.max(GAME.MIN_PLAYERS, this.members.size));
  }

  get inMatch(): boolean {
    return this.match !== null && isInMatch(this.match.phase);
  }
}
