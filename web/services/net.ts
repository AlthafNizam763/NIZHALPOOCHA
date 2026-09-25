'use client';
import { io, type Socket } from 'socket.io-client';
import {
  C2S,
  S2C,
  type Ack,
  type ClientToServerEvents,
  type ErrorCode,
  type PublicRoomList,
  type ResumePayload,
  type RoomSnapshot,
  type ServerToClientEvents,
} from '@nizhal/shared';
import { useConnection } from '@/state/connectionStore';
import { useRoom } from '@/state/roomStore';
import { useGame } from '@/state/gameStore';
import { useUi } from '@/state/uiStore';
import { useAuth } from '@/state/authStore';
import { bridge } from '@/game/bridge';
import { audio } from './audio';
import { socketCredentials } from './auth';
import { t } from '@/hooks/useT';
import type { VoiceSignal } from '@nizhal/shared';
import { voice } from './voice';

type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:4000';
const ACK_TIMEOUT_MS = 8000;

let socket: GameSocket | null = null;
let pingTimer: ReturnType<typeof setInterval> | null = null;

export type NetResult<T = undefined> = Ack<T> | { ok: false; error: 'TIMEOUT' };

/** Answers requests locally instead of the server (the offline tutorial). */
export type OfflineHandler = (event: string, payload: unknown) => Ack<unknown>;
let offline: OfflineHandler | null = null;

/** While set, requests and moves never reach the server. Pass null to restore. */
export function setOfflineHandler(handler: OfflineHandler | null): void {
  offline = handler;
}

/** Typed request/ack helper with timeout. Event names only come from C2S. */
export function request<T = undefined>(event: string, ...args: unknown[]): Promise<NetResult<T>> {
  if (offline) return Promise.resolve(offline(event, args[0]) as NetResult<T>);
  return new Promise((resolve) => {
    const s = socket;
    if (!s || !s.connected) return resolve({ ok: false, error: 'TIMEOUT' });
    (s.timeout(ACK_TIMEOUT_MS).emit as (...a: unknown[]) => void)(event, ...args, (err: Error | null, res: Ack<T>) => {
      resolve(err ? { ok: false, error: 'TIMEOUT' } : res);
    });
  });
}

export function emitVoiceSignal(to: string, data: VoiceSignal): void {
  socket?.emit(C2S.VOICE_SIGNAL, { to, data });
}

export function sendMove(x: number, y: number, moving: boolean, left: boolean, seq: number): void {
  if (offline) return;
  socket?.volatile.emit(C2S.PLAYER_MOVE, { x, y, moving, left, seq });
}

function applyResume(r: ResumePayload | null) {
  if (!r) {
    useRoom.getState().setRoom(null);
    return;
  }
  useRoom.getState().setRoom(r.room);
  if (r.state) {
    useGame.getState().set({ state: r.state, role: r.role, self: r.self, chat: r.chat, voteResult: r.state.voteResult });
    if (r.self) bridge.teleport(r.self.x, r.self.y);
  }
}

async function resume() {
  const r = await request<ResumePayload | null>(C2S.GAME_RECONNECT);
  if (r.ok) applyResume(r.data);
}

function measurePing() {
  const s = socket;
  if (!s?.connected) return;
  const sent = Date.now();
  s.emit(C2S.PING, sent, (serverTime: number) => {
    const now = Date.now();
    const rtt = now - sent;
    const offset = serverTime - (sent + rtt / 2);
    const prev = useConnection.getState();
    useConnection.getState().set({ ping: rtt, clockOffset: prev.ping === null ? offset : prev.clockOffset * 0.7 + offset * 0.3 });
  });
}

function wire(s: GameSocket) {
  const game = () => useGame.getState();
  const ui = () => useUi.getState();

  s.on('connect', () => {
    useConnection.getState().set({ status: 'connected' });
    measurePing();
    void resume();
    void voice.resume();
  });
  s.on('disconnect', (reason) => {
    const st = useConnection.getState().status;
    if (st === 'replaced') return;
    useConnection.getState().set({ status: reason === 'io client disconnect' ? 'idle' : 'reconnecting' });
  });
  s.on('connect_error', (err) => {
    useConnection.getState().set({ status: err.message === 'UNAUTHORIZED' ? 'unauthorized' : 'reconnecting' });
  });
  s.io.on('reconnect_failed', () => useConnection.getState().set({ status: 'disconnected' }));

  s.on(S2C.ROOM_UPDATED, (room) => useRoom.getState().setRoom(room));
  s.on(S2C.PLAYER_JOINED, (p) => {
    if (!game().state) ui().toast('err.playerJoined', { name: p.name });
  });
  s.on(S2C.PLAYER_LEFT, (p) => ui().toast('err.playerLeft', { name: p.name }, 'warn'));
  s.on(S2C.HOST_CHANGED, (p) => ui().toast('err.hostLeft', { name: p.name }, 'warn'));
  s.on(S2C.KICKED, () => {
    void voice.leave(false);
    useRoom.getState().setRoom(null);
    ui().toast('err.kicked', undefined, 'danger');
  });

  s.on(S2C.GAME_STARTING, () => audio.play('warning'));
  s.on(S2C.GAME_ROLE, (role) => {
    // A new match begins: clear everything from the previous one.
    game().reset();
    game().set({ role });
    audio.play('reveal');
  });
  s.on(S2C.GAME_STATE, (state) => game().set({ state, voteResult: state.voteResult ?? game().voteResult }));
  s.on(S2C.GAME_SELF, (self) => {
    const prev = game().self;
    if (!prev || prev.teleportSeq !== self.teleportSeq) bridge.teleport(self.x, self.y);
    game().set({ self });
  });
  s.on(S2C.GAME_SNAPSHOT, (snap) => bridge.pushSnapshot(snap));

  s.on(S2C.TASK_UPDATED, (p) => {
    if (p.done) {
      audio.play('taskDone');
      ui().toast('task.done', undefined, 'good');
    }
  });
  s.on(S2C.SABOTAGE_STARTED, (p) => {
    audio.play('sabotage');
    ui().toast(`sabotage.alert.${p.type}`, undefined, 'danger');
  });
  s.on(S2C.SABOTAGE_ENDED, (p) => {
    if (p.repaired) ui().toast('sabotage.fixed', { name: t(`sabotage.${p.type}`) }, 'good');
    const panel = game().panel;
    if (panel?.kind === 'repair') game().set({ panel: null });
  });
  s.on(S2C.PLAYER_KILLED, (p) => {
    // Only the victim and the Cats ever receive this event.
    if (p.you || p.byYou) audio.play('kill');
    game().set({
      knownKills: [...game().knownKills, p.victimId],
      ...(p.you ? { panel: null } : {}),
      ...(p.you || p.byYou ? { killScene: { victimId: p.victimId, asKiller: !p.you, at: Date.now() } } : {}),
    });
  });
  s.on(S2C.PLAYER_INFECTED, (p) => {
    // Only the victim and the Cats ever receive this.
    audio.play(p.you ? 'warning' : 'kill');
    if (p.you) {
      bridge.resetInput();
      game().set({ panel: null });
    }
  });
  s.on(S2C.ROLE_CHANGED, (p) => {
    game().set({ role: p.role });
    if (p.reason === 'infected') {
      audio.play('reveal');
      ui().toast('infection.turned', undefined, 'danger');
    } else {
      ui().toast('infection.fellowJoined', undefined, 'warn');
    }
  });
  s.on(S2C.OBJECTIVE_COLLECTED, (p) => {
    audio.play('taskDone');
    ui().toast('objective.collected', { name: p.byName, n: p.collected, total: p.total }, 'good');
    const panel = game().panel;
    if (panel?.kind === 'objective' && panel.objectiveId === p.objectiveId) game().set({ panel: null });
  });
  s.on(S2C.SURVEILLANCE_ALERT, (p) => {
    audio.play('warning');
    ui().toast('alert.surveillance', { zone: t(`zone.${p.zoneId}` as Parameters<typeof t>[0]) }, 'danger');
  });
  s.on(S2C.CAMERA_FEED, (feed) => game().set({ cameraFeed: feed }));
  s.on(S2C.MEETING_STARTED, () => {
    audio.play('report');
    setTimeout(() => audio.play('meeting'), 600);
    bridge.resetInput();
    game().set({ panel: null, chat: [], voteResult: null, cameraFeed: null });
  });
  s.on(S2C.MEETING_CHAT, (msg) => game().set({ chat: [...game().chat.slice(-150), msg] }));
  s.on(S2C.VOTING_STARTED, () => audio.play('warning'));
  s.on(S2C.VOTING_UPDATED, (p) => {
    const st = game().state;
    audio.play('vote');
    if (st?.meeting) game().set({ state: { ...st, meeting: { ...st.meeting, votedIds: p.votedIds } } });
  });
  s.on(S2C.VOTE_RESULT, (r) => {
    audio.play('result');
    game().set({ voteResult: r });
  });
  s.on(S2C.GAME_ENDED, (end) => {
    audio.play(end.you.won ? 'victory' : 'defeat');
    game().set({ end, panel: null });
  });
  s.on(S2C.VOICE_ROSTER, (r) => voice.onRoster(r));
  s.on(S2C.VOICE_SIGNAL, (p) => void voice.onSignal(p.from, p.data));
  s.on(S2C.SERVER_ERROR, (e) => {
    if (e.message === 'SESSION_REPLACED') useConnection.getState().set({ status: 'replaced' });
  });
}

/** Connects (once) for the signed-in user. Safe to call repeatedly. */
export function connect(): void {
  if (socket || typeof window === 'undefined') return;
  if (!useAuth.getState().user) return;
  useConnection.getState().set({ status: 'connecting' });
  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    // Fresh Firebase ID token on every (re)connect.
    auth: (cb) => void socketCredentials().then(cb),
    reconnectionDelay: 800,
    reconnectionDelayMax: 4000,
    reconnectionAttempts: 20,
  });
  wire(socket);
  pingTimer = setInterval(measurePing, 3000);
}

export function disconnect(): void {
  if (pingTimer) clearInterval(pingTimer);
  pingTimer = null;
  socket?.disconnect();
  socket = null;
  void voice.leave(false);
  useConnection.getState().set({ status: 'idle', ping: null });
  useRoom.getState().setRoom(null);
  useGame.getState().reset();
}

/** Manual retry after reconnection attempts are exhausted or the session was replaced. */
export function reconnectNow(): void {
  if (!socket) return connect();
  useConnection.getState().set({ status: 'connecting' });
  socket.connect();
}

// ── Typed room actions ───────────────────────────────────────────────────
export const rooms = {
  create: (p: Parameters<ClientToServerEvents[typeof C2S.ROOM_CREATE]>[0]) => request<RoomSnapshot>(C2S.ROOM_CREATE, p),
  join: (p: Parameters<ClientToServerEvents[typeof C2S.ROOM_JOIN]>[0]) => request<RoomSnapshot>(C2S.ROOM_JOIN, p),
  quickPlay: (p: Parameters<ClientToServerEvents[typeof C2S.ROOM_QUICK_PLAY]>[0]) => request<RoomSnapshot>(C2S.ROOM_QUICK_PLAY, p),
  list: () => request<PublicRoomList>(C2S.ROOM_LIST),
  leave: async () => {
    await voice.leave();
    const r = await request(C2S.ROOM_LEAVE);
    useRoom.getState().setRoom(null);
    useGame.getState().reset();
    return r;
  },
  ready: (ready: boolean) => request(C2S.ROOM_READY, { ready }),
  settings: (p: Parameters<ClientToServerEvents[typeof C2S.ROOM_SETTINGS]>[0]) => request(C2S.ROOM_SETTINGS, p),
  profile: (p: Parameters<ClientToServerEvents[typeof C2S.ROOM_PROFILE]>[0]) => request(C2S.ROOM_PROFILE, p),
  kick: (playerId: string) => request(C2S.ROOM_KICK, { playerId }),
  start: () => request(C2S.ROOM_START),
};

export const actions = {
  taskStart: (taskId: string) => request(C2S.TASK_START, { taskId }),
  taskComplete: (taskId: string) => request(C2S.TASK_COMPLETE, { taskId }),
  report: (bodyId: string) => request(C2S.PLAYER_REPORT, { bodyId }),
  kill: (targetId: string) => request(C2S.CAT_KILL, { targetId }),
  sabotage: (type: Parameters<ClientToServerEvents[typeof C2S.CAT_SABOTAGE]>[0]['type'], targetBuildingId?: string) =>
    request(C2S.CAT_SABOTAGE, { type, targetBuildingId }),
  repairStart: (stationId: string) => request(C2S.SABOTAGE_REPAIR_START, { stationId }),
  repair: (stationId: string) => request(C2S.SABOTAGE_REPAIR, { stationId }),
  objectiveStart: (objectiveId: string) => request(C2S.OBJECTIVE_START, { objectiveId }),
  objectiveCollect: (objectiveId: string) => request(C2S.OBJECTIVE_COLLECT, { objectiveId }),
  watchCameras: (watching: boolean) => request(C2S.CAMERAS_WATCH, { watching }),
  emergency: () => request(C2S.MEETING_START),
  chat: (p: { text?: string; quickId?: string }) => request(C2S.MEETING_CHAT, p),
  vote: (targetId: string | 'skip') => request(C2S.VOTE_CAST, { targetId }),
};

export function errorKey(error: ErrorCode | 'TIMEOUT'): `err.${ErrorCode | 'TIMEOUT'}` {
  return `err.${error}`;
}
