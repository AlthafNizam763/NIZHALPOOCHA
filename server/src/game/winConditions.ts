import type { Role, Team, WinReason } from '@nizhal/shared';

export interface WinInput {
  players: { role: Role; alive: boolean }[];
  tasksDone: number;
  tasksTotal: number;
}

export interface WinResult {
  winner: Team;
  reason: WinReason;
}

/** Evaluated only on the server after every state-changing event. */
export function evaluateWin(input: WinInput): WinResult | null {
  const aliveCats = input.players.filter((p) => p.role === 'CAT' && p.alive).length;
  const aliveHumans = input.players.filter((p) => p.role === 'HUMAN' && p.alive).length;

  if (aliveCats === 0) return { winner: 'HUMANS', reason: 'cats_eliminated' };
  if (input.tasksTotal > 0 && input.tasksDone >= input.tasksTotal) return { winner: 'HUMANS', reason: 'tasks_completed' };
  if (aliveHumans === 0) return { winner: 'CATS', reason: 'humans_left' };
  if (aliveCats >= aliveHumans) return { winner: 'CATS', reason: 'parity' };
  return null;
}
