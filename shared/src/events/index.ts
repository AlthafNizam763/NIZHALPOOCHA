import { z } from 'zod';
import {
  ACCESSORIES,
  BODY_TYPES,
  CLOTH_COLORS,
  FOOTWEAR,
  HAIR_COLORS,
  HAIR_STYLE_COUNT,
  SKIN_TONES,
  TOP_STYLES,
} from '../constants/appearance';
import { GAME } from '../constants/game';
import { SABOTAGE_TYPES } from '../game-rules/sabotage';
import { partialSettingsSchema } from '../game-rules/settings';
import type {
  AckFn,
  ChatMessage,
  GameEndView,
  GameStateView,
  PositionSnapshot,
  PublicRoomList,
  ResumePayload,
  RoleInfo,
  RoomSnapshot,
  SelfState,
  VoteResult,
  ErrorCode,
} from '../types';
import type { SabotageType } from '../game-rules/sabotage';
import type { VoiceJoinResult, VoiceRoster, VoiceSignal } from '../game-rules/voice';

/** Client → server event names. Never write these strings elsewhere. */
export const C2S = {
  ROOM_CREATE: 'room:create',
  ROOM_JOIN: 'room:join',
  ROOM_QUICK_PLAY: 'room:quickPlay',
  ROOM_LIST: 'room:list',
  ROOM_LEAVE: 'room:leave',
  ROOM_READY: 'room:ready',
  ROOM_SETTINGS: 'room:settings',
  ROOM_PROFILE: 'room:profile',
  ROOM_START: 'room:start',
  ROOM_KICK: 'room:kick',
  PLAYER_MOVE: 'player:move',
  TASK_START: 'task:start',
  TASK_COMPLETE: 'task:complete',
  PLAYER_REPORT: 'player:report',
  CAT_KILL: 'cat:kill',
  CAT_SABOTAGE: 'cat:sabotage',
  SABOTAGE_REPAIR_START: 'sabotage:repairStart',
  SABOTAGE_REPAIR: 'sabotage:repair',
  MEETING_START: 'meeting:start',
  MEETING_CHAT: 'meeting:chat',
  VOTE_CAST: 'vote:cast',
  GAME_RECONNECT: 'game:reconnect',
  PING: 'net:ping',
  VOICE_JOIN: 'voice:join',
  VOICE_LEAVE: 'voice:leave',
  VOICE_MUTE: 'voice:mute',
  VOICE_SIGNAL: 'voice:signal',
} as const;

/** Server → client event names. */
export const S2C = {
  ROOM_UPDATED: 'room:updated',
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  HOST_CHANGED: 'room:hostChanged',
  KICKED: 'room:kicked',
  GAME_STARTING: 'game:starting',
  GAME_ROLE: 'game:role',
  GAME_STATE: 'game:state',
  GAME_SELF: 'game:self',
  GAME_SNAPSHOT: 'game:snapshot',
  TASK_UPDATED: 'task:updated',
  SABOTAGE_STARTED: 'sabotage:started',
  SABOTAGE_ENDED: 'sabotage:ended',
  PLAYER_KILLED: 'player:killed',
  MEETING_STARTED: 'meeting:started',
  MEETING_CHAT: 'meeting:chat',
  VOTING_STARTED: 'voting:started',
  VOTING_UPDATED: 'voting:updated',
  VOTE_RESULT: 'vote:result',
  GAME_ENDED: 'game:ended',
  PLAYER_RECONNECTED: 'player:reconnected',
  SERVER_ERROR: 'server:error',
  VOICE_ROSTER: 'voice:roster',
  VOICE_SIGNAL: 'voice:signal',
} as const;

// ── Payload schemas (validated on the server) ─────────────────────────────
const idx = (n: number) => z.number().int().min(0).max(n - 1);

export const appearanceSchema = z.object({
  body: z.enum(BODY_TYPES),
  skin: idx(SKIN_TONES.length),
  hair: idx(HAIR_STYLE_COUNT),
  hairColor: idx(HAIR_COLORS.length),
  top: idx(CLOTH_COLORS.length),
  topStyle: z.enum(TOP_STYLES),
  bottom: idx(CLOTH_COLORS.length),
  footwear: z.enum(FOOTWEAR),
  accessory: z.enum(ACCESSORIES),
});

export const playerNameSchema = z
  .string()
  .trim()
  .min(GAME.MIN_NAME_LENGTH)
  .max(GAME.MAX_NAME_LENGTH)
  .regex(/^[\p{L}\p{M}\p{N} _.-]+$/u, 'invalid characters');

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9]{6}$/);

const idSchema = z.string().min(1).max(128);

export const schemas = {
  roomCreate: z.object({ name: playerNameSchema, appearance: appearanceSchema, settings: partialSettingsSchema.optional() }),
  roomJoin: z.object({ code: roomCodeSchema, name: playerNameSchema, appearance: appearanceSchema }),
  quickPlay: z.object({ name: playerNameSchema, appearance: appearanceSchema }),
  roomReady: z.object({ ready: z.boolean() }),
  roomSettings: partialSettingsSchema,
  roomProfile: z.object({ name: playerNameSchema.optional(), appearance: appearanceSchema.optional() }),
  roomKick: z.object({ playerId: idSchema }),
  playerMove: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    moving: z.boolean(),
    left: z.boolean(),
    seq: z.number().int().nonnegative(),
  }),
  taskRef: z.object({ taskId: idSchema }),
  report: z.object({ bodyId: idSchema }),
  kill: z.object({ targetId: idSchema }),
  sabotage: z.object({ type: z.enum(SABOTAGE_TYPES), targetBuildingId: idSchema.optional() }),
  repair: z.object({ stationId: idSchema }),
  chat: z
    .object({ text: z.string().trim().min(1).max(GAME.MAX_CHAT_LENGTH).optional(), quickId: z.string().max(32).optional() })
    .refine((v) => !!v.text !== !!v.quickId, 'text xor quickId'),
  vote: z.object({ targetId: z.union([idSchema, z.literal('skip')]) }),
  voiceMute: z.object({ muted: z.boolean() }),
  voiceSignal: z.object({
    to: idSchema,
    data: z.union([
      z.object({ type: z.enum(['offer', 'answer']), sdp: z.string().min(1).max(12_000) }),
      z.object({
        type: z.literal('ice'),
        candidate: z.object({
          candidate: z.string().max(1_000),
          sdpMid: z.string().max(64).nullish(),
          sdpMLineIndex: z.number().int().min(0).max(64).nullish(),
        }),
      }),
    ]),
  }),
};

export type RoomCreatePayload = z.infer<typeof schemas.roomCreate>;
export type RoomJoinPayload = z.infer<typeof schemas.roomJoin>;
export type QuickPlayPayload = z.infer<typeof schemas.quickPlay>;
export type PlayerMovePayload = z.infer<typeof schemas.playerMove>;
export type ChatPayload = z.infer<typeof schemas.chat>;

// ── Typed Socket.IO interfaces ────────────────────────────────────────────
export interface ClientToServerEvents {
  [C2S.ROOM_CREATE]: (p: RoomCreatePayload, ack: AckFn<RoomSnapshot>) => void;
  [C2S.ROOM_JOIN]: (p: RoomJoinPayload, ack: AckFn<RoomSnapshot>) => void;
  [C2S.ROOM_QUICK_PLAY]: (p: QuickPlayPayload, ack: AckFn<RoomSnapshot>) => void;
  [C2S.ROOM_LIST]: (ack: AckFn<PublicRoomList>) => void;
  [C2S.ROOM_LEAVE]: (ack: AckFn) => void;
  [C2S.ROOM_READY]: (p: { ready: boolean }, ack: AckFn) => void;
  [C2S.ROOM_SETTINGS]: (p: z.infer<typeof schemas.roomSettings>, ack: AckFn) => void;
  [C2S.ROOM_PROFILE]: (p: z.infer<typeof schemas.roomProfile>, ack: AckFn) => void;
  [C2S.ROOM_START]: (ack: AckFn) => void;
  [C2S.ROOM_KICK]: (p: { playerId: string }, ack: AckFn) => void;
  [C2S.PLAYER_MOVE]: (p: PlayerMovePayload) => void;
  [C2S.TASK_START]: (p: { taskId: string }, ack: AckFn) => void;
  [C2S.TASK_COMPLETE]: (p: { taskId: string }, ack: AckFn) => void;
  [C2S.PLAYER_REPORT]: (p: { bodyId: string }, ack: AckFn) => void;
  [C2S.CAT_KILL]: (p: { targetId: string }, ack: AckFn) => void;
  [C2S.CAT_SABOTAGE]: (p: { type: SabotageType; targetBuildingId?: string }, ack: AckFn) => void;
  [C2S.SABOTAGE_REPAIR_START]: (p: { stationId: string }, ack: AckFn) => void;
  [C2S.SABOTAGE_REPAIR]: (p: { stationId: string }, ack: AckFn) => void;
  [C2S.MEETING_START]: (ack: AckFn) => void;
  [C2S.MEETING_CHAT]: (p: ChatPayload, ack: AckFn) => void;
  [C2S.VOTE_CAST]: (p: { targetId: string | 'skip' }, ack: AckFn) => void;
  [C2S.GAME_RECONNECT]: (ack: AckFn<ResumePayload | null>) => void;
  [C2S.PING]: (clientTime: number, ack: (serverTime: number) => void) => void;
  [C2S.VOICE_JOIN]: (ack: AckFn<VoiceJoinResult>) => void;
  [C2S.VOICE_LEAVE]: (ack: AckFn) => void;
  [C2S.VOICE_MUTE]: (p: { muted: boolean }, ack: AckFn) => void;
  [C2S.VOICE_SIGNAL]: (p: { to: string; data: VoiceSignal }) => void;
}

export interface ServerToClientEvents {
  [S2C.ROOM_UPDATED]: (room: RoomSnapshot) => void;
  [S2C.PLAYER_JOINED]: (p: { id: string; name: string }) => void;
  [S2C.PLAYER_LEFT]: (p: { id: string; name: string }) => void;
  [S2C.HOST_CHANGED]: (p: { hostId: string; name: string }) => void;
  [S2C.KICKED]: () => void;
  [S2C.GAME_STARTING]: (p: { countdownEndsAt: number; serverNow: number }) => void;
  [S2C.GAME_ROLE]: (role: RoleInfo) => void;
  [S2C.GAME_STATE]: (state: GameStateView) => void;
  [S2C.GAME_SELF]: (self: SelfState) => void;
  [S2C.GAME_SNAPSHOT]: (snap: PositionSnapshot) => void;
  [S2C.TASK_UPDATED]: (p: { taskId: string; done: boolean }) => void;
  [S2C.SABOTAGE_STARTED]: (p: { type: SabotageType }) => void;
  [S2C.SABOTAGE_ENDED]: (p: { type: SabotageType; repaired: boolean }) => void;
  [S2C.PLAYER_KILLED]: (p: { victimId: string; x: number; y: number; byYou: boolean; you: boolean }) => void;
  [S2C.MEETING_STARTED]: (p: { reason: 'report' | 'emergency'; callerId: string; reportedVictimId: string | null }) => void;
  [S2C.MEETING_CHAT]: (msg: ChatMessage) => void;
  [S2C.VOTING_STARTED]: (p: { votingEndsAt: number }) => void;
  [S2C.VOTING_UPDATED]: (p: { votedIds: string[] }) => void;
  [S2C.VOTE_RESULT]: (r: VoteResult) => void;
  [S2C.GAME_ENDED]: (end: GameEndView) => void;
  [S2C.PLAYER_RECONNECTED]: (p: { id: string }) => void;
  [S2C.SERVER_ERROR]: (p: { code: ErrorCode; message?: string }) => void;
  [S2C.VOICE_ROSTER]: (roster: VoiceRoster) => void;
  [S2C.VOICE_SIGNAL]: (p: { from: string; data: VoiceSignal }) => void;
}

/** Quick chat message ids (text is localized on the client). */
export const QUICK_CHAT_IDS = ['saw_someone', 'doing_task', 'where_body', 'near_school', 'check_junction', 'skip', 'wait', 'trust_me', 'sus'] as const;
export type QuickChatId = (typeof QUICK_CHAT_IDS)[number];
