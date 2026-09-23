import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_SETTINGS,
  GAME,
  KADALIMUKKU_NIGHT as MAP,
  TASK_DEFS,
  type GameEndView,
  type GameStateView,
  type RoleInfo,
  type SelfState,
} from '@nizhal/shared';
import { Match } from '../src/game/Match';
import { ManualClock, RecordingOutbox, members } from './helpers';

const TIMINGS = { roleRevealMs: 1000, reportSplashMs: 1000, voteResultMs: 1000, tickMs: 66, reconnectGraceMs: 5000 };

function setup(n = 5, settings = {}) {
  const clock = new ManualClock();
  const out = new RecordingOutbox();
  const ended: unknown[] = [];
  const m = new Match('TEST01', { ...DEFAULT_SETTINGS, discussionS: 0, votingS: 30, ...settings }, members(n), out, clock, {
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

test('roles: correct cat count and private delivery only', () => {
  const { out, cats, humans } = setup(5);
  assert.equal(cats.length, 1);
  assert.equal(humans.length, 4);
  for (const h of humans) {
    const info = out.last<RoleInfo>(h, 'game:role');
    assert.equal(info.fellowCats.length, 0);
    // Nothing a human received before the match ends may mention the Cat role.
    const blob = JSON.stringify(out.for(h).filter((s) => s.event !== 'game:ended'));
    assert.equal(blob.includes('"CAT"'), false, 'human received CAT information');
  }
});

test('multiple cats know each other; humans do not', () => {
  const { out, cats, humans } = setup(10, { catCount: 2 });
  assert.equal(cats.length, 2);
  const info = out.last<RoleInfo>(cats[0]!, 'game:role');
  assert.deepEqual(info.fellowCats.map((c) => c.id), [cats[1]]);
  for (const h of humans) assert.equal(out.last<RoleInfo>(h, 'game:role').fellowCats.length, 0);
});

test('kill validation: role, cooldown, range, target', () => {
  const { m, clock, cats, humans } = setup(5);
  const cat = cats[0]!;
  const [h1, h2] = humans as [string, string];
  m.debugSetPosition(cat, 1200, 760);
  m.debugSetPosition(h1, 1230, 760);
  m.debugSetPosition(h2, 1500, 760);

  assert.deepEqual(m.kill(h1, h2), { ok: false, error: 'NOT_ALLOWED' }, 'human cannot kill');
  assert.deepEqual(m.kill(cat, h1), { ok: false, error: 'COOLDOWN' }, 'first cooldown');
  clock.advance(GAME.FIRST_KILL_COOLDOWN_MS);
  assert.deepEqual(m.kill(cat, h2), { ok: false, error: 'OUT_OF_RANGE' });
  assert.deepEqual(m.kill(cat, cat), { ok: false, error: 'INVALID_TARGET' });
  assert.deepEqual(m.kill(cat, 'nobody'), { ok: false, error: 'INVALID_TARGET' });
  assert.deepEqual(m.kill(cat, h1), { ok: true });
  assert.deepEqual(m.kill(cat, h1), { ok: false, error: 'INVALID_TARGET' }, 'already dead');
  m.debugSetPosition(h2, 1230, 760);
  assert.deepEqual(m.kill(cat, h2), { ok: false, error: 'COOLDOWN' }, 'cooldown after kill');
  assert.equal(m.debugBodies().length, 1);
});

test('cannot kill through a wall', () => {
  const { m, clock, cats, humans } = setup(5);
  clock.advance(GAME.FIRST_KILL_COOLDOWN_MS);
  // School south wall spans y 404..420 at x 80..330; stand on either side of it.
  m.debugSetPosition(cats[0]!, 200, 440);
  m.debugSetPosition(humans[0]!, 200, 385);
  assert.deepEqual(m.kill(cats[0]!, humans[0]!), { ok: false, error: 'OUT_OF_RANGE' });
});

test('deaths stay hidden from the living until a meeting', () => {
  const { m, clock, out, cats, humans } = setup(5);
  clock.advance(GAME.FIRST_KILL_COOLDOWN_MS);
  const [victim, witness, far] = humans as [string, string, string];
  m.debugSetPosition(cats[0]!, 1200, 760);
  m.debugSetPosition(victim, 1230, 760);
  m.debugSetPosition(far, 300, 1400);
  out.clear();
  assert.equal(m.kill(cats[0]!, victim).ok, true);
  assert.equal(out.for(far, 'player:killed').length, 0, 'bystander was told about the kill');
  assert.equal(out.for(far, 'game:state').length, 0, 'bystander got a state push revealing timing');
  assert.equal(out.last<{ you: boolean }>(victim, 'player:killed').you, true);
  assert.equal(out.last<SelfState>(victim, 'game:self').alive, false);

  // Far player's snapshot must not contain the body.
  clock.advance(100);
  const snap = out.last<{ b: unknown[] }>(far, 'game:snapshot');
  assert.equal(snap.b.length, 0);

  // Witness near the body reports → deaths revealed to everyone.
  m.debugSetPosition(witness, 1240, 800);
  const body = m.debugBodies()[0]!;
  assert.deepEqual(m.report(witness, body.id), { ok: true });
  const st = out.last<GameStateView>(far, 'game:state');
  assert.equal(st.phase, 'REPORT');
  assert.equal(st.players.find((p) => p.id === victim)?.status, 'dead');
});

test('meeting → voting → eject cat → humans win', () => {
  const { m, clock, out, cats, humans, ended } = setup(5);
  m.debugSetPosition(humans[0]!, MAP.emergency.x, MAP.emergency.y + 30);
  assert.deepEqual(m.callEmergency(humans[0]!), { ok: false, error: 'COOLDOWN' });
  clock.advance(GAME.EMERGENCY_COOLDOWN_AFTER_MEETING_MS);
  assert.deepEqual(m.callEmergency(humans[0]!), { ok: true });
  assert.equal(m.phase, 'REPORT');
  assert.deepEqual(m.castVote(humans[0]!, cats[0]!), { ok: false, error: 'INVALID_PHASE' });
  clock.advance(TIMINGS.reportSplashMs); // discussionS = 0 → MEETING immediately rolls into VOTING
  assert.equal(m.phase, 'VOTING');

  for (const h of humans) assert.deepEqual(m.castVote(h, cats[0]!), { ok: true });
  assert.deepEqual(m.castVote(humans[0]!, cats[0]!), { ok: false, error: 'ALREADY_VOTED' });
  assert.deepEqual(m.castVote(cats[0]!, 'ghost'), { ok: false, error: 'INVALID_TARGET' });
  assert.deepEqual(m.castVote(cats[0]!, 'skip'), { ok: true }); // last vote resolves early
  assert.equal(m.phase, 'RESULT');
  const result = out.last<{ ejectedId: string; ejectedRole: string }>(humans[1]!, 'vote:result');
  assert.equal(result.ejectedId, cats[0]);
  assert.equal(result.ejectedRole, 'CAT');
  clock.advance(TIMINGS.voteResultMs);
  assert.equal(m.phase, 'FINISHED');
  assert.equal(ended.length, 1);
  const end = out.last<GameEndView>(humans[0]!, 'game:ended');
  assert.equal(end.winner, 'HUMANS');
  assert.equal(end.you.won, true);
  assert.ok(end.you.xp > 0);
});

test('tie vote ejects nobody and play resumes with teleport', () => {
  const { m, clock, out, cats, humans } = setup(5);
  clock.advance(GAME.EMERGENCY_COOLDOWN_AFTER_MEETING_MS);
  m.debugSetPosition(humans[0]!, MAP.emergency.x, MAP.emergency.y + 30);
  m.callEmergency(humans[0]!);
  clock.advance(TIMINGS.reportSplashMs + 1);
  const [a, b, c, d] = humans as [string, string, string, string];
  m.castVote(a, b);
  m.castVote(b, a);
  m.castVote(c, 'skip');
  m.castVote(d, 'skip');
  m.castVote(cats[0]!, a);
  // a:2, skip:2 → tie
  assert.equal(out.last<{ outcome: string }>(a, 'vote:result').outcome, 'tie');
  const seqBefore = out.last<SelfState>(a, 'game:self').teleportSeq;
  clock.advance(TIMINGS.voteResultMs);
  assert.equal(m.phase, 'PLAYING');
  assert.ok(out.last<SelfState>(a, 'game:self').teleportSeq > seqBefore);
});

test('cats win on parity', () => {
  const { m, clock, out, cats, humans } = setup(5);
  const cat = cats[0]!;
  for (let i = 0; i < 3; i++) {
    clock.advance(Math.max(GAME.FIRST_KILL_COOLDOWN_MS, DEFAULT_SETTINGS.killCooldownS * 1000));
    m.debugSetPosition(cat, 1200, 760);
    m.debugSetPosition(humans[i]!, 1230, 760);
    assert.deepEqual(m.kill(cat, humans[i]!), { ok: true }, `kill ${i}`);
  }
  assert.equal(m.phase, 'FINISHED');
  assert.equal(out.last<GameEndView>(cat, 'game:ended').winner, 'CATS');
});

test('task validation: range, timing, role', () => {
  const { m, clock, out, cats, humans } = setup(5);
  const h = humans[0]!;
  const self = out.last<SelfState>(h, 'game:self');
  const task = self.tasks[0]!;
  const station = MAP.taskStations.find((s) => s.id === task.stationId)!;
  assert.deepEqual(m.startTask(h, task.id), { ok: false, error: 'OUT_OF_RANGE' });
  m.debugSetPosition(h, station.x, station.y);
  assert.deepEqual(m.completeTask(h, task.id), { ok: false, error: 'INVALID_ACTION' }, 'complete without start');
  assert.deepEqual(m.startTask(h, task.id), { ok: true });
  assert.deepEqual(m.completeTask(h, task.id), { ok: false, error: 'TOO_FAST' });
  clock.advance(TASK_DEFS[task.type].minDurationMs);
  assert.deepEqual(m.completeTask(h, task.id), { ok: true });
  assert.deepEqual(m.completeTask(h, task.id), { ok: false, error: 'ALREADY_DONE' });

  const catTask = out.last<SelfState>(cats[0]!, 'game:self').tasks[0]!;
  assert.deepEqual(m.startTask(cats[0]!, catTask.id), { ok: false, error: 'NOT_ALLOWED' }, 'cat tasks are fake');
  assert.deepEqual(m.startTask(h, catTask.id), { ok: false, error: 'INVALID_TARGET' }, "cannot do another player's task");
});

test('all tasks completed → humans win', () => {
  const { m, clock, out, humans } = setup(5, { tasksPerPlayer: 2 });
  for (const h of humans) {
    for (const t of out.last<SelfState>(h, 'game:self').tasks) {
      const st = MAP.taskStations.find((s) => s.id === t.stationId)!;
      m.debugSetPosition(h, st.x, st.y);
      assert.equal(m.startTask(h, t.id).ok, true);
      clock.advance(TASK_DEFS[t.type].minDurationMs);
      assert.equal(m.completeTask(h, t.id).ok, true);
    }
  }
  assert.equal(m.phase, 'FINISHED');
  assert.equal(out.last<GameEndView>(humans[0]!, 'game:ended').reason, 'tasks_completed');
});

test('movement: speed hacks and wall clipping are rejected', () => {
  const { m, clock, humans } = setup(5);
  const h = humans[0]!;
  const start = { ...m.debugPlayer(h)! };
  clock.advance(66);
  m.handleMove(h, { x: start.x + 400, y: start.y, moving: true, left: false, seq: 1 });
  assert.equal(m.debugPlayer(h)!.x, start.x, 'teleport accepted');
  clock.advance(66);
  m.handleMove(h, { x: start.x + 10, y: start.y, moving: true, left: false, seq: 2 });
  assert.equal(m.debugPlayer(h)!.x, start.x + 10, 'legal step rejected');
  // Stand just below the school's south wall and try to step through it.
  m.debugSetPosition(h, 200, 434);
  clock.advance(200);
  m.handleMove(h, { x: 200, y: 400, moving: true, left: false, seq: 3 });
  assert.equal(m.debugPlayer(h)!.y, 434, 'walked through wall');
});

test('sabotage: cooldown, cat-only, repair, critical timeout', () => {
  const { m, clock, out, cats, humans } = setup(5);
  const cat = cats[0]!;
  assert.deepEqual(m.startSabotage(humans[0]!, 'POWER_FAILURE'), { ok: false, error: 'NOT_ALLOWED' });
  assert.deepEqual(m.startSabotage(cat, 'POWER_FAILURE'), { ok: false, error: 'COOLDOWN' });
  clock.advance(GAME.FIRST_SABOTAGE_COOLDOWN_MS);
  assert.deepEqual(m.startSabotage(cat, 'POWER_FAILURE'), { ok: true });
  assert.equal(out.last<SelfState>(humans[0]!, 'game:self').visionRadius, GAME.VISION_POWER_OUT);
  assert.equal(out.last<SelfState>(cat, 'game:self').visionRadius, GAME.VISION_CAT);

  const panel = MAP.sabotageStations.find((s) => s.id === 'power_panel')!;
  m.debugSetPosition(humans[0]!, panel.x, panel.y + 10);
  assert.deepEqual(m.startRepair(humans[0]!, 'power_panel'), { ok: true });
  clock.advance(1500);
  assert.deepEqual(m.completeRepair(humans[0]!, 'power_panel'), { ok: true });
  assert.equal(out.last<SelfState>(humans[0]!, 'game:self').visionRadius, GAME.VISION_HUMAN);

  clock.advance(GAME.SABOTAGE_COOLDOWN_MS);
  assert.deepEqual(m.startSabotage(cat, 'PUMP_FAILURE'), { ok: true });
  assert.deepEqual(m.startSabotage(cat, 'COMMS_FAILURE'), { ok: false, error: 'COOLDOWN' });
  clock.advance(60_000);
  assert.equal(m.phase, 'FINISHED');
  assert.equal(out.last<GameEndView>(cat, 'game:ended').reason, 'critical_sabotage');
});

test('dead chat never reaches the living', () => {
  const { m, clock, out, cats, humans } = setup(5);
  clock.advance(GAME.FIRST_KILL_COOLDOWN_MS);
  m.debugSetPosition(cats[0]!, 1200, 760);
  m.debugSetPosition(humans[0]!, 1230, 760);
  m.kill(cats[0]!, humans[0]!);
  m.debugSetPosition(humans[1]!, 1240, 790);
  m.report(humans[1]!, m.debugBodies()[0]!.id);
  clock.advance(TIMINGS.reportSplashMs + 1);
  out.clear();
  assert.deepEqual(m.sendChat(humans[0]!, { text: 'it was them!' }), { ok: true });
  assert.equal(out.for(humans[1]!, 'meeting:chat').length, 0);
  assert.equal(out.for(humans[0]!, 'meeting:chat').length, 1);
  assert.deepEqual(m.castVote(humans[0]!, cats[0]!), { ok: false, error: 'NOT_ALLOWED' }, 'dead cannot vote');
  clock.advance(GAME.CHAT_MIN_INTERVAL_MS);
  assert.deepEqual(m.sendChat(humans[1]!, { quickId: 'where_body' }), { ok: true });
  assert.equal(out.for(humans[2]!, 'meeting:chat').length, 1);
  assert.deepEqual(m.sendChat(humans[1]!, { text: 'spam' }), { ok: false, error: 'RATE_LIMITED' });
});

test('disconnect grace then leave triggers win check', () => {
  const { m, clock, out, cats } = setup(5);
  m.setConnected(cats[0]!, false);
  assert.equal(m.phase, 'PLAYING');
  clock.advance(TIMINGS.reconnectGraceMs);
  assert.equal(m.phase, 'FINISHED');
  const anyHuman = [...out.sent].find((s) => s.event === 'game:ended' && s.to !== cats[0])!;
  assert.equal((anyHuman.payload as GameEndView).winner, 'HUMANS');
});

test('reconnect inside grace keeps the player in the match', () => {
  const { m, clock, humans } = setup(5);
  m.setConnected(humans[0]!, false);
  clock.advance(TIMINGS.reconnectGraceMs - 100);
  m.setConnected(humans[0]!, true);
  clock.advance(1000);
  assert.equal(m.debugPlayer(humans[0]!)!.status, 'alive');
  const resume = m.resumeFor(humans[0]!);
  assert.ok(resume?.self && resume.role && resume.state);
});
