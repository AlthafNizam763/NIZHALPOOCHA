import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GAME,
  KADALIMUKKU_NIGHT as MAP,
  catLimits,
  isBlocked,
  isValidCatCount,
  spawnPoints,
  type Rect,
} from '@nizhal/shared';
import { resolveVotes } from '../src/voting/resolveVotes';
import { evaluateWin } from '../src/game/winConditions';

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

test('win conditions', () => {
  const H = (alive = true) => ({ role: 'HUMAN' as const, alive });
  const C = (alive = true) => ({ role: 'CAT' as const, alive });
  assert.equal(evaluateWin({ players: [H(), H(), H(), C(false)], tasksDone: 0, tasksTotal: 10 })?.winner, 'HUMANS');
  assert.equal(evaluateWin({ players: [H(), H(), C()], tasksDone: 10, tasksTotal: 10 })?.reason, 'tasks_completed');
  assert.equal(evaluateWin({ players: [H(), H(false), C()], tasksDone: 0, tasksTotal: 10 })?.reason, 'parity');
  assert.equal(evaluateWin({ players: [H(), H(), H(), C()], tasksDone: 3, tasksTotal: 10 }), null);
});

test('cat count limits by player count', () => {
  assert.deepEqual([catLimits(5).min, catLimits(5).max], [1, 1]);
  assert.deepEqual([catLimits(8).min, catLimits(8).max], [1, 2]);
  assert.deepEqual([catLimits(12).min, catLimits(12).max], [2, 3]);
  assert.equal(isValidCatCount(5, 2), false);
  assert.equal(isValidCatCount(4, 1), false);
  assert.equal(isValidCatCount(11, 1), false);
  assert.equal(isValidCatCount(15, 3), true);
});

/** Flood fill on a coarse grid to prove every interactable is reachable from spawn. */
function reachableGrid(colliders: readonly Rect[]) {
  const cell = 8;
  const cols = Math.floor(MAP.width / cell);
  const rows = Math.floor(MAP.height / cell);
  const seen = new Uint8Array(cols * rows);
  const ok = (cx: number, cy: number) => {
    const x = cx * cell + cell / 2;
    const y = cy * cell + cell / 2;
    return (
      x >= GAME.PLAYER_HALF && y >= GAME.PLAYER_HALF && x <= MAP.width - GAME.PLAYER_HALF && y <= MAP.height - GAME.PLAYER_HALF &&
      !isBlocked(x, y, GAME.PLAYER_HALF, colliders)
    );
  };
  const sx = Math.floor(MAP.spawn.x / cell);
  const sy = Math.floor(MAP.spawn.y / cell);
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

test('map: spawns are free and every station is reachable within interact range', () => {
  for (const p of spawnPoints(MAP, GAME.MAX_PLAYERS)) assert.equal(isBlocked(p.x, p.y, GAME.PLAYER_HALF, MAP.colliders), false, `spawn ${p.x},${p.y}`);
  const reach = reachableGrid(MAP.colliders);
  for (const s of MAP.taskStations) assert.ok(reach(s.x, s.y, GAME.INTERACT_RANGE - 10), `task station ${s.id} unreachable`);
  for (const s of MAP.sabotageStations) assert.ok(reach(s.x, s.y, GAME.INTERACT_RANGE - 10), `sabotage station ${s.id} unreachable`);
  assert.ok(reach(MAP.emergency.x, MAP.emergency.y, GAME.EMERGENCY_RANGE - 10), 'emergency bell unreachable');
  for (const z of MAP.zones) assert.ok(reach(z.x + z.w / 2, z.y + z.h / 2, Math.max(z.w, z.h) / 2), `zone ${z.id} unreachable`);
});
