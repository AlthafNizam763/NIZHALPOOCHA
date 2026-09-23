import type { GameMapDef, TaskAssignment } from '@nizhal/shared';
import { secureShuffle, shortId } from '../utils/random';

/**
 * Picks `count` distinct stations for a player. Cats receive a list of the same
 * shape (fake tasks) so their HUD looks identical; the server never counts them.
 */
export function assignTasks(map: GameMapDef, count: number): TaskAssignment[] {
  const stations = secureShuffle(map.taskStations).slice(0, Math.min(count, map.taskStations.length));
  return stations.map((s) => ({ id: `t_${shortId()}`, type: s.taskType, stationId: s.id, done: false }));
}
