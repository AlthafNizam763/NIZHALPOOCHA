import type { CatLimits } from '../game-rules/roles';
import type { GameMode, PartialRoomSettings, RoomSettings } from '../game-rules/settings';
import { GAME } from '../constants/game';
import { getMap } from '../maps';
import type { GameMapDef } from '../maps/types';
import { ClassicMode } from './classic';
import { FutureMode } from './future';
import { HuntMode } from './hunt';
import { InfectionMode } from './infection';
import type { GameModeDefinition, MapFeature } from './types';

export * from './types';
export { ClassicMode, classicWin } from './classic';
export { HuntMode } from './hunt';
export { InfectionMode, infectionCatLimits } from './infection';
export { FutureMode } from './future';

const MODES: Record<GameMode, GameModeDefinition> = {
  classic: ClassicMode,
  hunt: HuntMode,
  infection: InfectionMode,
  future: FutureMode,
};

export function getMode(id: GameMode): GameModeDefinition {
  return MODES[id];
}

export const ALL_MODES: readonly GameModeDefinition[] = Object.values(MODES);

// ── Cat counts (mode-aware) ──────────────────────────────────────────────
export function catLimitsFor(mode: GameMode, playerCount: number): CatLimits {
  return MODES[mode].catLimits(playerCount);
}

export function isValidCatCountFor(mode: GameMode, playerCount: number, cats: number): boolean {
  if (playerCount < GAME.MIN_PLAYERS || playerCount > GAME.MAX_PLAYERS) return false;
  const l = catLimitsFor(mode, playerCount);
  return Number.isInteger(cats) && cats >= l.min && cats <= l.max;
}

export function effectiveCatCountFor(mode: GameMode, playerCount: number, requested: number): number {
  const l = catLimitsFor(mode, playerCount);
  return Math.min(l.max, Math.max(l.min, Math.round(requested)));
}

// ── Map ↔ mode compatibility ─────────────────────────────────────────────
export function mapFeatures(map: GameMapDef): Set<MapFeature> {
  const f = new Set<MapFeature>();
  if (map.cameras.length > 0 && map.securityConsoles.length > 0) f.add('surveillance');
  if (map.objectives.some((o) => o.kind === 'antidote_part')) f.add('antidote');
  return f;
}

export function mapSupportsMode(map: GameMapDef, mode: GameMode): boolean {
  if (!map.supportedModes.includes(mode)) return false;
  const features = mapFeatures(map);
  return MODES[mode].requiredMapFeatures.every((f) => features.has(f));
}

/**
 * Applies a settings patch, keeping map and mode compatible. Changing only the
 * map switches to that map's default mode when the current one isn't supported;
 * an explicitly requested unsupported combination is rejected (null).
 */
export function applySettingsPatch(current: RoomSettings, patch: PartialRoomSettings): RoomSettings | null {
  const next = { ...current, ...patch } as RoomSettings;
  const map = getMap(next.mapId);
  if (!map) return null;
  if (patch.mapId && !patch.mode && !mapSupportsMode(map, next.mode)) next.mode = map.supportedModes[0]!;
  return mapSupportsMode(map, next.mode) ? next : null;
}
