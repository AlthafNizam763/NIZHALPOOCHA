import { GAME } from '../constants/game';

export const ROLES = ['HUMAN', 'CAT'] as const;
export type Role = (typeof ROLES)[number];
export type Team = 'HUMANS' | 'CATS';

export function teamOf(role: Role): Team {
  return role === 'CAT' ? 'CATS' : 'HUMANS';
}

export interface CatLimits {
  min: number;
  max: number;
  default: number;
}

/**
 * Server-defined valid Cat counts for a given number of players.
 *  5      -> exactly 1
 *  6–10   -> 1 or 2
 *  11–15  -> 2 or 3
 */
export function catLimits(playerCount: number): CatLimits {
  if (playerCount <= 5) return { min: 1, max: 1, default: 1 };
  if (playerCount <= 10) return { min: 1, max: 2, default: playerCount >= 8 ? 2 : 1 };
  return { min: 2, max: 3, default: 2 };
}

export function isValidCatCount(playerCount: number, cats: number): boolean {
  if (playerCount < GAME.MIN_PLAYERS || playerCount > GAME.MAX_PLAYERS) return false;
  const l = catLimits(playerCount);
  return Number.isInteger(cats) && cats >= l.min && cats <= l.max;
}

/** Clamp a requested cat count into the legal range for the player count. */
export function effectiveCatCount(playerCount: number, requested: number): number {
  const l = catLimits(playerCount);
  return Math.min(l.max, Math.max(l.min, Math.round(requested)));
}
