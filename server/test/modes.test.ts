import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  GAME,
  InfectionMode,
  HuntMode,
  applySettingsPatch,
  getMap,
  type CameraFeed,
  type GameMode,
  type MapId,
  type RoleInfo,
  type RoomSettings,
  type SelfState,
} from '@nizhal/shared';
import { Match, type MatchSummary } from '../src/game/Match';
import { ManualClock, RecordingOutbox, members } from './helpers';

const TIMINGS = { roleRevealMs: 1000, reportSplashMs: 1000, voteResultMs: 1000, tickMs: 66, reconnectGraceMs: 5000 };

function setup(mapId: MapId, mode: GameMode, n: number, settings: Partial<RoomSettings> = {}) {
  const clock = new ManualClock();
  const out = new RecordingOutbox();
  const ended: MatchSummary[] = [];
  const m = new Match('TEST02', { ...DEFAULT_SETTINGS, mapId, mode, discussionS: 0, votingS: 30, ...settings }, members(n), out, clock, {
    getHostId: () => 'p0',
    onEnd: (s) => ended.push(s),
  }, TIMINGS);
  m.start();
  clock.advance(TIMINGS.roleRevealMs);
  const roles = new Map(members(n).map((p) => [p.id, out.last<RoleInfo>(p.id, 'game:role').role]));
  const cats = [...roles].filter(([, r]) => r === 'CAT').map(([id]) => id);
  const humans = [...roles].filter(([, r]) => r === 'HUMAN').map(([id]) => id);
  return { m, clock, out, cats, humans, ended };
}

/** Put an attacker next to a target at (x, y) and let the first cooldown pass. */
function pair(m: Match, cat: string, human: string, x: number, y: number) {
  m.debugSetPosition(cat, x, y);
  m.debugSetPosition(human, x + 30, y);
}

// ── Infection ────────────────────────────────────────────────────────────
test('infection: configurable starting cats (6 players → 3 Cats)', () => {
  const { cats, humans } = setup('nizhalam', 'infection', 6, { catCount: 3 });
  assert.equal(cats.length, 3);
  assert.equal(humans.length, 3);
});

test('infection: HUMAN → INFECTED (frozen) → CAT, delivered privately', () => {
  const { m, clock, out, cats, humans, ended } = setup('nizhalam', 'infection', 6, { catCount: 2 });
  const [cat] = cats as [string];
  const [victim, bystander] = humans as [string, string];
  clock.advance(GAME.FIRST_KILL_COOLDOWN_MS);
  pair(m, cat, victim, 1050, 900);
  m.debugSetPosition(bystander, 1300, 850);
  out.clear();

  assert.deepEqual(m.kill(cat, victim), { ok: true });
  assert.equal(m.debugBodies().length, 0, 'infection leaves no body');
  const v = m.debugPlayer(victim)!;
  assert.equal(v.role, 'HUMAN');
  assert.ok(v.infection, 'victim is turning');
  assert.ok(out.last<SelfState>(victim, 'game:self').infectedUntil);

  // Turning players are frozen and cannot act.
  m.handleMove(victim, { x: v.x + 10, y: v.y, moving: true, left: false, seq: 1 });
  assert.equal(m.debugPlayer(victim)!.x, 1080);
  assert.deepEqual(m.callEmergency(victim), { ok: false, error: 'NOT_ALLOWED' });

  clock.advance(InfectionMode.infectionTurnMs);
  assert.equal(m.debugPlayer(victim)!.role, 'CAT');
  const changed = out.last<{ role: RoleInfo; reason: string }>(victim, 'game:roleChanged');
  assert.equal(changed.reason, 'infected');
  assert.equal(changed.role.role, 'CAT');
  assert.equal(changed.role.fellowCats.length, 2);
  for (const c of cats) assert.equal(out.last<{ reason: string }>(c, 'game:roleChanged').reason, 'fellow_joined');
  // The new Cat can use Cat abilities (after its cooldown).
  assert.ok(out.last<SelfState>(victim, 'game:self').killReadyAt);

  // A Human who wasn't involved learns nothing.
  const blob = JSON.stringify(out.for(bystander));
  assert.equal(blob.includes('"CAT"'), false);
  assert.equal(out.for(bystander, 'player:infected').length, 0);
  assert.equal(ended.length, 0);
});

test('infection: Cats win once every Human is converted', () => {
  const { m, clock, cats, humans, ended } = setup('nizhalam', 'infection', 6, { catCount: 3 });
  clock.advance(GAME.FIRST_KILL_COOLDOWN_MS);
  const spots = [[950, 820], [1050, 900], [1300, 850]] as const;
  humans.forEach((h, i) => {
    pair(m, cats[i]!, h, spots[i]![0], spots[i]![1]);
    assert.deepEqual(m.kill(cats[i]!, h), { ok: true });
  });
  clock.advance(InfectionMode.infectionTurnMs);
  assert.equal(ended.length, 1);
  assert.equal(ended[0]!.winner, 'CATS');
  assert.equal(ended[0]!.reason, 'all_infected');
  for (const h of humans) assert.equal(ended[0]!.players.find((p) => p.id === h)!.won, true, 'converted players win with the Cats');
});

test('infection: a meeting completes pending conversions first', () => {
  const { m, clock, cats, humans } = setup('nizhalam', 'infection', 6, { catCount: 1 });
  clock.advance(GAME.FIRST_KILL_COOLDOWN_MS);
  const [victim, caller] = humans as [string, string];
  pair(m, cats[0]!, victim, 1050, 900);
  assert.deepEqual(m.kill(cats[0]!, victim), { ok: true });
  const siren = getMap('nizhalam').meetingLocations[0]!;
  m.debugSetPosition(caller, siren.x, siren.y + 35);
  assert.deepEqual(m.callEmergency(caller), { ok: true });
  assert.equal(m.debugPlayer(victim)!.role, 'CAT');
  assert.equal(m.debugPlayer(victim)!.infection, null);
});

test('infection: Humans win by assembling the antidote; Cats cannot collect parts', () => {
  const { m, clock, cats, humans, ended } = setup('nizhalam', 'infection', 6, { catCount: 1 });
  const parts = getMap('nizhalam').objectives;
  const h = humans[0]!;
  m.debugSetPosition(cats[0]!, parts[0]!.x, parts[0]!.y);
  assert.deepEqual(m.startObjective(cats[0]!, parts[0]!.id), { ok: false, error: 'NOT_ALLOWED' });
  for (const part of parts) {
    m.debugSetPosition(h, part.x, part.y);
    assert.deepEqual(m.startObjective(h, part.id), { ok: true });
    assert.deepEqual(m.completeObjective(h, part.id), { ok: false, error: 'TOO_FAST' });
    clock.advance(GAME.OBJECTIVE_MIN_MS);
    assert.deepEqual(m.completeObjective(h, part.id), { ok: true });
  }
  assert.equal(ended[0]?.winner, 'HUMANS');
  assert.equal(ended[0]?.reason, 'antidote');
});

// ── Hunt ─────────────────────────────────────────────────────────────────
test('hunt: no emergency button, faster Cats, Humans win on the survival clock', () => {
  const { m, clock, cats, humans, ended } = setup('backwater_village', 'hunt', 6, { killCooldownS: 20 });
  const bell = getMap('backwater_village').meetingLocations[0]!;
  m.debugSetPosition(humans[0]!, bell.x, bell.y + 35);
  clock.advance(GAME.EMERGENCY_COOLDOWN_AFTER_MEETING_MS);
  assert.deepEqual(m.callEmergency(humans[0]!), { ok: false, error: 'NOT_ALLOWED' });

  clock.advance(GAME.FIRST_KILL_COOLDOWN_MS);
  pair(m, cats[0]!, humans[1]!, 690, 1100);
  assert.deepEqual(m.kill(cats[0]!, humans[1]!), { ok: true });
  assert.equal(m.debugPlayer(cats[0]!)!.killReadyAt - clock.now(), 20_000 * HuntMode.killCooldownMultiplier);

  assert.equal(ended.length, 0);
  clock.advance(HuntMode.survivalMs!);
  assert.equal(ended[0]?.winner, 'HUMANS');
  assert.equal(ended[0]?.reason, 'survived');
});

test('hunt: the survival clock pauses during meetings', () => {
  const { m, clock, cats, humans, out } = setup('backwater_village', 'hunt', 6);
  clock.advance(GAME.FIRST_KILL_COOLDOWN_MS);
  pair(m, cats[0]!, humans[0]!, 690, 1100);
  m.kill(cats[0]!, humans[0]!);
  m.debugSetPosition(humans[1]!, 740, 1100);
  const body = m.debugBodies()[0]!;
  assert.deepEqual(m.report(humans[1]!, body.id), { ok: true });
  const before = out.last<{ modeState: { survivalRemainingMs: number } }>(humans[1]!, 'game:state').modeState.survivalRemainingMs;
  assert.equal(before, HuntMode.survivalMs! - GAME.FIRST_KILL_COOLDOWN_MS);
  clock.advance(60_000); // meeting time does not count
  const during = out.last<{ modeState: { survivalRemainingMs: number; survivalEndsAt: number | null } }>(humans[1]!, 'game:state').modeState;
  assert.equal(during.survivalRemainingMs, before);
});

// ── Future / surveillance ───────────────────────────────────────────────
test('future: an attack seen by a camera alerts the town; blind spots do not', () => {
  const { m, clock, out, cats, humans } = setup('neo_kerala', 'future', 8, { catCount: 2, killCooldownS: 10 });
  clock.advance(GAME.FIRST_KILL_COOLDOWN_MS);
  pair(m, cats[0]!, humans[0]!, 930, 900); // plaza, under CCTV
  out.clear();
  assert.deepEqual(m.kill(cats[0]!, humans[0]!), { ok: true });
  assert.deepEqual(out.last<{ zoneId: string }>(humans[1]!, 'surveillance:alert'), { zoneId: 'nk_plaza' });

  pair(m, cats[1]!, humans[1]!, 120, 300); // deep inside the hyperloop terminal: walls block the camera
  out.clear();
  assert.deepEqual(m.kill(cats[1]!, humans[1]!), { ok: true });
  assert.equal(out.for(humans[2]!, 'surveillance:alert').length, 0);
});

test('classic on a surveillance map raises no alerts', () => {
  const { m, clock, out, cats, humans } = setup('neo_kerala', 'classic', 6);
  clock.advance(GAME.FIRST_KILL_COOLDOWN_MS);
  pair(m, cats[0]!, humans[0]!, 930, 900);
  out.clear();
  m.kill(cats[0]!, humans[0]!);
  assert.equal(out.for(humans[1]!, 'surveillance:alert').length, 0);
});

test('security console: camera feed shows players in view; CCTV sabotage cuts it', () => {
  const { m, clock, out, cats, humans } = setup('kadalimukku_new_town', 'classic', 6);
  const map = getMap('kadalimukku_new_town');
  const console_ = map.securityConsoles[0]!;
  const watcher = humans[0]!;
  const seen = humans[1]!;
  assert.deepEqual(m.setWatchingCameras(watcher, true), { ok: false, error: 'OUT_OF_RANGE' });
  m.debugSetPosition(watcher, console_.x, console_.y + 20);
  m.debugSetPosition(seen, 1300, 760); // junction camera
  assert.deepEqual(m.setWatchingCameras(watcher, true), { ok: true });
  out.clear();
  clock.advance(100);
  const feed = out.last<CameraFeed>(watcher, 'cameras:feed');
  assert.ok(feed.p.some(([id]) => id === seen));
  assert.equal(out.for(seen, 'cameras:feed').length, 0, 'only watchers get the feed');

  clock.advance(GAME.FIRST_SABOTAGE_COOLDOWN_MS);
  assert.deepEqual(m.startSabotage(cats[0]!, 'CCTV_FAILURE'), { ok: true });
  out.clear();
  clock.advance(100);
  assert.equal(out.last<CameraFeed>(watcher, 'cameras:feed').p.length, 0);
});

test('sabotages are limited to what the map has stations for', () => {
  const { m, clock, cats } = setup('backwater_village', 'classic', 6);
  clock.advance(GAME.FIRST_SABOTAGE_COOLDOWN_MS);
  assert.deepEqual(m.startSabotage(cats[0]!, 'CCTV_FAILURE'), { ok: false, error: 'INVALID_ACTION' });
  assert.deepEqual(m.startSabotage(cats[0]!, 'PUMP_FAILURE'), { ok: true });
});

test('hazards slow movement on the server too', () => {
  const { m, clock, humans } = setup('backwater_village', 'classic', 6);
  const h = humans[0]!;
  // Middle of the river ford (shallow water, 0.55× speed).
  m.debugSetPosition(h, 1310, 800);
  clock.advance(300);
  // A full-speed step is rejected inside the ford…
  m.handleMove(h, { x: 1310, y: 800 + GAME.PLAYER_SPEED * 0.3 * 1.3, moving: true, left: false, seq: 1 });
  assert.equal(m.debugPlayer(h)!.y, 800);
  // …while a wading step is accepted.
  clock.advance(300);
  m.handleMove(h, { x: 1310, y: 800 + GAME.PLAYER_SPEED * 0.3 * 0.5, moving: true, left: false, seq: 2 });
  assert.notEqual(m.debugPlayer(h)!.y, 800);
});

// ── Settings compatibility ──────────────────────────────────────────────
test('settings: map and mode stay compatible', () => {
  const base = { ...DEFAULT_SETTINGS, mapId: 'kadalimukku_old_town' as const, mode: 'infection' as const };
  // Switching map alone falls back to the new map's default mode when needed.
  assert.equal(applySettingsPatch(base, { mapId: 'backwater_village' })?.mode, 'hunt');
  assert.equal(applySettingsPatch(base, { mapId: 'neo_kerala' })?.mode, 'infection');
  // An explicit unsupported combination is rejected.
  assert.equal(applySettingsPatch(base, { mode: 'future' }), null);
  assert.equal(applySettingsPatch(base, { mapId: 'backwater_village', mode: 'infection' }), null);
  assert.equal(applySettingsPatch(base, { mapId: 'neo_kerala', mode: 'future' })?.mode, 'future');
});
