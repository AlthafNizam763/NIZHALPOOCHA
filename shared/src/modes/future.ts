import { catLimits } from '../game-rules/roles';
import { classicWin } from './classic';
import type { GameModeDefinition } from './types';

/**
 * Future: classic rules in a smart town. Smart street lighting widens Human
 * vision, and any CCTV camera or patrol drone that witnesses an attack raises a
 * town-wide alert naming the area — so Cats must hunt the blind spots or knock
 * the cameras out with a CCTV sabotage first. Needs a map with surveillance.
 */
export const FutureMode: GameModeDefinition = {
  id: 'future',
  nameKey: 'mode.future',
  descriptionKey: 'mode.future.desc',
  humanGoalKey: 'role.humanGoal.future',
  catGoalKey: 'role.catGoal.future',
  catAttack: 'kill',
  catLimits,
  emergencyMeetings: true,
  humanVisionMultiplier: 1.1,
  catVisionMultiplier: 1,
  killCooldownMultiplier: 1,
  survivalMs: null,
  infectionTurnMs: 0,
  useAntidote: false,
  surveillanceAlerts: true,
  requiredMapFeatures: ['surveillance'],
  ruleKeys: ['moderule.tasksOrVote', 'moderule.alerts', 'moderule.smartLights'],
  evaluateWin: classicWin,
};
