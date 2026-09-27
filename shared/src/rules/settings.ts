import { z } from 'zod';

/** Host-configurable match settings. Bounds are enforced on the server. */
export const SETTINGS_BOUNDS = {
  /** Absolute bounds; the legal range for a match also depends on player count and mode. */
  catCount: { min: 1, max: 7 },
  killCooldownS: { min: 10, max: 60 },
  discussionS: { min: 0, max: 120 },
  votingS: { min: 15, max: 180 },
  tasksPerPlayer: { min: 2, max: 8 },
  emergencyMeetings: { min: 0, max: 3 },
  maxPlayers: { min: 5, max: 15 },
} as const;

export const MAP_IDS = ['kadalimukku_old_town', 'kadalimukku_new_town', 'backwater_village', 'neo_kerala', 'nizhalam'] as const;
export type MapId = (typeof MAP_IDS)[number];

export const GAME_MODES = ['classic', 'hunt', 'infection', 'future'] as const;
export type GameMode = (typeof GAME_MODES)[number];

export const roomSettingsSchema = z.object({
  mapId: z.enum(MAP_IDS),
  mode: z.enum(GAME_MODES),
  maxPlayers: z.number().int().min(SETTINGS_BOUNDS.maxPlayers.min).max(SETTINGS_BOUNDS.maxPlayers.max),
  catCount: z.number().int().min(SETTINGS_BOUNDS.catCount.min).max(SETTINGS_BOUNDS.catCount.max),
  killCooldownS: z.number().int().min(SETTINGS_BOUNDS.killCooldownS.min).max(SETTINGS_BOUNDS.killCooldownS.max),
  discussionS: z.number().int().min(SETTINGS_BOUNDS.discussionS.min).max(SETTINGS_BOUNDS.discussionS.max),
  votingS: z.number().int().min(SETTINGS_BOUNDS.votingS.min).max(SETTINGS_BOUNDS.votingS.max),
  tasksPerPlayer: z.number().int().min(SETTINGS_BOUNDS.tasksPerPlayer.min).max(SETTINGS_BOUNDS.tasksPerPlayer.max),
  emergencyMeetings: z
    .number()
    .int()
    .min(SETTINGS_BOUNDS.emergencyMeetings.min)
    .max(SETTINGS_BOUNDS.emergencyMeetings.max),
  anonymousVotes: z.boolean(),
  confirmEjects: z.boolean(),
  isPublic: z.boolean(),
  voiceChat: z.boolean(),
});

export type RoomSettings = z.infer<typeof roomSettingsSchema>;

export const DEFAULT_SETTINGS: RoomSettings = {
  mapId: 'kadalimukku_old_town',
  mode: 'classic',
  maxPlayers: 10,
  catCount: 1,
  killCooldownS: 25,
  discussionS: 30,
  votingS: 60,
  tasksPerPlayer: 5,
  emergencyMeetings: 1,
  anonymousVotes: false,
  confirmEjects: true,
  isPublic: false,
  voiceChat: true,
};

export const partialSettingsSchema = roomSettingsSchema.partial();
export type PartialRoomSettings = z.infer<typeof partialSettingsSchema>;
