/**
 * Sabotage framework. Implemented types are listed in SABOTAGE_TYPES; each has a
 * definition with duration, repair stations and repair mode. New sabotages are
 * added by extending this table and handling their effect in the engine.
 */
export const SABOTAGE_TYPES = ['POWER_FAILURE', 'COMMS_FAILURE', 'PUMP_FAILURE', 'DOOR_LOCK'] as const;
export type SabotageType = (typeof SABOTAGE_TYPES)[number];

export interface SabotageDef {
  type: SabotageType;
  nameKey: string;
  /** Critical sabotages end the match (Cats win) when the timer runs out. */
  critical: boolean;
  /** Auto-ends after this long (DOOR_LOCK) or fails the match (critical). null = until repaired. */
  durationMs: number | null;
  /** Map station ids that must be repaired. */
  repairStationIds: readonly string[];
  /** 'any': one station fixes it. 'all': every station must be fixed. */
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
    repairStationIds: ['power_panel'],
    repairMode: 'any',
    repairMinMs: 1500,
    major: true,
  },
  COMMS_FAILURE: {
    type: 'COMMS_FAILURE',
    nameKey: 'sabotage.COMMS_FAILURE',
    critical: false,
    durationMs: null,
    repairStationIds: ['comms_radio'],
    repairMode: 'any',
    repairMinMs: 1500,
    major: true,
  },
  PUMP_FAILURE: {
    type: 'PUMP_FAILURE',
    nameKey: 'sabotage.PUMP_FAILURE',
    critical: true,
    durationMs: 50_000,
    repairStationIds: ['pump_valve_a', 'pump_valve_b'],
    repairMode: 'all',
    repairMinMs: 1200,
    major: true,
  },
  DOOR_LOCK: {
    type: 'DOOR_LOCK',
    nameKey: 'sabotage.DOOR_LOCK',
    critical: false,
    durationMs: 12_000,
    repairStationIds: [],
    repairMode: 'none',
    repairMinMs: 0,
    major: false,
  },
};

export const FUTURE_SABOTAGES = ['CCTV_FAILURE', 'WATER_FAILURE', 'ROAD_BLOCK', 'ALARM'] as const;
