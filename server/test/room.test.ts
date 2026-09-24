import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_APPEARANCE, GAME, type RoomSnapshot } from '@nizhal/shared';
import { RoomManager } from '../src/rooms/RoomManager';
import { ManualClock, RecordingOutbox } from './helpers';

function mgr() {
  const clock = new ManualClock();
  const out = new RecordingOutbox();
  const rm = new RoomManager({ outbox: out, clock, onMatchEnd: () => {}, matchTimings: { roleRevealMs: 100 } });
  return { rm, clock, out };
}

const A = DEFAULT_APPEARANCE;

test('create / join / invalid / full', () => {
  const { rm } = mgr();
  const r = rm.create('h', 'Host', A, { maxPlayers: 5 });
  assert.ok(r.ok);
  const code = r.room.code;
  assert.equal(rm.join('x', 'ZZZZZZ', 'X', A).ok, false);
  assert.deepEqual(rm.join('x', 'ZZZZZZ', 'X', A), { ok: false, error: 'ROOM_NOT_FOUND' });
  for (let i = 1; i < 5; i++) assert.ok(rm.join(`p${i}`, code, `P${i}`, A).ok);
  assert.deepEqual(rm.join('p9', code, 'P9', A), { ok: false, error: 'ROOM_FULL' });
  assert.deepEqual(rm.create('p1', 'P1', A), { ok: false, error: 'ALREADY_IN_ROOM' });
});

test('start validation and countdown into role reveal', () => {
  const { rm, clock } = mgr();
  const { room } = rm.create('h', 'Host', A) as { ok: true; room: import('../src/rooms/Room').Room };
  assert.deepEqual(room.requestStart('h'), { ok: false, error: 'NOT_ENOUGH_PLAYERS' });
  for (let i = 1; i < 5; i++) rm.join(`p${i}`, room.code, `P${i}`, A);
  assert.deepEqual(room.requestStart('p1'), { ok: false, error: 'NOT_HOST' });
  assert.deepEqual(room.requestStart('h'), { ok: false, error: 'NOT_ALL_READY' });
  for (let i = 1; i < 5; i++) room.setReady(`p${i}`, true);
  assert.deepEqual(room.updateSettings('h', { catCount: 2 }), { ok: true });
  for (let i = 1; i < 5; i++) room.setReady(`p${i}`, true);
  assert.deepEqual(room.requestStart('h'), { ok: false, error: 'INVALID_CONFIG' }, '2 cats with 5 players');
  room.updateSettings('h', { catCount: 1 });
  for (let i = 1; i < 5; i++) room.setReady(`p${i}`, true);
  assert.deepEqual(room.requestStart('h'), { ok: true });
  assert.equal(room.phase, 'STARTING');
  assert.deepEqual(rm.join('late', room.code, 'Late', A), { ok: false, error: 'GAME_IN_PROGRESS' });
  clock.advance(GAME.START_COUNTDOWN_MS);
  assert.equal(room.phase, 'ROLE_REVEAL');
});

test('leaving during countdown cancels start; host migrates', () => {
  const { rm, out } = mgr();
  const { room } = rm.create('h', 'Host', A) as { ok: true; room: import('../src/rooms/Room').Room };
  for (let i = 1; i < 6; i++) rm.join(`p${i}`, room.code, `P${i}`, A);
  for (let i = 1; i < 6; i++) room.setReady(`p${i}`, true);
  assert.ok(room.requestStart('h').ok);
  rm.leave('h');
  assert.equal(room.phase, 'LOBBY');
  assert.equal(room.hostId, 'p1');
  const snap = out.last<RoomSnapshot>('p2', 'room:updated');
  assert.equal(snap.players.find((p) => p.isHost)?.id, 'p1');
  assert.ok(out.for('p2', 'room:hostChanged').length > 0);
});

test('settings are host-only and bounded', () => {
  const { rm } = mgr();
  const { room } = rm.create('h', 'Host', A) as { ok: true; room: import('../src/rooms/Room').Room };
  rm.join('p1', room.code, 'P1', A);
  assert.deepEqual(room.updateSettings('p1', { killCooldownS: 10 }), { ok: false, error: 'NOT_HOST' });
  assert.deepEqual(room.updateSettings('h', { killCooldownS: 1 }), { ok: false, error: 'INVALID_CONFIG' });
  assert.deepEqual(room.updateSettings('h', { maxPlayers: 1 }), { ok: false, error: 'INVALID_CONFIG' });
});

test('empty room is destroyed', () => {
  const { rm } = mgr();
  const { room } = rm.create('h', 'Host', A) as { ok: true; room: import('../src/rooms/Room').Room };
  rm.leave('h');
  assert.equal(rm.get(room.code), null);
});

test('public room browser: lists only public rooms, joinable first, no player ids', () => {
  const { rm, clock } = mgr();
  const priv = rm.create('a', 'Asha', A) as { ok: true; room: import('../src/rooms/Room').Room };
  const open = rm.create('b', 'Biju', A, { isPublic: true }) as { ok: true; room: import('../src/rooms/Room').Room };
  const full = rm.create('c', 'Chinnu', A, { isPublic: true, maxPlayers: 5 }) as { ok: true; room: import('../src/rooms/Room').Room };
  for (let i = 1; i < 5; i++) rm.join(`c${i}`, full.room.code, `C${i}`, A);
  const playing = rm.create('d', 'Devi', A, { isPublic: true }) as { ok: true; room: import('../src/rooms/Room').Room };
  for (let i = 1; i < 5; i++) rm.join(`d${i}`, playing.room.code, `D${i}`, A);
  for (let i = 1; i < 5; i++) playing.room.setReady(`d${i}`, true);
  assert.ok(playing.room.requestStart('d').ok);
  clock.advance(GAME.START_COUNTDOWN_MS);

  const list = rm.listPublic();
  assert.deepEqual(list.map((r) => [r.hostName, r.status]), [['Biju', 'open'], ['Chinnu', 'full'], ['Devi', 'playing']]);
  assert.ok(!list.some((r) => r.code === priv.room.code), 'private room must not be listed');
  assert.equal(list[0]!.players, 1);
  assert.equal(JSON.stringify(list).includes('"b"'), false, 'no player ids in the listing');
  void open;
});
