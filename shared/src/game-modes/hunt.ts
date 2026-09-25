import { catLimits } from '../game-rules/roles';
import { classicWin } from './classic';
import type { GameModeDefinition } from './types';

/**
 * Hunt: the town goes quiet. No emergency button (only bodies trigger meetings),
 * Humans see less, Cats strike more often — but Humans who last until the
 * survival clock runs out win.
 */
export const HuntMode: GameModeDefinition = {
  id: 'hunt',
  nameKey: 'mode.hunt',
  descriptionKey: 'mode.hunt.desc',
  humanGoalKey: 'role.humanGoal.hunt',
  catGoalKey: 'role.catGoal.hunt',
  catAttack: 'kill',
  catLimits,
  emergencyMeetings: false,
  humanVisionMultiplier: 0.8,
  catVisionMultiplier: 1,
  killCooldownMultiplier: 0.75,
  survivalMs: 5 * 60_000,
  infectionTurnMs: 0,
  useAntidote: false,
  surveillanceAlerts: false,
  requiredMapFeatures: [],
  ruleKeys: ['moderule.noEmergency', 'moderule.lowVision', 'moderule.fastCats', 'moderule.survive'],
  evaluateWin(input) {
    if (input.survivalExpired) return { winner: 'HUMANS', reason: 'survived' };
    return classicWin(input);
  },
};
