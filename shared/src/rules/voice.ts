import type { Phase } from './phases';

/**
 * Voice chat channels. Audio flows peer-to-peer (WebRTC); the server decides who
 * may connect to whom and relays only signalling between players in the same channel.
 *
 *  lobby   — everyone in the room while no match is running
 *  meeting — living players during MEETING / VOTING / RESULT
 *  dead    — eliminated players, any time during a match (never heard by the living)
 *  null    — no voice (living players while the town is in play)
 */
export type VoiceChannel = 'lobby' | 'meeting' | 'dead';

export const MEETING_VOICE_PHASES: readonly Phase[] = ['MEETING', 'VOTING', 'RESULT'];

/**
 * @param inMatch whether a match is running for the room
 * @param alive   the player's real alive state in the match (undefined if not in it)
 */
export function voiceChannelFor(phase: Phase, inMatch: boolean, alive: boolean | undefined): VoiceChannel | null {
  if (!inMatch) return 'lobby';
  if (alive === undefined) return null;
  if (!alive) return 'dead';
  return MEETING_VOICE_PHASES.includes(phase) ? 'meeting' : null;
}

export interface VoicePeer {
  id: string;
  muted: boolean;
}

/** Sent to each player who joined voice whenever their channel or peers change. */
export interface VoiceRoster {
  /** Host switched voice off for the room. */
  enabled: boolean;
  channel: VoiceChannel | null;
  peers: VoicePeer[];
}

export type VoiceSignal =
  | { type: 'offer'; sdp: string }
  | { type: 'answer'; sdp: string }
  | { type: 'ice'; candidate: { candidate: string; sdpMid?: string | null; sdpMLineIndex?: number | null } };

export interface VoiceJoinResult {
  iceServers: { urls: string | string[]; username?: string; credential?: string }[];
}
