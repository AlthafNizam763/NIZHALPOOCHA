import {
  DEFAULT_SETTINGS,
  roomSettingsSchema,
  type Appearance,
  type ErrorCode,
  type PartialRoomSettings,
  type PublicRoomSummary,
} from '@nizhal/shared';
import type { Clock } from '../utils/clock';
import { roomCode } from '../utils/random';
import { createLogger } from '../utils/logger';
import type { Outbox } from '../game/outbox';
import type { MatchSummary, MatchTimings } from '../game/Match';
import { Room } from './Room';

const log = createLogger('rooms');

export type RoomResult = { ok: true; room: Room } | { ok: false; error: ErrorCode };

export interface RoomManagerDeps {
  outbox: Outbox;
  clock: Clock;
  onMatchEnd(summary: MatchSummary): void;
  matchTimings?: Partial<MatchTimings>;
}

/** Owns every live room and the player → room index. One room per player. */
export class RoomManager {
  private readonly rooms = new Map<string, Room>();
  private readonly playerRoom = new Map<string, string>();

  constructor(private readonly deps: RoomManagerDeps) {}

  roomOf(playerId: string): Room | null {
    const code = this.playerRoom.get(playerId);
    return code ? (this.rooms.get(code) ?? null) : null;
  }

  get(code: string): Room | null {
    return this.rooms.get(code) ?? null;
  }

  stats() {
    return { rooms: this.rooms.size, players: this.playerRoom.size };
  }

  create(playerId: string, name: string, appearance: Appearance, patch: PartialRoomSettings = {}): RoomResult {
    if (this.playerRoom.has(playerId)) return { ok: false, error: 'ALREADY_IN_ROOM' };
    const parsed = roomSettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...patch });
    if (!parsed.success) return { ok: false, error: 'INVALID_CONFIG' };

    let code = roomCode();
    while (this.rooms.has(code)) code = roomCode();

    const room = new Room(code, playerId, parsed.data, {
      outbox: this.deps.outbox,
      clock: this.deps.clock,
      matchTimings: this.deps.matchTimings,
      onMatchEnd: (s) => this.deps.onMatchEnd(s),
      onMemberRemoved: (_code, id) => this.playerRoom.delete(id),
      onEmpty: (c) => {
        this.rooms.delete(c);
        log.info(`room ${c} closed (empty)`);
      },
    });
    this.rooms.set(code, room);
    this.playerRoom.set(playerId, code);
    room.addMember(playerId, name, appearance);
    log.info(`room ${code} created by ${playerId}`);
    return { ok: true, room };
  }

  join(playerId: string, code: string, name: string, appearance: Appearance): RoomResult {
    const room = this.rooms.get(code);
    if (!room) return { ok: false, error: 'ROOM_NOT_FOUND' };
    const current = this.playerRoom.get(playerId);
    if (current === code) {
      room.handleReconnect(playerId);
      return { ok: true, room };
    }
    if (current) return { ok: false, error: 'ALREADY_IN_ROOM' };
    const r = room.addMember(playerId, name, appearance);
    if (!r.ok) return r;
    this.playerRoom.set(playerId, code);
    return { ok: true, room };
  }

  /** Join a public room that is waiting for players, or open a new public one. */
  quickPlay(playerId: string, name: string, appearance: Appearance): RoomResult {
    if (this.playerRoom.has(playerId)) return { ok: false, error: 'ALREADY_IN_ROOM' };
    const candidates = [...this.rooms.values()]
      .filter((r) => r.settings.isPublic && r.joinable)
      .sort((a, b) => b.size - a.size);
    for (const room of candidates) {
      const r = this.join(playerId, room.code, name, appearance);
      if (r.ok) return r;
    }
    return this.create(playerId, name, appearance, { isPublic: true });
  }

  /** Public rooms for the room browser: joinable first, then fuller rooms first. */
  listPublic(limit = 50): PublicRoomSummary[] {
    const rank = { open: 0, full: 1, playing: 2 } as const;
    return [...this.rooms.values()]
      .filter((r) => r.settings.isPublic && r.size > 0)
      .map((r) => r.publicSummary())
      .sort((a, b) => rank[a.status] - rank[b.status] || b.players - a.players)
      .slice(0, limit);
  }

  leave(playerId: string): void {
    const room = this.roomOf(playerId);
    this.playerRoom.delete(playerId);
    room?.removeMember(playerId, 'leave');
  }

  shutdown(): void {
    for (const r of this.rooms.values()) r.dispose();
    this.rooms.clear();
    this.playerRoom.clear();
  }
}
