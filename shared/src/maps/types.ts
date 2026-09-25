import type { TaskType } from '../game-rules/tasks';
import type { SabotageType } from '../game-rules/sabotage';
import type { GameMode, MapId } from '../game-rules/settings';

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

/** A named room / area of the map (shown in the HUD and on the map overlay). */
export interface MapZone extends Rect {
  id: string;
  /** i18n key */
  nameKey: string;
}

export interface MapBuilding {
  id: string;
  zoneId: string;
  floor: Rect;
  floorStyle: 'wood' | 'tile' | 'concrete' | 'mud' | 'metal';
  roof: 'tile' | 'concrete' | 'tin' | 'thatch' | 'glass';
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

/**
 * A sabotage repair point. Which sabotages a map supports is derived from its
 * stations: a sabotage with no station on the map cannot be triggered there.
 */
export interface SabotageStation extends Point {
  id: string;
  sabotage: SabotageType;
  zoneId: string;
}

/** Where an emergency meeting can be called (alarm bell, siren post…). */
export interface MeetingLocation extends Point {
  id: string;
  zoneId: string;
}

/** Mode objectives placed on the map (e.g. Infection antidote parts). */
export type ObjectiveKind = 'antidote_part';
export interface ObjectiveLocation extends Point {
  id: string;
  kind: ObjectiveKind;
  zoneId: string;
}

/** Slows movement while standing inside it. Not a collider. */
export type HazardKind = 'shallow_water' | 'paddy' | 'mud';
export interface Hazard extends Rect {
  kind: HazardKind;
  speedMultiplier: number;
}

/**
 * Surveillance: a fixed CCTV camera or a patrolling drone. Cameras feed the
 * security consoles and (in modes that use it) raise alerts when they see an attack.
 */
export interface SurveillanceCamera extends Point {
  id: string;
  kind: 'cctv' | 'drone';
  radius: number;
  /** Drones fly this closed loop at `speed` units/s. x/y is ignored for drones. */
  patrol?: Point[];
  speed?: number;
}

export interface SecurityConsole extends Point {
  id: string;
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
  | 'drum'
  // Modern / future
  | 'car'
  | 'bus'
  | 'apartment'
  | 'kiosk'
  | 'server_rack'
  | 'solar_panel'
  | 'drone_pad'
  | 'charger'
  | 'pillar'
  | 'rail'
  | 'hoarding'
  | 'console'
  // Village / backwater
  | 'boat'
  | 'houseboat'
  | 'hut'
  | 'net'
  | 'haystack'
  // Quarantine
  | 'tent'
  | 'barrier'
  | 'crate'
  | 'bio_tank';

export interface Decoration extends Rect {
  kind: DecorationKind;
  /** Whether it blocks movement (a collider is generated from its rect). */
  solid: boolean;
}

/** Colour overrides for the procedural map art. Unset keys use the default palette. */
export interface MapPalette {
  grass: number;
  grassDark: number;
  grassLight: number;
  road: number;
  roadWet: number;
  roadEdge: number;
  dash: number;
  water: number;
  waterLight: number;
  bridge: number;
  rail: number;
  wall: number;
  wallTop: number;
  wallBase: number;
  woodFloor: number;
  woodLine: number;
  tileFloor: number;
  tileLight: number;
  concrete: number;
  concreteLine: number;
  roof: number;
  roofDark: number;
  roofRidge: number;
  lamp: number;
}

export interface MapTheme {
  id: 'monsoon_town' | 'modern_town' | 'backwater' | 'future_city' | 'quarantine';
  palette: Partial<MapPalette>;
  /** Camera clear colour (CSS hex). */
  background: string;
  rain: boolean;
  lightning: boolean;
}

/** Map-specific rule tweaks applied on top of whichever game mode is running. */
export interface MapSpecialRules {
  /** Multiplies every living player's vision (fog, open fields, dense groves…). */
  visionMultiplier: number;
  /** i18n keys describing the map's quirks in the lobby. */
  ruleKeys: string[];
}

/**
 * Everything the game needs to know about a map. Gameplay code reads only this
 * definition — no map has its own component or engine logic.
 *
 * Field guide: `zones` are the map's rooms; `colliders` (+ `walls` for line of
 * sight, + `doors` when locked) are its collision data; `taskStations`,
 * `sabotageStations` and `meetingLocations` are where those interactions live;
 * spawns come from `spawnPoints` or a ring of `spawnRadius` around `spawn`.
 */
export interface GameMapDef {
  id: MapId;
  nameKey: string;
  descriptionKey: string;
  theme: MapTheme;
  width: number;
  height: number;
  spawn: Point;
  spawnRadius: number;
  /** Explicit spawn points; when absent players spawn on a ring around `spawn`. */
  spawnPoints?: Point[];
  /** Zone id reported when a player is outside every named zone. */
  outdoorZoneId: string;
  roads: Rect[];
  water: Rect[];
  bridges: Rect[];
  hazards: Hazard[];
  zones: MapZone[];
  buildings: MapBuilding[];
  /** Static solid rectangles: walls, obstacles, water, world edges. */
  colliders: Rect[];
  /** Building walls only (subset of colliders) — used for line-of-sight checks. */
  walls: Rect[];
  doors: MapDoor[];
  taskStations: TaskStation[];
  sabotageStations: SabotageStation[];
  meetingLocations: MeetingLocation[];
  objectives: ObjectiveLocation[];
  cameras: SurveillanceCamera[];
  securityConsoles: SecurityConsole[];
  decorations: Decoration[];
  specialRules: MapSpecialRules;
  /** Game modes this map is designed for; the first is the map's default. */
  supportedModes: readonly GameMode[];
}

export type MapDefinition = GameMapDef;
