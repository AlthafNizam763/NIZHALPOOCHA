import type { Server, Socket } from 'socket.io';
import type { ZodType } from 'zod';
import {
  C2S,
  S2C,
  schemas,
  type Ack,
  type ClientToServerEvents,
  type ErrorCode,
  type ServerToClientEvents,
} from '@nizhal/shared';
import type { RoomManager } from '../rooms/RoomManager';
import type { SocketData } from '../auth/socketAuth';
import { TokenBucket } from '../utils/rateLimit';
import { createLogger } from '../utils/logger';
import { config } from '../utils/config';

const log = createLogger('socket');

type IO = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type GameSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type AnyAck = (res: Ack<unknown>) => void;

export const userRoom = (uid: string) => `u:${uid}`;

/** uid → current socket id (latest connection wins). */
const activeSocket = new Map<string, string>();

export function registerHandlers(io: IO, rooms: RoomManager): void {
  io.on('connection', (socket: GameSocket) => {
    const { uid } = socket.data.identity;

    // A newer connection for the same account replaces the older one.
    const previous = activeSocket.get(uid);
    if (previous && previous !== socket.id) {
      const old = io.sockets.sockets.get(previous);
      if (old) {
        old.emit(S2C.SERVER_ERROR, { code: 'NOT_ALLOWED', message: 'SESSION_REPLACED' });
        old.disconnect(true);
      }
    }
    activeSocket.set(uid, socket.id);
    void socket.join(userRoom(uid));
    log.debug(`connected ${uid} (${socket.id})`);

    // Rejoin a room this account is already part of (page refresh / network drop).
    rooms.roomOf(uid)?.handleReconnect(uid);

    const generalBucket = new TokenBucket(20, 10);
    const moveBucket = new TokenBucket(40, 25);

    /** Validates payload + rate limit, runs the handler and always acks. */
    function on<P, R>(
      event: string,
      schema: ZodType<P> | null,
      handler: (payload: P) => { ok: true; data?: R } | { ok: false; error: ErrorCode },
    ): void {
      (socket as unknown as Socket).on(event, (...args: unknown[]) => {
        const ack = (typeof args[args.length - 1] === 'function' ? args.pop() : null) as AnyAck | null;
        const reply = (res: Ack<unknown>) => ack?.(res);
        if (!generalBucket.take()) return reply({ ok: false, error: 'RATE_LIMITED' });
        let payload = undefined as P;
        if (schema) {
          const parsed = schema.safeParse(args[0]);
          if (!parsed.success) return reply({ ok: false, error: 'INVALID_PAYLOAD' });
          payload = parsed.data;
        }
        try {
          const res = handler(payload);
          reply(res.ok ? { ok: true, data: res.data } : res);
        } catch (err) {
          log.error(`handler ${event} failed for ${uid}`, err);
          reply({ ok: false, error: 'SERVER_ERROR' });
        }
      });
    }

    const inMatch = () => rooms.roomOf(uid)?.match ?? null;
    const noMatch = { ok: false as const, error: 'INVALID_PHASE' as const };

    // ── Rooms ────────────────────────────────────────────────────────────
    on(C2S.ROOM_CREATE, schemas.roomCreate, (p) => {
      if (config.maintenance) return { ok: false, error: 'MAINTENANCE' };
      const r = rooms.create(uid, p.name, p.appearance, p.settings);
      return r.ok ? { ok: true, data: r.room.snapshot() } : r;
    });

    on(C2S.ROOM_JOIN, schemas.roomJoin, (p) => {
      const r = rooms.join(uid, p.code, p.name, p.appearance);
      return r.ok ? { ok: true, data: r.room.snapshot() } : r;
    });

    on(C2S.ROOM_QUICK_PLAY, schemas.quickPlay, (p) => {
      if (config.maintenance) return { ok: false, error: 'MAINTENANCE' };
      const r = rooms.quickPlay(uid, p.name, p.appearance);
      return r.ok ? { ok: true, data: r.room.snapshot() } : r;
    });

    on(C2S.ROOM_LIST, null, () => ({ ok: true, data: { rooms: rooms.listPublic(), online: activeSocket.size } }));

    on(C2S.ROOM_LEAVE, null, () => {
      rooms.leave(uid);
      return { ok: true };
    });

    on(C2S.ROOM_READY, schemas.roomReady, (p) => rooms.roomOf(uid)?.setReady(uid, p.ready) ?? { ok: false, error: 'NOT_IN_ROOM' });
    on(C2S.ROOM_SETTINGS, schemas.roomSettings, (p) => rooms.roomOf(uid)?.updateSettings(uid, p) ?? { ok: false, error: 'NOT_IN_ROOM' });
    on(C2S.ROOM_PROFILE, schemas.roomProfile, (p) =>
      rooms.roomOf(uid)?.updateProfile(uid, p.name, p.appearance) ?? { ok: false, error: 'NOT_IN_ROOM' },
    );
    on(C2S.ROOM_KICK, schemas.roomKick, (p) => rooms.roomOf(uid)?.kick(uid, p.playerId) ?? { ok: false, error: 'NOT_IN_ROOM' });
    on(C2S.ROOM_START, null, () => rooms.roomOf(uid)?.requestStart(uid) ?? { ok: false, error: 'NOT_IN_ROOM' });

    on(C2S.GAME_RECONNECT, null, () => {
      const room = rooms.roomOf(uid);
      if (!room) return { ok: true, data: null };
      room.handleReconnect(uid);
      return { ok: true, data: room.resumeFor(uid) };
    });

    // ── Gameplay ────────────────────────────────────────────────────────
    (socket as unknown as Socket).on(C2S.PLAYER_MOVE, (raw: unknown) => {
      if (!moveBucket.take()) return;
      const parsed = schemas.playerMove.safeParse(raw);
      if (!parsed.success) return;
      inMatch()?.handleMove(uid, parsed.data);
    });

    on(C2S.TASK_START, schemas.taskRef, (p) => inMatch()?.startTask(uid, p.taskId) ?? noMatch);
    on(C2S.TASK_COMPLETE, schemas.taskRef, (p) => inMatch()?.completeTask(uid, p.taskId) ?? noMatch);
    on(C2S.PLAYER_REPORT, schemas.report, (p) => inMatch()?.report(uid, p.bodyId) ?? noMatch);
    on(C2S.CAT_KILL, schemas.kill, (p) => inMatch()?.kill(uid, p.targetId) ?? noMatch);
    on(C2S.CAT_SABOTAGE, schemas.sabotage, (p) => inMatch()?.startSabotage(uid, p.type, p.targetBuildingId) ?? noMatch);
    on(C2S.SABOTAGE_REPAIR_START, schemas.repair, (p) => inMatch()?.startRepair(uid, p.stationId) ?? noMatch);
    on(C2S.SABOTAGE_REPAIR, schemas.repair, (p) => inMatch()?.completeRepair(uid, p.stationId) ?? noMatch);
    on(C2S.MEETING_START, null, () => inMatch()?.callEmergency(uid) ?? noMatch);
    on(C2S.MEETING_CHAT, schemas.chat, (p) => inMatch()?.sendChat(uid, p) ?? noMatch);
    on(C2S.VOTE_CAST, schemas.vote, (p) => inMatch()?.castVote(uid, p.targetId) ?? noMatch);

    // ── Voice (signalling only; audio is peer-to-peer) ──────────────────
    const signalBucket = new TokenBucket(60, 30);
    on(C2S.VOICE_JOIN, null, () => {
      const r = rooms.roomOf(uid)?.voiceJoin(uid) ?? { ok: false as const, error: 'NOT_IN_ROOM' as const };
      return r.ok ? { ok: true, data: { iceServers: config.voiceIceServers } } : r;
    });
    on(C2S.VOICE_LEAVE, null, () => {
      rooms.roomOf(uid)?.voiceLeave(uid);
      return { ok: true };
    });
    on(C2S.VOICE_MUTE, schemas.voiceMute, (p) => rooms.roomOf(uid)?.voiceMute(uid, p.muted) ?? { ok: false, error: 'NOT_IN_ROOM' });
    (socket as unknown as Socket).on(C2S.VOICE_SIGNAL, (raw: unknown) => {
      if (!signalBucket.take()) return;
      const parsed = schemas.voiceSignal.safeParse(raw);
      if (!parsed.success) return;
      rooms.roomOf(uid)?.voiceSignal(uid, parsed.data.to, parsed.data.data);
    });

    socket.on(C2S.PING, (clientTime, ack) => {
      if (typeof ack === 'function') ack(Date.now());
      void clientTime;
    });

    socket.on('disconnect', (reason) => {
      log.debug(`disconnected ${uid} (${reason})`);
      if (activeSocket.get(uid) !== socket.id) return; // replaced by a newer socket
      activeSocket.delete(uid);
      const room = rooms.roomOf(uid);
      room?.voiceLeave(uid); // the client re-joins voice after reconnecting
      room?.handleDisconnect(uid);
    });
  });
}
