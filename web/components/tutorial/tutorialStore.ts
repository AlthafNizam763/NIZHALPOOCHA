'use client';
import { create } from 'zustand';
import type { I18nKey } from '@/utils/i18n';

export const LESSONS = ['move', 'camera', 'interact', 'task', 'investigate', 'report', 'meeting', 'vote'] as const;
export type LessonId = (typeof LESSONS)[number];

/** A coach line, optionally with a different wording for touch devices. */
export type CoachLine = I18nKey | { touch: I18nKey; keys: I18nKey };

/** UI elements the coach can point at (matched by `data-tut` attributes). */
export type TutTarget = 'map' | 'action-repair' | 'action-task' | 'action-report' | 'quick-chat' | 'vote-grid';

interface TutorialState {
  lesson: LessonId | null;
  /** What to do now. */
  objective: CoachLine | null;
  /** The player's own passing thought ("Something is wrong here."). */
  thought: I18nKey | null;
  highlight: TutTarget | null;
  /** Clue within reach, or null. */
  inspectable: string | null;
  outcome: 'caught' | 'missed' | null;
  finished: boolean;
  set: (patch: Partial<Omit<TutorialState, 'set' | 'reset'>>) => void;
  reset: () => void;
}

const initial = {
  lesson: null,
  objective: null,
  thought: null,
  highlight: null,
  inspectable: null,
  outcome: null,
  finished: false,
};

export const useTutorial = create<TutorialState>()((set) => ({
  ...initial,
  set: (patch) => set(patch),
  reset: () => set({ ...initial }),
}));
