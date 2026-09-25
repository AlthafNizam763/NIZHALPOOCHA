import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_MAPS,
  ALL_MODES,
  ClassicMode,
  GAME,
  GAME_MODES,
  HuntMode,
  InfectionMode,
  SABOTAGE_DEFS,
  TASK_DEFS,
  availableSabotages,
  catLimits,
  catLimitsFor,
  isBlocked,
  isValidCatCount,
  isValidCatCountFor,
  mapSupportsMode,
  repairStationsFor,
  spawnPoints,
  zoneAt,
  type GameMapDef,
  type Rect,
  type WinInput,
} from '@nizhal/shared';
import { resolveVotes } from '../src/voting/resolveVotes';

test('vote resolution: majority, tie, skip, none', () => {
  assert.deepEqual(resolveVotes(new Map()).outcome, 'no_votes');
  const maj = resolveVotes(new Map([['a', 'c'], ['b', 'c'], ['c', 'a']]));
  assert.equal(maj.outcome, 'ejected');
  assert.equal(maj.ejectedId, 'c');
  const tie = resolveVotes(new Map([['a', 'c'], ['b', 'a'], ['c', 'skip'], ['d', 'skip'], ['e', 'c']]));
  assert.equal(tie.outcome, 'tie');
  assert.equal(tie.ejectedId, null);
  const skip = resolveVotes(new Map([['a', 'skip'], ['b', 'skip'], ['c', 'a']]));
  assert.equal(skip.outcome, 'skipped');
});

const H = (alive = true) => ({ role: 'HUMAN' as const, alive });
const C = (alive = true) => ({ role: 'CAT' as const, alive });
const win = (players: WinInput['players'], extra: Partial<WinInput> = {}): WinInput => ({
  players,
  tasksDone: 0,
  tasksTotal: 10,
  antidote: null,
  survivalExpired: false,
  ...extra,
});

test('classic win conditions', () => {
  assert.equal(ClassicMode.evaluateWin(win([H(), H(), H(), C(false)]))?.winner, 'HUMANS');
  assert.equal(ClassicMode.evaluateWin(win([H(), H(), C()], { tasksDone: 10 }))?.reason, 'tasks_completed');
  assert.equal(ClassicMode.evaluateWin(win([H(), H(false), C()]))?.reason, 'parity');
  assert.equal(ClassicMode.evaluateWin(win([H(), H(), H(), C()], { tasksDone: 3 })), null);
});

test('hunt: surviving the clock wins for Humans', () => {
  assert.equal(HuntMode.evaluateWin(win([H(), H(), H(), C()])), null);
  assert.equal(HuntMode.evaluateWin(win([H(), H(), H(), C()], { survivalExpired: true }))?.reason, 'survived');
  assert.equal(HuntMode.evaluateWin(win([H(), H(false), C()]))?.reason, 'parity');
});

test('infection: no parity; Cats must convert everyone; antidote and escape win for Humans', () => {
  // 3 Cats vs 3 Humans is not over in Infection.
  assert.equal(InfectionMode.evaluateWin(win([H(), H(), H(), C(), C(), C()])), null);
  assert.equal(InfectionMode.evaluateWin(win([C(), C(), C(), C()]))?.reason, 'all_infected');
  assert.equal(InfectionMode.evaluateWin(win([H(), C()], { tasksDone: 10 }))?.reason, 'escaped');
  assert.equal(InfectionMode.evaluateWin(win([H(), C()], { antidote: { collected: 4, total: 4 } }))?.reason, 'antidote');
  assert.equal(InfectionMode.evaluateWin(win([H(), C()], { antidote: { collected: 3, total: 4 } })), null);
  assert.equal(InfectionMode.evaluateWin(win([H(), C()], { survivalExpired: true }))?.reason, 'survived');
  assert.equal(InfectionMode.evaluateWin(win([H(), C(false)]))?.reason, 'cats_eliminated');
});

test('cat count limits by player count and mode', () => {
  assert.deepEqual([catLimits(5).min, catLimits(5).max], [1, 1]);
  assert.deepEqual([catLimits(8).min, catLimits(8).max], [1, 2]);
  assert.deepEqual([catLimits(12).min, catLimits(12).max], [2, 3]);
  assert.equal(isValidCatCount(5, 2), false);
  assert.equal(isValidCatCount(4, 1), false);
  assert.equal(isValidCatCount(11, 1), false);
  assert.equal(isValidCatCount(15, 3), true);
  // Infection: configurable up to half the room.
  assert.equal(catLimitsFor('infection', 6).max, 3);
  assert.equal(isValidCatCountFor('infection', 6, 3), true);
  assert.equal(isValidCatCountFor('infection', 6, 4), false);
  assert.equal(isValidCatCountFor('infection', 10, 5), true);
  assert.equal(isValidCatCountFor('classic', 6, 3), false);
});

/** Flood fill on a coarse grid to prove every interactable is reachable from spawn. */
function reachableGrid(map: GameMapDef, colliders: readonly Rect[]) {
  const cell = 8;
  const cols = Math.floor(map.width / cell);
  const rows = Math.floor(map.height / cell);
  const seen = new Uint8Array(cols * rows);
  const ok = (cx: number, cy: number) => {
    const x = cx * cell + cell / 2;
    const y = cy * cell + cell / 2;
    return (
      x >= GAME.PLAYER_HALF && y >= GAME.PLAYER_HALF && x <= map.width - GAME.PLAYER_HALF && y <= map.height - GAME.PLAYER_HALF &&
      !isBlocked(x, y, GAME.PLAYER_HALF, colliders)
    );
  };
  const sx = Math.floor(map.spawn.x / cell);
  const sy = Math.floor(map.spawn.y / cell);
  const queue = [[sx, sy]];
  seen[sy * cols + sx] = 1;
  while (queue.length) {
    const [cx, cy] = queue.pop()!;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx! + dx!;
      const ny = cy! + dy!;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows || seen[ny * cols + nx] || !ok(nx, ny)) continue;
      seen[ny * cols + nx] = 1;
      queue.push([nx, ny]);
    }
  }
  return (x: number, y: number, range: number) => {
    for (let cy = 0; cy < rows; cy++)
      for (let cx = 0; cx < cols; cx++)
        if (seen[cy * cols + cx] && Math.hypot(cx * cell + cell / 2 - x, cy * cell + cell / 2 - y) <= range) return true;
    return false;
  };
}

for (const MAP of ALL_MAPS) {
  test(`map ${MAP.id}: spawns are free and every interactable is reachable`, () => {
    for (const p of spawnPoints(MAP, GAME.MAX_PLAYERS)) assert.equal(isBlocked(p.x, p.y, GAME.PLAYER_HALF, MAP.colliders), false, `spawn ${p.x},${p.y}`);
    const reach = reachableGrid(MAP, MAP.colliders);
    const R = GAME.INTERACT_RANGE - 10;
    for (const s of MAP.taskStations) assert.ok(reach(s.x, s.y, R), `task station ${s.id} unreachable`);
    for (const s of MAP.sabotageStations) assert.ok(reach(s.x, s.y, R), `sabotage station ${s.id} unreachable`);
    for (const o of MAP.objectives) assert.ok(reach(o.x, o.y, R), `objective ${o.id} unreachable`);
    for (const c of MAP.securityConsoles) assert.ok(reach(c.x, c.y, R), `console ${c.id} unreachable`);
    for (const l of MAP.meetingLocations) assert.ok(reach(l.x, l.y, GAME.EMERGENCY_RANGE - 10), `meeting location ${l.id} unreachable`);
    for (const z of MAP.zones) assert.ok(reach(z.x + z.w / 2, z.y + z.h / 2, Math.max(z.w, z.h) / 2), `zone ${z.id} unreachable`);
  });

  test(`map ${MAP.id}: definition is consistent`, () => {
    assert.ok(MAP.meetingLocations.length > 0, 'needs a meeting location');
    assert.ok(MAP.taskStations.length >= 8, 'needs enough task stations for 8 tasks per player');
    assert.ok(MAP.supportedModes.length > 0);
    for (const mode of MAP.supportedModes) assert.ok(mapSupportsMode(MAP, mode), `${mode} lacks required map features`);
    const ids = [...MAP.taskStations, ...MAP.sabotageStations, ...MAP.objectives].map((s) => s.id);
    assert.equal(new Set(ids).size, ids.length, 'duplicate station ids');
    const zoneIds = new Set(MAP.zones.map((z) => z.id));
    for (const s of [...MAP.taskStations, ...MAP.sabotageStations, ...MAP.objectives, ...MAP.meetingLocations, ...MAP.securityConsoles]) {
      assert.ok(zoneIds.has(s.zoneId), `${s.id} has unknown zone ${s.zoneId}`);
      assert.equal(zoneAt(MAP, s), s.zoneId, `${s.id} is not inside its zone`);
    }
    for (const s of MAP.taskStations) assert.ok(TASK_DEFS[s.taskType]);
    // Every available sabotage can actually be repaired on this map.
    for (const type of availableSabotages(MAP)) {
      if (SABOTAGE_DEFS[type].repairMode !== 'none') assert.ok(repairStationsFor(MAP, type).length > 0, type);
    }
    assert.ok(availableSabotages(MAP).includes('POWER_FAILURE'));
  });
}

test('every mode is playable on at least one map', () => {
  assert.equal(ALL_MODES.length, GAME_MODES.length);
  for (const mode of GAME_MODES) assert.ok(ALL_MAPS.some((m) => mapSupportsMode(m, mode)), mode);
  assert.equal(ALL_MAPS.length >= 5, true);
});
