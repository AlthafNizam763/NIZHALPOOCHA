/**
 * Sabotage framework. Each type has a definition with duration and repair mode.
 * Repair stations are NOT listed here: every map places its own stations
 * (`GameMapDef.sabotageStations`), and a sabotage is only available on maps
 * that have a station for it (see `availableSabotages`).
 */
export const SABOTAGE_TYPES = ['POWER_FAILURE', 'COMMS_FAILURE', 'PUMP_FAILURE', 'CCTV_FAILURE', 'DOOR_LOCK'] as const;
export type SabotageType = (typeof SABOTAGE_TYPES)[number];

export interface SabotageDef {
  type: SabotageType;
  nameKey: string;
  /** Critical sabotages end the match (Cats win) when the timer runs out. */
  critical: boolean;
  /** Auto-ends after this long (DOOR_LOCK) or fails the match (critical). null = until repaired. */
  durationMs: number | null;
  /** 'any': one station fixes it. 'all': every station of the map must be fixed. */
  repairMode: 'any' | 'all' | 'none';
  /** Time a repair interaction must take (server validated). */
  repairMinMs: number;
  /** Whether this sabotage counts as the "major" one (only one at a time). */
  major: boolean;
}

export const SABOTAGE_DEFS: Record<SabotageType, SabotageDef> = {
  POWER_FAILURE: {
    type: 'POWER_FAILURE',
    nameKey: 'sabotage.POWER_FAILURE',
    critical: false,
    durationMs: null,
    repairMode: 'any',
    repairMinMs: 1500,
    major: true,
  },
  COMMS_FAILURE: {
    type: 'COMMS_FAILURE',
    nameKey: 'sabotage.COMMS_FAILURE',
    critical: false,
    durationMs: null,
    repairMode: 'any',
    repairMinMs: 1500,
    major: true,
  },
  PUMP_FAILURE: {
    type: 'PUMP_FAILURE',
    nameKey: 'sabotage.PUMP_FAILURE',
    critical: true,
    durationMs: 50_000,
    repairMode: 'all',
    repairMinMs: 1200,
    major: true,
  },
  CCTV_FAILURE: {
    type: 'CCTV_FAILURE',
    nameKey: 'sabotage.CCTV_FAILURE',
    critical: false,
    durationMs: null,
    repairMode: 'any',
    repairMinMs: 1500,
    major: true,
  },
  DOOR_LOCK: {
    type: 'DOOR_LOCK',
    nameKey: 'sabotage.DOOR_LOCK',
    critical: false,
    durationMs: 12_000,
    repairMode: 'none',
    repairMinMs: 0,
    major: false,
  },
};

export const FUTURE_SABOTAGES = ['WATER_FAILURE', 'ROAD_BLOCK', 'ALARM'] as const;
