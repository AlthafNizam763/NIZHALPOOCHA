/**
 * Room / match state machine.
 *
 * SABOTAGE and SPECTATOR from the design are modelled as sub-states rather than
 * room phases: a sabotage runs *during* PLAYING (see GameStateView.sabotage) and
 * spectating is a per-player status (dead players), because the rest of the room
 * keeps playing while either is active.
 */
export const PHASES = [
  'WAITING', // lobby with fewer than MIN_PLAYERS
  'LOBBY', // enough players; host may start once everyone is ready
  'STARTING', // countdown
  'ROLE_REVEAL', // private role reveal
  'PLAYING', // free roam, tasks, kills, sabotage
  'REPORT', // short splash after a body report / emergency
  'MEETING', // discussion
  'VOTING', // voting
  'RESULT', // vote result
  'FINISHED', // match over
] as const;
export type Phase = (typeof PHASES)[number];

const TRANSITIONS: Record<Phase, readonly Phase[]> = {
  WAITING: ['LOBBY'],
  LOBBY: ['WAITING', 'STARTING'],
  STARTING: ['ROLE_REVEAL', 'LOBBY', 'WAITING'],
  ROLE_REVEAL: ['PLAYING', 'FINISHED'],
  PLAYING: ['REPORT', 'FINISHED'],
  REPORT: ['MEETING', 'FINISHED'],
  MEETING: ['VOTING', 'FINISHED'],
  VOTING: ['RESULT', 'FINISHED'],
  RESULT: ['PLAYING', 'FINISHED'],
  FINISHED: ['LOBBY', 'WAITING'],
};

export function canTransition(from: Phase, to: Phase): boolean {
  return TRANSITIONS[from].includes(to);
}

export const IN_MATCH_PHASES: readonly Phase[] = ['ROLE_REVEAL', 'PLAYING', 'REPORT', 'MEETING', 'VOTING', 'RESULT'];

export function isInMatch(phase: Phase): boolean {
  return IN_MATCH_PHASES.includes(phase);
}
