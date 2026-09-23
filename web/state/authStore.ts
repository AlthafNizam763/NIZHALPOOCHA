'use client';
import { create } from 'zustand';
import type { Appearance } from '@nizhal/shared';

export interface AuthUser {
  uid: string;
  displayName: string;
  email: string | null;
  isGuest: boolean;
  /** Local dev identity (Firebase not configured). */
  isDev: boolean;
}

export interface UserStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  tasksCompleted: number;
  catsIdentified: number;
  catGames: number;
  catWins: number;
  kills: number;
  sabotages: number;
  reports: number;
  investigations: number;
}

export interface Profile {
  uid: string;
  username: string;
  appearance: Appearance;
  xp: number;
  coins: number;
  stats: UserStats;
  isGuest: boolean;
}

interface AuthState {
  status: 'loading' | 'signedOut' | 'signedIn';
  user: AuthUser | null;
  profile: Profile | null;
  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: Profile | null) => void;
}

export const useAuth = create<AuthState>()((set) => ({
  status: 'loading',
  user: null,
  profile: null,
  setUser: (user) => set({ user, status: user ? 'signedIn' : 'signedOut', ...(user ? {} : { profile: null }) }),
  setProfile: (profile) => set({ profile }),
}));

export const EMPTY_USER_STATS: UserStats = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  tasksCompleted: 0,
  catsIdentified: 0,
  catGames: 0,
  catWins: 0,
  kills: 0,
  sabotages: 0,
  reports: 0,
  investigations: 0,
};
