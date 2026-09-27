import type { CatLimits, Role, Team } from '../game-rules/roles';
import type { GameMode } from '../game-rules/settings';
import type { WinReason } from '../types';

export interface WinInput {
  players: { role: Role; alive: boolean }[];
  tasksDone: number;
  tasksTotal: number;
  /** Antidote parts collected / placed on the map (modes that use them). */
  antidote: { collected: number; total: number } | null;
  /** The mode's survival clock has run out. */
  survivalExpired: boolean;
}

export interface WinResult {
  winner: Team;
  reason: WinReason;
}

/** Map capabilities a mode can depend on. */
export type MapFeature = 'surveillance' | 'antidote';

/**
 * A game mode is pure configuration plus pure rules. The server's match engine
 * reads these values instead of branching on mode ids, and maps never contain
 * mode logic — any map can run any mode it lists in `supportedModes`.
 */
export interface GameModeDefinition {
  id: GameMode;
  nameKey: string;
  descriptionKey: string;
  /** Role-reveal goal text. */
  humanGoalKey: string;
  catGoalKey: string;
  /** What a Cat's attack does: leave a body, or convert the Human into a Cat. */
  catAttack: 'kill' | 'infect';
  /** Legal starting Cat counts for a number of players. */
  catLimits(playerCount: number): CatLimits;
  /** Whether the emergency meeting button exists. */
  emergencyMeetings: boolean;
  humanVisionMultiplier: number;
  catVisionMultiplier: number;
  killCooldownMultiplier: number;
  /** Humans win after this much free-roam time (meetings pause the clock). null = no clock. */
  survivalMs: number | null;
  /** How long an infected Human is frozen while turning. Only used by 'infect' modes. */
  infectionTurnMs: number;
  /** Antidote parts on the map are a Human objective. */
  useAntidote: boolean;
  /** Cameras / drones that witness an attack raise an alert for everyone. */
  surveillanceAlerts: boolean;
  /** The map must provide these for the mode to be selectable on it. */
  requiredMapFeatures: readonly MapFeature[];
  /** i18n keys summarising the rules (lobby). */
  ruleKeys: readonly string[];
  evaluateWin(input: WinInput): WinResult | null;
}

export function countAlive(input: WinInput) {
  return {
    cats: input.players.filter((p) => p.role === 'CAT' && p.alive).length,
    humans: input.players.filter((p) => p.role === 'HUMAN' && p.alive).length,
  };
}
