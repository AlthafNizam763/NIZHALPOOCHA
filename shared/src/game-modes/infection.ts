import { GAME } from '../constants/game';
import type { CatLimits } from '../game-rules/roles';
import { countAlive, type GameModeDefinition } from './types';

/** Up to half the room may start as Cats (6 players → up to 3 Cats). */
export function infectionCatLimits(playerCount: number): CatLimits {
  const n = Math.max(GAME.MIN_PLAYERS, playerCount);
  const max = Math.floor(n / 2);
  return { min: 1, max, default: Math.max(1, Math.floor(n / 3)) };
}

/**
 * NIZHALAM: Infection. Cats do not kill — they infect. An infected Human freezes
 * while turning (HUMAN → INFECTED → CAT), then privately becomes a Cat with Cat
 * abilities. Cats win when no Humans remain. Humans win by activating the escape
 * systems (tasks), assembling the antidote, surviving the clock, or ejecting
 * every Cat. There is no parity rule: a Cat majority still has to convert everyone.
 */
export const InfectionMode: GameModeDefinition = {
  id: 'infection',
  nameKey: 'mode.infection',
  descriptionKey: 'mode.infection.desc',
  humanGoalKey: 'role.humanGoal.infection',
  catGoalKey: 'role.catGoal.infection',
  catAttack: 'infect',
  catLimits: infectionCatLimits,
  emergencyMeetings: true,
  humanVisionMultiplier: 1,
  catVisionMultiplier: 1,
  killCooldownMultiplier: 1,
  survivalMs: 6 * 60_000,
  infectionTurnMs: 3_000,
  useAntidote: true,
  surveillanceAlerts: false,
  requiredMapFeatures: [],
  ruleKeys: ['moderule.infect', 'moderule.escape', 'moderule.antidote', 'moderule.survive', 'moderule.convertAll'],
  evaluateWin(input) {
    const alive = countAlive(input);
    if (alive.cats === 0) return { winner: 'HUMANS', reason: 'cats_eliminated' };
    if (input.tasksTotal > 0 && input.tasksDone >= input.tasksTotal) return { winner: 'HUMANS', reason: 'escaped' };
    if (input.antidote && input.antidote.total > 0 && input.antidote.collected >= input.antidote.total) {
      return { winner: 'HUMANS', reason: 'antidote' };
    }
    if (input.survivalExpired) return { winner: 'HUMANS', reason: 'survived' };
    if (alive.humans === 0) return { winner: 'CATS', reason: 'all_infected' };
    return null;
  },
};
