'use client';
import { create } from 'zustand';
import type {
  ChatMessage,
  GameEndView,
  GameStateView,
  MinigameKind,
  RoleInfo,
  SelfState,
  VoteResult,
} from '@nizhal/shared';

/** Context-sensitive actions available right now (computed by the Phaser scene). */
export interface ProximityActions {
  taskId: string | null;
  repairStationId: string | null;
  bodyId: string | null;
  emergency: boolean;
  killTargetId: string | null;
}

export const NO_ACTIONS: ProximityActions = {
  taskId: null,
  repairStationId: null,
  bodyId: null,
  emergency: false,
  killTargetId: null,
};

export type ActivePanel =
  | { kind: 'task'; taskId: string; minigame: MinigameKind }
  | { kind: 'fakeTask'; taskId: string }
  | { kind: 'repair'; stationId: string }
  | { kind: 'sabotage' }
  | { kind: 'map' }
  | { kind: 'menu' }
  | null;

interface GameState {
  state: GameStateView | null;
  role: RoleInfo | null;
  self: SelfState | null;
  chat: ChatMessage[];
  voteResult: VoteResult | null;
  end: GameEndView | null;
  actions: ProximityActions;
  panel: ActivePanel;
  zoneId: string;
  /** Spectator camera target. */
  followId: string | null;
  /** Victim ids the local Cat knows about (from private kill events). */
  knownKills: string[];
  set: (patch: Partial<Omit<GameState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const initial = {
  state: null,
  role: null,
  self: null,
  chat: [],
  voteResult: null,
  end: null,
  actions: NO_ACTIONS,
  panel: null,
  zoneId: 'junction',
  followId: null,
  knownKills: [],
};

export const useGame = create<GameState>()((set) => ({
  ...initial,
  set: (patch) => set(patch),
  reset: () => set({ ...initial }),
}));

export function sameActions(a: ProximityActions, b: ProximityActions): boolean {
  return (
    a.taskId === b.taskId &&
    a.repairStationId === b.repairStationId &&
    a.bodyId === b.bodyId &&
    a.emergency === b.emergency &&
    a.killTargetId === b.killTargetId
  );
}

/** Stable empty fallbacks for selectors (a fresh [] each call would loop renders). */
export const EMPTY_PLAYERS: GameStateView['players'] = [];
export const EMPTY_TASKS: SelfState['tasks'] = [];
