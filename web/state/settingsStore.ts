'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Lang } from '@/utils/i18n';

export interface SettingsState {
  language: Lang;
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  quality: 'low' | 'high';
  rain: boolean;
  joystickSide: 'left' | 'right';
  reduceFlashes: boolean;
  largeText: boolean;
  notifyInvites: boolean;
  showOnline: boolean;
  voiceVolume: number;
  pushToTalk: boolean;
  /** Spoken narration for the story intro and tutorial (device text-to-speech). */
  narration: boolean;
  /** Language of the spoken narration, independent of the interface language. */
  narrationLanguage: Lang;
  set: (patch: Partial<Omit<SettingsState, 'set'>>) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      language: 'en',
      masterVolume: 0.8,
      musicVolume: 0.6,
      sfxVolume: 0.8,
      quality: 'high',
      rain: true,
      joystickSide: 'left',
      reduceFlashes: false,
      largeText: false,
      notifyInvites: true,
      showOnline: true,
      voiceVolume: 0.9,
      pushToTalk: false,
      narration: true,
      narrationLanguage: 'ml',
      set: (patch) => set(patch),
    }),
    {
      name: 'nz-settings',
      version: 4,
      migrate: (s, version) => {
        const prev = { voiceVolume: 0.9, pushToTalk: false, ...(s as object) } as SettingsState;
        // v4: story narration is on by default and spoken in Malayalam.
        return version < 4 ? { ...prev, narration: true, narrationLanguage: 'ml' } : prev;
      },
    },
  ),
);
