import type { Appearance } from '../constants/appearance';
import type { Phase } from '../game-rules/phases';
import type { Role, Team } from '../game-rules/roles';
import type { RoomSettings } from '../game-rules/settings';
import type { SabotageType } from '../game-rules/sabotage';
import type { TaskAssignment } from '../game-rules/tasks';

// ── Errors ────────────────────────────────────────────────────────────────
export const ERROR_CODES = [
  'UNAUTHORIZED',
  'INVALID_PAYLOAD',
  'RATE_LIMITED',
  'ROOM_NOT_FOUND',
  'ROOM_FULL',
  'GAME_IN_PROGRESS',
  'ALREADY_IN_ROOM',
  'NOT_IN_ROOM',
  'NOT_HOST',
  'NOT_ENOUGH_PLAYERS',
  'NOT_ALL_READY',
  'INVALID_CONFIG',
  'INVALID_PHASE',
  'INVALID_ACTION',
  'INVALID_TARGET',
  'NOT_ALLOWED',
  'OUT_OF_RANGE',
  'COOLDOWN',
  'ALREADY_VOTED',
  'ALREADY_DONE',
  'TOO_FAST',
  'SERVER_ERROR',
  'MAINTENANCE',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export type Ack<T = undefined> = { ok: true; data: T } | { ok: false; error: ErrorCode; message?: string };
export type AckFn<T = undefined> = (res: Ack<T>) => void;

// ── Lobby ─────────────────────────────────────────────────────────────────
export interface LobbyPlayer {
  id: string;
  name: string;
  appearance: Appearance;
  slot: number;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
}

export interface RoomSnapshot {
  code: string;
  hostId: string;
  phase: Phase;
  settings: RoomSettings;
  players: LobbyPlayer[];
  /** Server time when the countdown ends (STARTING only). */
  countdownEndsAt: number | null;
}

// ── In-match public state (per viewer) ────────────────────────────────────
/**
 * Status of a player *as known to the viewer*. A living player never learns a
 * death until it is revealed (body report / meeting), so 'alive' can be stale
 * for them by design.
 */
export type KnownStatus = 'alive' | 'dead' | 'ejected' | 'left';

export interface GamePlayerView {
  id: string;
  name: string;
  appearance: Appearance;
  slot: number;
  status: KnownStatus;
  connected: boolean;
}

export interface SabotageView {
  type: SabotageType;
  startedAt: number;
  endsAt: number | null;
  critical: boolean;
  /** Station ids already repaired (for 'all' sabotages). */
  repairedStationIds: string[];
  /** Door-lock target building. */
  targetBuildingId?: string;
}

export interface MeetingView {
  reason: 'report' | 'emergency';
  callerId: string;
  /** Victim whose body was reported. */
  reportedVictimId: string | null;
  discussionEndsAt: number;
  votingEndsAt: number;
  /** Who has voted so far (never whom). */
  votedIds: string[];
}

export interface VoteEntry {
  voterId: string;
  targetId: string | 'skip';
}

export interface VoteResult {
  ejectedId: string | null;
  outcome: 'ejected' | 'tie' | 'skipped' | 'no_votes';
  tally: Record<string, number>;
  /** Individual votes; omitted when anonymous voting is on. */
  votes: VoteEntry[] | null;
  /** Only when confirmEjects is on. */
  ejectedRole: Role | null;
  catsRemaining: number | null;
}

export interface GameStateView {
  phase: Phase;
  phaseEndsAt: number | null;
  mapId: RoomSettings['mapId'];
  settings: RoomSettings;
  hostId: string;
  players: GamePlayerView[];
  /** null while comms are sabotaged. */
  taskProgress: { done: number; total: number } | null;
  sabotage: SabotageView | null;
  lockedDoorIds: string[];
  meeting: MeetingView | null;
  voteResult: VoteResult | null;
  startedAt: number | null;
  serverNow: number;
}

/** Private information for exactly one player. */
export interface RoleInfo {
  role: Role;
  /** Only populated for Cats: the other Cats. */
  fellowCats: { id: string; name: string }[];
}

export interface SelfState {
  alive: boolean;
  role: Role;
  tasks: TaskAssignment[];
  killReadyAt: number | null;
  sabotageReadyAt: number | null;
  emergencyLeft: number;
  emergencyReadyAt: number;
  visionRadius: number;
  /** Server-authoritative position, used for spawn / meeting teleports / corrections. */
  x: number;
  y: number;
  /** Increments whenever the server forces the client's position. */
  teleportSeq: number;
}

/**
 * Compact position snapshot. p: [id, x, y, flags] where flags bit0 = moving,
 * bit1 = facing left, bit2 = ghost (only sent to spectators).
 * b: [bodyId, victimId, x, y].
 */
export interface PositionSnapshot {
  t: number;
  p: [string, number, number, number][];
  b: [string, string, number, number][];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  quickId: string | null;
  at: number;
  /** Dead players' chat is only delivered to other dead players. */
  channel: 'meeting' | 'dead';
}

export interface PlayerMatchStats {
  tasksDone: number;
  kills: number;
  sabotages: number;
  reports: number;
  meetingsCalled: number;
  votesCast: number;
  correctVotes: number;
  repairs: number;
}

export interface EndPlayerView {
  id: string;
  name: string;
  appearance: Appearance;
  role: Role;
  status: 'alive' | 'dead' | 'ejected' | 'left';
  stats: PlayerMatchStats;
}

export type WinReason = 'cats_eliminated' | 'tasks_completed' | 'parity' | 'critical_sabotage' | 'humans_left';

export interface GameEndView {
  matchId: string;
  winner: Team;
  reason: WinReason;
  durationMs: number;
  players: EndPlayerView[];
  totals: { tasksDone: number; tasksTotal: number; kills: number; sabotages: number; meetings: number };
  /** Rewards for the receiving player only. */
  you: { id: string; won: boolean; xp: number; coins: number; role: Role };
}

export interface ResumePayload {
  room: RoomSnapshot;
  state: GameStateView | null;
  role: RoleInfo | null;
  self: SelfState | null;
  chat: ChatMessage[];
}
