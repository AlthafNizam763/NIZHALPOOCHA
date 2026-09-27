export const TASK_TYPES = [
  // Town
  'repair_fuse',
  'restore_streetlight',
  'fix_cctv',
  'repair_pump',
  'restart_generator',
  'fix_router',
  'arrange_shop',
  'repair_auto_battery',
  'clear_blockage',
  'connect_wires',
  // Modern / future
  'reboot_server',
  'calibrate_drone',
  'sync_cctv',
  'charge_ev',
  'align_solar',
  'patch_firewall',
  'reset_signal',
  // Village / backwater
  'pole_boat',
  'mend_net',
  'drain_paddy',
  'fuel_boat',
  // Quarantine
  'collect_sample',
  'purify_water',
  'repair_radio_mast',
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

/** Mini-game templates. Each task picks one template plus a config. */
export const MINIGAMES = ['wires', 'numbers', 'timing', 'memory', 'arrange', 'clear'] as const;
export type MinigameKind = (typeof MINIGAMES)[number];

export interface TaskDef {
  type: TaskType;
  /** i18n key for the display name. */
  nameKey: string;
  minigame: MinigameKind;
  difficulty: 1 | 2 | 3;
  /**
   * Minimum time between task:start and task:complete that the server accepts.
   * Kept below a fast human's real completion time; blocks instant auto-complete.
   */
  minDurationMs: number;
}

const MIN_MS: Record<MinigameKind, number> = { wires: 2000, numbers: 1500, timing: 1200, memory: 3000, arrange: 2000, clear: 1800 };

function def(type: TaskType, minigame: MinigameKind, difficulty: 1 | 2 | 3): TaskDef {
  return { type, nameKey: `task.${type}`, minigame, difficulty, minDurationMs: MIN_MS[minigame] };
}

export const TASK_DEFS: Record<TaskType, TaskDef> = {
  repair_fuse: def('repair_fuse', 'numbers', 1),
  restore_streetlight: def('restore_streetlight', 'timing', 2),
  fix_cctv: def('fix_cctv', 'memory', 2),
  repair_pump: def('repair_pump', 'numbers', 1),
  restart_generator: def('restart_generator', 'timing', 2),
  fix_router: def('fix_router', 'memory', 2),
  arrange_shop: def('arrange_shop', 'arrange', 1),
  repair_auto_battery: def('repair_auto_battery', 'wires', 2),
  clear_blockage: def('clear_blockage', 'clear', 1),
  connect_wires: def('connect_wires', 'wires', 2),
  reboot_server: def('reboot_server', 'numbers', 2),
  calibrate_drone: def('calibrate_drone', 'timing', 2),
  sync_cctv: def('sync_cctv', 'memory', 2),
  charge_ev: def('charge_ev', 'wires', 1),
  align_solar: def('align_solar', 'arrange', 2),
  patch_firewall: def('patch_firewall', 'memory', 3),
  reset_signal: def('reset_signal', 'timing', 1),
  pole_boat: def('pole_boat', 'timing', 1),
  mend_net: def('mend_net', 'clear', 1),
  drain_paddy: def('drain_paddy', 'clear', 2),
  fuel_boat: def('fuel_boat', 'numbers', 1),
  collect_sample: def('collect_sample', 'memory', 2),
  purify_water: def('purify_water', 'numbers', 2),
  repair_radio_mast: def('repair_radio_mast', 'wires', 2),
};

/** A task assigned to a player for the current match. */
export interface TaskAssignment {
  id: string; // unique per player per match
  type: TaskType;
  stationId: string;
  done: boolean;
}
