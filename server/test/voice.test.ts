import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_APPEARANCE, GAME, voiceChannelFor, type RoleInfo, type VoiceRoster, type VoiceSignal } from '@nizhal/shared';
import { RoomManager } from '../src/rooms/RoomManager';
import type { Room } from '../src/rooms/Room';
import { ManualClock, RecordingOutbox } from './helpers';

const OFFER: VoiceSignal = { type: 'offer', sdp: 'v=0' };
const A = DEFAULT_APPEARANCE;

function lobby(n = 5) {
  const clock = new ManualClock();
  const out = new RecordingOutbox();
  const rm = new RoomManager({ outbox: out, clock, onMatchEnd: () => {}, matchTimings: { roleRevealMs: 100, reportSplashMs: 100, voteResultMs: 100 } });
  const { room } = rm.create('p0', 'P0', A, { discussionS: 0 }) as { ok: true; room: Room };
  for (let i = 1; i < n; i++) rm.join(`p${i}`, room.code, `P${i}`, A);
  const ids = Array.from({ length: n }, (_, i) => `p${i}`);
  const roster = (id: string) => out.last<VoiceRoster>(id, 'voice:roster');
  return { rm, room, clock, out, ids, roster };
}

function startMatch(ctx: ReturnType<typeof lobby>) {
  for (const id of ctx.ids.slice(1)) ctx.room.setReady(id, true);
  assert.ok(ctx.room.requestStart('p0').ok);
  ctx.clock.advance(GAME.START_COUNTDOWN_MS);
  ctx.clock.advance(100); // role reveal → PLAYING
  assert.equal(ctx.room.phase, 'PLAYING');
  const cat = ctx.ids.find((id) => ctx.out.last<RoleInfo>(id, 'game:role').role === 'CAT')!;
  const humans = ctx.ids.filter((id) => id !== cat);
  return { cat, humans };
}

test('channel rules', () => {
  assert.equal(voiceChannelFor('LOBBY', false, undefined), 'lobby');
  assert.equal(voiceChannelFor('PLAYING', true, true), null);
  assert.equal(voiceChannelFor('PLAYING', true, false), 'dead');
  assert.equal(voiceChannelFor('MEETING', true, true), 'meeting');
  assert.equal(voiceChannelFor('VOTING', true, true), 'meeting');
  assert.equal(voiceChannelFor('RESULT', true, true), 'meeting');
  assert.equal(voiceChannelFor('REPORT', true, true), null);
  assert.equal(voiceChannelFor('VOTING', true, false), 'dead');
});

test('lobby: everyone who joined voice hears each other; relay works', () => {
  const c = lobby(3);
  for (const id of c.ids) assert.deepEqual(c.room.voiceJoin(id), { ok: true });
  const r = c.roster('p0');
  assert.equal(r.channel, 'lobby');
  assert.deepEqual(r.peers.map((p) => p.id).sort(), ['p1', 'p2']);
  assert.equal(c.room.voiceSignal('p0', 'p1', OFFER), true);
  assert.equal(c.out.last<{ from: string }>('p1', 'voice:signal').from, 'p0');
  assert.equal(c.room.voiceSignal('p0', 'p0', OFFER), false, 'no self-signal');
  assert.equal(c.room.voiceSignal('p0', 'stranger', OFFER), false, 'no signalling outside the room');
});

test('players who have not opted in are not peers', () => {
  const c = lobby(3);
  c.room.voiceJoin('p0');
  c.room.voiceJoin('p1');
  assert.deepEqual(c.roster('p0').peers.map((p) => p.id), ['p1']);
  assert.equal(c.room.voiceSignal('p0', 'p2', OFFER), false);
  assert.equal(c.out.for('p2', 'voice:roster').length, 0, 'non-participants receive no roster');
});

test('mute state is shared with peers', () => {
  const c = lobby(2);
  c.room.voiceJoin('p0');
  c.room.voiceJoin('p1');
  c.room.voiceMute('p1', true);
  assert.deepEqual(c.roster('p0').peers, [{ id: 'p1', muted: true }]);
});

test('match: silent while playing, meeting voice for the living, ghost voice for the dead', () => {
  const c = lobby(5);
  for (const id of c.ids) c.room.voiceJoin(id);
  const { cat, humans } = startMatch(c);
  const [victim, reporter, h2] = humans as [string, string, string];

  // Living players have no channel during play and cannot signal anyone.
  for (const id of c.ids) {
    assert.equal(c.roster(id).channel, null);
    assert.equal(c.roster(id).peers.length, 0);
  }
  assert.equal(c.room.voiceSignal(cat, reporter, OFFER), false, 'no voice during play');

  // Kill → the victim moves to the ghost channel; the living still hear nothing.
  const m = c.room.match!;
  c.clock.advance(GAME.FIRST_KILL_COOLDOWN_MS);
  m.debugSetPosition(cat, 1200, 760);
  m.debugSetPosition(victim, 1230, 760);
  const before = c.out.for(reporter, 'voice:roster').length;
  assert.ok(m.kill(cat, victim).ok);
  assert.equal(c.roster(victim).channel, 'dead');
  assert.equal(c.out.for(reporter, 'voice:roster').length, before, 'living players get no voice update that would reveal a death');

  // Meeting → living players share the meeting channel; the dead are never included.
  m.debugSetPosition(reporter, 1240, 790);
  assert.ok(m.report(reporter, m.debugBodies()[0]!.id).ok);
  c.clock.advance(100); // REPORT splash → MEETING/VOTING
  const meetingIds = c.roster(reporter).peers.map((p) => p.id).sort();
  assert.equal(c.roster(reporter).channel, 'meeting');
  assert.deepEqual(meetingIds, [cat, h2, humans[3]!].sort());
  assert.ok(!meetingIds.includes(victim));
  assert.equal(c.room.voiceSignal(victim, reporter, OFFER), false, 'the dead cannot reach the living');
  assert.equal(c.room.voiceSignal(reporter, victim, OFFER), false, 'the living cannot reach the dead');
  assert.equal(c.room.voiceSignal(reporter, h2, OFFER), true);
});

test('host can turn voice off; joining is then refused', () => {
  const c = lobby(2);
  c.room.voiceJoin('p0');
  c.room.voiceJoin('p1');
  assert.ok(c.room.updateSettings('p0', { voiceChat: false }).ok);
  assert.equal(c.roster('p1').enabled, false);
  assert.equal(c.roster('p1').peers.length, 0);
  assert.deepEqual(c.room.voiceJoin('p1'), { ok: false, error: 'NOT_ALLOWED' });
});

test('disconnected and removed players drop out of voice', () => {
  const c = lobby(3);
  for (const id of c.ids) c.room.voiceJoin(id);
  c.room.handleDisconnect('p2');
  assert.deepEqual(c.roster('p0').peers.map((p) => p.id), ['p1']);
  c.rm.leave('p1');
  assert.deepEqual(c.roster('p0').peers, []);
});
