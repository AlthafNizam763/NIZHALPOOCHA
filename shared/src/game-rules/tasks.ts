export const TASK_TYPES = [
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

export const TASK_DEFS: Record<TaskType, TaskDef> = {
  repair_fuse: { type: 'repair_fuse', nameKey: 'task.repair_fuse', minigame: 'numbers', difficulty: 1, minDurationMs: 1500 },
  restore_streetlight: { type: 'restore_streetlight', nameKey: 'task.restore_streetlight', minigame: 'timing', difficulty: 2, minDurationMs: 1200 },
  fix_cctv: { type: 'fix_cctv', nameKey: 'task.fix_cctv', minigame: 'memory', difficulty: 2, minDurationMs: 3000 },
  repair_pump: { type: 'repair_pump', nameKey: 'task.repair_pump', minigame: 'numbers', difficulty: 1, minDurationMs: 1500 },
  restart_generator: { type: 'restart_generator', nameKey: 'task.restart_generator', minigame: 'timing', difficulty: 2, minDurationMs: 1200 },
  fix_router: { type: 'fix_router', nameKey: 'task.fix_router', minigame: 'memory', difficulty: 2, minDurationMs: 3000 },
  arrange_shop: { type: 'arrange_shop', nameKey: 'task.arrange_shop', minigame: 'arrange', difficulty: 1, minDurationMs: 2000 },
  repair_auto_battery: { type: 'repair_auto_battery', nameKey: 'task.repair_auto_battery', minigame: 'wires', difficulty: 2, minDurationMs: 2000 },
  clear_blockage: { type: 'clear_blockage', nameKey: 'task.clear_blockage', minigame: 'clear', difficulty: 1, minDurationMs: 1800 },
  connect_wires: { type: 'connect_wires', nameKey: 'task.connect_wires', minigame: 'wires', difficulty: 2, minDurationMs: 2000 },
};

/** A task assigned to a player for the current match. */
export interface TaskAssignment {
  id: string; // unique per player per match
  type: TaskType;
  stationId: string;
  done: boolean;
}
