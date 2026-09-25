/**
 * End-to-end multiplayer simulation over real Socket.IO connections.
 *
 *   1. start the server with ALLOW_DEV_AUTH=true   (npm run dev -w server)
 *   2. npm run sim                                 (SIM_URL overrides the target)
 *
 * Five bots create/join a room, start, walk (legally) through the shared
 * collision code, the Cat kills, a Human reports, everyone meets and votes, and
 * the script asserts that the Humans win and no hidden information leaked.
 */
import { io, type Socket } from 'socket.io-client';
import {
  C2S,
  GAME,
  S2C,
  getMap,
  moveWithCollision,
  randomAppearance,
  type Ack,
  type ClientToServerEvents,
  type GameEndView,
  type GameStateView,
  type PositionSnapshot,
  type RoleInfo,
  type RoomSnapshot,
  type SelfState,
  type ResumePayload,
} from '@nizhal/shared';

const URL = process.env.SIM_URL ?? 'http://localhost:4000';
const MAP = getMap('kadalimukku_old_town');
type S = Socket<Record<string, (...a: never[]) => void>, ClientToServerEvents>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) {
    console.error(`✖ ${msg}`);
    process.exit(1);
  }
  console.log(`✔ ${msg}`);
}

class Bot {
  socket: S;
  role: RoleInfo | null = null;
  self: SelfState | null = null;
  state: GameStateView | null = null;
  snap: PositionSnapshot | null = null;
  ended: GameEndView | null = null;
  received: { event: string; payload: unknown }[] = [];
  x = 0;
  y = 0;
  seq = 0;

  constructor(readonly name: string, readonly uid: string) {
    this.socket = io(URL, { auth: { devUid: uid }, transports: ['websocket'], reconnection: false }) as unknown as S;
    this.socket.onAny((event: string, payload: unknown) => this.received.push({ event, payload }));
    this.socket.on(S2C.GAME_ROLE, (r: RoleInfo) => (this.role = r));
    this.socket.on(S2C.GAME_STATE, (s: GameStateView) => (this.state = s));
    this.socket.on(S2C.GAME_SNAPSHOT, (s: PositionSnapshot) => (this.snap = s));
    this.socket.on(S2C.GAME_ENDED, (e: GameEndView) => (this.ended = e));
    this.socket.on(S2C.GAME_SELF, (s: SelfState) => {
      const teleported = !this.self || s.teleportSeq !== this.self.teleportSeq;
      this.self = s;
      if (teleported) {
        this.x = s.x;
        this.y = s.y;
      }
    });
  }

  ready() {
    return new Promise<void>((res, rej) => {
      this.socket.once('connect', () => res());
      this.socket.once('connect_error', (e: Error) => rej(e));
    });
  }

  call<T>(event: string, ...args: unknown[]): Promise<Ack<T>> {
    return new Promise((res) => (this.socket.emit as (...a: unknown[]) => void)(event, ...args, (r: Ack<T>) => res(r)));
  }

  /** Walks toward (tx, ty) at legal speed using the shared collision resolver. */
  async walkTo(tx: number, ty: number, stopAt = 20) {
    for (let i = 0; i < 400; i++) {
      const dx = tx - this.x;
      const dy = ty - this.y;
      const d = Math.hypot(dx, dy);
      if (d <= stopAt) break;
      const step = Math.min(d, (GAME.PLAYER_SPEED * GAME.MOVE_SEND_INTERVAL_MS) / 1000);
      const next = moveWithCollision(this.x, this.y, (dx / d) * step, (dy / d) * step, GAME.PLAYER_HALF, MAP.colliders, MAP.width, MAP.height);
      this.x = next.x;
      this.y = next.y;
      this.socket.emit(C2S.PLAYER_MOVE, { x: this.x, y: this.y, moving: true, left: dx < 0, seq: ++this.seq });
      await sleep(GAME.MOVE_SEND_INTERVAL_MS);
    }
    this.socket.emit(C2S.PLAYER_MOVE, { x: this.x, y: this.y, moving: false, left: false, seq: ++this.seq });
    await sleep(100);
  }
}

async function waitFor(pred: () => boolean, ms: number, what: string) {
  const until = Date.now() + ms;
  while (!pred()) {
    if (Date.now() > until) assert(false, `timed out waiting for ${what}`);
    await sleep(50);
  }
}

async function main() {
  const run = Math.random().toString(36).slice(2, 8);
  const bots = Array.from({ length: 5 }, (_, i) => new Bot(`Bot${i}`, `dev_sim_${run}_${i}`));
  await Promise.all(bots.map((b) => b.ready()));
  assert(true, 'five bots connected');

  const [host, ...rest] = bots as [Bot, ...Bot[]];
  const bad = await rest[0]!.call<RoomSnapshot>(C2S.ROOM_JOIN, { code: 'ZZZZZZ', name: 'Bot1', appearance: randomAppearance() });
  assert(!bad.ok && bad.error === 'ROOM_NOT_FOUND', 'invalid room code rejected');

  const created = await host.call<RoomSnapshot>(C2S.ROOM_CREATE, {
    name: host.name,
    appearance: randomAppearance(),
    settings: { discussionS: 0, votingS: 20, maxPlayers: 5, killCooldownS: 10 },
  });
  assert(created.ok, 'room created');
  const code = created.data.code;
  for (const b of rest) {
    const r = await b.call<RoomSnapshot>(C2S.ROOM_JOIN, { code, name: b.name, appearance: randomAppearance() });
    assert(r.ok, `${b.name} joined ${code}`);
  }
  const sixth = new Bot('Bot5', `dev_sim_${run}_5`);
  await sixth.ready();
  const full = await sixth.call(C2S.ROOM_JOIN, { code, name: 'Bot5', appearance: randomAppearance() });
  assert(!full.ok && full.error === 'ROOM_FULL', 'sixth player rejected: room full');
  sixth.socket.disconnect();

  const early = await host.call(C2S.ROOM_START);
  assert(!early.ok && early.error === 'NOT_ALL_READY', 'start blocked until everyone is ready');
  for (const b of rest) await b.call(C2S.ROOM_READY, { ready: true });
  const start = await host.call(C2S.ROOM_START);
  assert(start.ok, 'host started the match');

  await waitFor(() => bots.every((b) => b.role), 10_000, 'roles');
  const cats = bots.filter((b) => b.role!.role === 'CAT');
  const humans = bots.filter((b) => b.role!.role === 'HUMAN');
  assert(cats.length === 1 && humans.length === 4, 'exactly one Cat among five');
  await waitFor(() => bots.every((b) => b.state?.phase === 'PLAYING' && b.self), 10_000, 'PLAYING');
  assert(true, 'match is PLAYING');

  const cat = cats[0]!;
  const [victim, reporter, h3] = humans as [Bot, Bot, Bot];

  const hk = await victim.call(C2S.CAT_KILL, { targetId: reporter.uid });
  assert(!hk.ok && hk.error === 'NOT_ALLOWED', 'human kill attempt rejected');
  const junk = await victim.call(C2S.CAT_KILL, { targetId: 42 });
  assert(!junk.ok && junk.error === 'INVALID_PAYLOAD', 'malformed payload rejected');
  const fastKill = await cat.call(C2S.CAT_KILL, { targetId: victim.uid });
  assert(!fastKill.ok && fastKill.error === 'COOLDOWN', 'kill cooldown enforced at start');

  // Reconnect test: a human drops and comes back mid-match.
  h3.socket.disconnect();
  await sleep(300);
  const h3b = new Bot(h3.name, h3.uid);
  await h3b.ready();
  const resume = await h3b.call<ResumePayload | null>(C2S.GAME_RECONNECT);
  assert(resume.ok && resume.data?.self?.alive && resume.data.role?.role === 'HUMAN', 'reconnected player resumed with private state');
  bots[bots.indexOf(h3)] = h3b;
  humans[humans.indexOf(h3)] = h3b;

  // Cat walks to the victim, then waits out the cooldown.
  await cat.walkTo(victim.x, victim.y, 40);
  const wait = Math.max(0, (cat.self!.killReadyAt ?? 0) - Date.now()) + 300;
  console.log(`  …waiting ${Math.round(wait / 1000)}s for kill cooldown`);
  await sleep(wait);
  await cat.walkTo(victim.x, victim.y, 40);
  const kill = await cat.call(C2S.CAT_KILL, { targetId: victim.uid });
  assert(
    kill.ok,
    `Cat eliminated a nearby Human${kill.ok ? '' : ` (${kill.error}; cat ${Math.round(cat.x)},${Math.round(cat.y)} victim ${victim.x},${victim.y})`}`,
  );
  await waitFor(() => victim.self?.alive === false, 3000, 'victim death');
  assert(true, 'victim notified privately and entered spectator mode');

  await sleep(200);
  const reporterSawKillEvent = reporter.received.some((r) => r.event === S2C.PLAYER_KILLED);
  assert(!reporterSawKillEvent, 'bystander did not receive the kill event');

  await waitFor(() => (reporter.snap?.b.length ?? 0) > 0, 3000, 'body visible to nearby reporter');
  const [bodyId, , bx, by] = reporter.snap!.b[0]!;
  await reporter.walkTo(bx, by, 50);
  const rep = await reporter.call(C2S.PLAYER_REPORT, { bodyId });
  assert(rep.ok, 'body reported');
  await waitFor(() => bots.every((b) => b.state?.phase === 'REPORT' || b.state?.phase === 'MEETING' || b.state?.phase === 'VOTING'), 3000, 'meeting');
  assert(true, 'all clients transitioned to the meeting');
  await waitFor(() => humans.every((b) => b.state?.phase === 'VOTING'), 10_000, 'voting');

  const chat = await reporter.call(C2S.MEETING_CHAT, { quickId: 'where_body' });
  assert(chat.ok, 'quick chat sent');
  const deadVote = await victim.call(C2S.VOTE_CAST, { targetId: cat.uid });
  assert(!deadVote.ok && deadVote.error === 'NOT_ALLOWED', 'dead player cannot vote');

  for (const h of humans) if (h !== victim) assert((await h.call(C2S.VOTE_CAST, { targetId: cat.uid })).ok, `${h.name} voted`);
  const dup = await reporter.call(C2S.VOTE_CAST, { targetId: cat.uid });
  assert(!dup.ok && dup.error === 'ALREADY_VOTED', 'duplicate vote rejected');
  await cat.call(C2S.VOTE_CAST, { targetId: 'skip' });

  await waitFor(() => bots.every((b) => b.ended), 15_000, 'game end');
  const end = reporter.ended!;
  assert(end.winner === 'HUMANS' && end.reason === 'cats_eliminated', 'Humans win after ejecting the Cat');
  assert(bots.every((b) => b.ended!.winner === 'HUMANS'), 'all clients converged on the same result');

  // Leak audit: nothing a Human received before the first legitimate reveal
  // (vote result with confirmEjects) may mention the Cat.
  for (const h of humans) {
    const cut = h.received.findIndex((r) => r.event === S2C.VOTE_RESULT);
    const before = cut === -1 ? h.received : h.received.slice(0, cut);
    const blob = JSON.stringify(before);
    if (blob.includes('"CAT"') || blob.includes(`"fellowCats":[{`)) assert(false, `${h.name} received hidden Cat info`);
  }
  assert(true, 'no hidden Cat information leaked to Humans before the reveal');

  await waitFor(() => host.received.some((r) => r.event === S2C.ROOM_UPDATED && (r.payload as RoomSnapshot).phase === 'LOBBY'), 3000, 'lobby');
  assert(true, 'room returned to LOBBY for another round');

  bots.forEach((b) => b.socket.disconnect());
  console.log('\nSimulation passed.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
