import type { TaskType } from '../game-rules/tasks';
import type { SabotageType } from '../game-rules/sabotage';
import type { MapId } from '../game-rules/settings';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface MapZone extends Rect {
  id: string;
  /** i18n key */
  nameKey: string;
}

export interface MapBuilding {
  id: string;
  zoneId: string;
  floor: Rect;
  floorStyle: 'wood' | 'tile' | 'concrete' | 'mud';
  roof: 'tile' | 'concrete' | 'tin';
  /** i18n key for signboard (Malayalam-inspired). */
  signKey?: string;
  lockable: boolean;
}

export interface MapDoor extends Rect {
  id: string;
  buildingId: string;
  orientation: 'h' | 'v';
}

export interface TaskStation extends Point {
  id: string;
  taskType: TaskType;
  zoneId: string;
}

export interface SabotageStation extends Point {
  id: string;
  sabotage: SabotageType;
  zoneId: string;
}

export type DecorationKind =
  | 'tree'
  | 'lamp'
  | 'puddle'
  | 'pole'
  | 'auto'
  | 'bicycle'
  | 'scooter'
  | 'stall'
  | 'desk'
  | 'bench'
  | 'counter'
  | 'house_block'
  | 'shelter'
  | 'bell'
  | 'cctv'
  | 'pump'
  | 'generator'
  | 'workbench'
  | 'shelf'
  | 'panel'
  | 'radio'
  | 'stage'
  | 'well'
  | 'banana'
  | 'drum';

export interface Decoration extends Rect {
  kind: DecorationKind;
  /** Whether it blocks movement (a collider is generated from its rect). */
  solid: boolean;
}

export interface GameMapDef {
  id: MapId;
  nameKey: string;
  width: number;
  height: number;
  spawn: Point;
  spawnRadius: number;
  roads: Rect[];
  water: Rect[];
  bridges: Rect[];
  zones: MapZone[];
  buildings: MapBuilding[];
  /** Static solid rectangles: walls, obstacles, water, world edges. */
  colliders: Rect[];
  /** Building walls only (subset of colliders) — used for line-of-sight checks. */
  walls: Rect[];
  doors: MapDoor[];
  taskStations: TaskStation[];
  sabotageStations: SabotageStation[];
  emergency: Point;
  decorations: Decoration[];
}
