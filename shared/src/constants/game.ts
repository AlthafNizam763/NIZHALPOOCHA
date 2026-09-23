/**
 * Centralized gameplay constants shared by server (validation) and client
 * (prediction / UI). Anything a host can change lives in RoomSettings instead.
 */
export const GAME = {
  MIN_PLAYERS: 5,
  MAX_PLAYERS: 15,
  ROOM_CODE_LENGTH: 6,

  /** World units per second. */
  PLAYER_SPEED: 190,
  /** Half-size of the player's square collision box. */
  PLAYER_HALF: 12,
  /** How often the client sends its position while moving (ms). */
  MOVE_SEND_INTERVAL_MS: 66,
  /** Server snapshot broadcast interval (ms) ~15 Hz. */
  SERVER_TICK_MS: 66,
  /** Remote players are rendered this far in the past for smooth interpolation. */
  INTERPOLATION_DELAY_MS: 110,
  /** Multiplier on max legal distance to absorb jitter. */
  MOVE_TOLERANCE: 1.4,
  /** Extra absolute slack (units) per move validation. */
  MOVE_SLACK: 6,
  /** dt used for validation is capped at this value (ms). */
  MOVE_MAX_DT_MS: 300,

  INTERACT_RANGE: 78,
  REPORT_RANGE: 120,
  KILL_RANGE: 90,
  EMERGENCY_RANGE: 90,

  VISION_HUMAN: 330,
  VISION_CAT: 430,
  VISION_POWER_OUT: 140,
  VISION_SPECTATOR: 99999,
  /** Server includes entities up to vision + this margin in snapshots. */
  VISION_MARGIN: 120,

  START_COUNTDOWN_MS: 5000,
  ROLE_REVEAL_MS: 5500,
  REPORT_SPLASH_MS: 3000,
  VOTE_RESULT_MS: 7000,
  RECONNECT_GRACE_MS: 60_000,
  FIRST_KILL_COOLDOWN_MS: 15_000,
  FIRST_SABOTAGE_COOLDOWN_MS: 15_000,
  SABOTAGE_COOLDOWN_MS: 30_000,
  EMERGENCY_COOLDOWN_AFTER_MEETING_MS: 15_000,

  MAX_NAME_LENGTH: 16,
  MIN_NAME_LENGTH: 2,
  MAX_CHAT_LENGTH: 140,
  CHAT_MIN_INTERVAL_MS: 700,
} as const;

export const SPAWN_RING_RADIUS = 95;
