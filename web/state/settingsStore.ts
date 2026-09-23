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
      set: (patch) => set(patch),
    }),
    { name: 'nz-settings', version: 2, migrate: (s) => ({ voiceVolume: 0.9, pushToTalk: false, ...(s as object) }) as SettingsState },
  ),
);
