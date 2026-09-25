'use client';
import { create } from 'zustand';
import type {
  CameraFeed,
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
  /** Antidote part in reach (Infection). */
  objectiveId: string | null;
  /** Standing at a security console. */
  console: boolean;
}

export const NO_ACTIONS: ProximityActions = {
  taskId: null,
  repairStationId: null,
  bodyId: null,
  emergency: false,
  killTargetId: null,
  objectiveId: null,
  console: false,
};

export type ActivePanel =
  | { kind: 'task'; taskId: string; minigame: MinigameKind }
  | { kind: 'fakeTask'; taskId: string }
  | { kind: 'repair'; stationId: string }
  | { kind: 'objective'; objectiveId: string }
  | { kind: 'cameras' }
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
  /** Private murder cutscene for the killer or the victim only (never broadcast). */
  killScene: { victimId: string; asKiller: boolean; at: number } | null;
  /** Latest security-console feed (only while watching). */
  cameraFeed: CameraFeed | null;
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
  killScene: null,
  cameraFeed: null,
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
    a.killTargetId === b.killTargetId &&
    a.objectiveId === b.objectiveId &&
    a.console === b.console
  );
}

/** Stable empty fallbacks for selectors (a fresh [] each call would loop renders). */
export const EMPTY_PLAYERS: GameStateView['players'] = [];
export const EMPTY_TASKS: SelfState['tasks'] = [];
