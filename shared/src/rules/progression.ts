import type { PlayerMatchStats } from '../types';

/** XP needed to go from level n to n+1. */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 50;
}

export function levelFromXp(totalXp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level++;
  }
  return { level, into: remaining, needed: xpForLevel(level) };
}

export function matchRewards(p: { won: boolean; survived: boolean; stats: PlayerMatchStats }): { xp: number; coins: number } {
  const s = p.stats;
  const xp =
    20 +
    (p.won ? 50 : 0) +
    (p.survived ? 10 : 0) +
    s.tasksDone * 5 +
    s.kills * 10 +
    s.infections * 10 +
    s.objectives * 10 +
    s.correctVotes * 10 +
    s.reports * 5 +
    s.repairs * 5;
  return { xp, coins: Math.floor(xp / 5) };
}

export const EMPTY_STATS: PlayerMatchStats = {
  tasksDone: 0,
  kills: 0,
  infections: 0,
  objectives: 0,
  sabotages: 0,
  reports: 0,
  meetingsCalled: 0,
  votesCast: 0,
  correctVotes: 0,
  repairs: 0,
};
