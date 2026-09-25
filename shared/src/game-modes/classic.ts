import { catLimits } from '../game-rules/roles';
import { countAlive, type GameModeDefinition, type WinInput, type WinResult } from './types';

/** The original rules: find the Cats or finish the tasks; Cats win at parity. */
export function classicWin(input: WinInput): WinResult | null {
  const alive = countAlive(input);
  if (alive.cats === 0) return { winner: 'HUMANS', reason: 'cats_eliminated' };
  if (input.tasksTotal > 0 && input.tasksDone >= input.tasksTotal) return { winner: 'HUMANS', reason: 'tasks_completed' };
  if (alive.humans === 0) return { winner: 'CATS', reason: 'humans_left' };
  if (alive.cats >= alive.humans) return { winner: 'CATS', reason: 'parity' };
  return null;
}

export const ClassicMode: GameModeDefinition = {
  id: 'classic',
  nameKey: 'mode.classic',
  descriptionKey: 'mode.classic.desc',
  humanGoalKey: 'role.humanGoal',
  catGoalKey: 'role.catGoal',
  catAttack: 'kill',
  catLimits,
  emergencyMeetings: true,
  humanVisionMultiplier: 1,
  catVisionMultiplier: 1,
  killCooldownMultiplier: 1,
  survivalMs: null,
  infectionTurnMs: 0,
  useAntidote: false,
  surveillanceAlerts: false,
  requiredMapFeatures: [],
  ruleKeys: ['moderule.tasksOrVote', 'moderule.parity'],
  evaluateWin: classicWin,
};
