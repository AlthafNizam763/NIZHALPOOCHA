'use client';
import { create } from 'zustand';
import type { VoiceChannel, VoicePeer } from '@nizhal/shared';

export type VoiceError = 'denied' | 'unsupported' | 'insecure' | 'nomic' | 'server';

interface VoiceState {
  status: 'off' | 'connecting' | 'on' | 'error';
  error: VoiceError | null;
  /** Room setting (host). */
  enabled: boolean;
  channel: VoiceChannel | null;
  peers: VoicePeer[];
  muted: boolean;
  /** Push-to-talk key/button currently held. */
  talking: boolean;
  /** Player ids currently speaking (includes the local player). */
  speaking: string[];
  set: (patch: Partial<Omit<VoiceState, 'set'>>) => void;
}

export const useVoice = create<VoiceState>()((set) => ({
  status: 'off',
  error: null,
  enabled: true,
  channel: null,
  peers: [],
  muted: false,
  talking: false,
  speaking: [],
  set: (patch) => set(patch),
}));
