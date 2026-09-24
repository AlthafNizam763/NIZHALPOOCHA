'use client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { DEFAULT_APPEARANCE, randomAppearance, type Appearance } from '@nizhal/shared';
import {
  EMPTY_USER_STATS,
  NEW_PLAYER_ONBOARDING,
  useAuth,
  type AuthUser,
  type Onboarding,
  type Profile,
  type UserStats,
} from '@/state/authStore';
import { firebaseEnabled, fbDb } from './firebase';

const LOCAL_KEY = 'nz-local-profile';
const ONBOARDING_KEY = 'nz-onboarding';

/**
 * Onboarding flags are mirrored on the device so a failed or denied Firestore
 * write never sends a player back through the intro. A flag counts as set if
 * either copy has it.
 */
const onboardingKey = (uid: string) => `${ONBOARDING_KEY}:${uid}`;

function readLocalOnboarding(uid: string): Partial<Onboarding> {
  try {
    return JSON.parse(localStorage.getItem(onboardingKey(uid)) ?? '{}') as Partial<Onboarding>;
  } catch {
    return {};
  }
}

function mergeOnboarding(uid: string, remote: Partial<Onboarding> | undefined, returning: boolean): Onboarding {
  const local = readLocalOnboarding(uid);
  // Accounts that already played before onboarding existed are returning players.
  const base = returning && !remote ? { hasSeenIntro: true, hasCompletedTutorial: true } : NEW_PLAYER_ONBOARDING;
  return {
    hasSeenIntro: !!(base.hasSeenIntro || remote?.hasSeenIntro || local.hasSeenIntro),
    hasCompletedTutorial: !!(base.hasCompletedTutorial || remote?.hasCompletedTutorial || local.hasCompletedTutorial),
  };
}

function sanitizeName(name: string): string {
  const clean = name.replace(/[^\p{L}\p{M}\p{N} _.-]/gu, '').trim().slice(0, 16);
  return clean.length >= 2 ? clean : `Guest${Math.floor(1000 + Math.random() * 9000)}`;
}

export function localProfile(user: AuthUser): Profile {
  try {
    const raw = localStorage.getItem(`${LOCAL_KEY}:${user.uid}`) ?? localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Profile>;
      return {
        uid: user.uid,
        username: sanitizeName(p.username ?? user.displayName),
        appearance: { ...DEFAULT_APPEARANCE, ...p.appearance },
        xp: 0,
        coins: 0,
        stats: { ...EMPTY_USER_STATS },
        isGuest: true,
        onboarding: mergeOnboarding(user.uid, undefined, false),
      };
    }
  } catch {
    /* ignore */
  }
  return {
    uid: user.uid,
    username: sanitizeName(user.displayName),
    appearance: randomAppearance(),
    xp: 0,
    coins: 0,
    stats: { ...EMPTY_USER_STATS },
    isGuest: true,
    onboarding: mergeOnboarding(user.uid, undefined, false),
  };
}

/** Loads the user profile, creating it on first sign-in. */
export async function ensureProfile(user: AuthUser): Promise<Profile> {
  if (!firebaseEnabled || user.isDev) return localProfile(user);
  const ref = doc(fbDb(), 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const profile = {
      username: sanitizeName(user.displayName),
      appearance: randomAppearance(),
      isGuest: user.isGuest,
      createdAt: serverTimestamp(),
    };
    await setDoc(ref, profile);
    return {
      uid: user.uid,
      username: profile.username,
      appearance: profile.appearance,
      xp: 0,
      coins: 0,
      stats: { ...EMPTY_USER_STATS },
      isGuest: user.isGuest,
      onboarding: mergeOnboarding(user.uid, undefined, false),
    };
  }
  const d = snap.data() as {
    username?: string;
    appearance?: Appearance;
    xp?: number;
    coins?: number;
    stats?: Partial<UserStats>;
    isGuest?: boolean;
    onboarding?: Partial<Onboarding>;
  };
  return {
    uid: user.uid,
    username: sanitizeName(d.username ?? user.displayName),
    appearance: { ...DEFAULT_APPEARANCE, ...d.appearance },
    xp: d.xp ?? 0,
    coins: d.coins ?? 0,
    stats: { ...EMPTY_USER_STATS, ...d.stats },
    isGuest: user.isGuest,
    onboarding: mergeOnboarding(user.uid, d.onboarding, (d.stats?.gamesPlayed ?? 0) > 0),
  };
}

/**
 * Records onboarding progress (intro seen, tutorial done). Updates the store at
 * once; the Firestore write is best-effort and the device copy is the fallback.
 */
export async function markOnboarding(patch: Partial<Onboarding>): Promise<void> {
  const { user, profile, profileSync, setProfile } = useAuth.getState();
  if (!user || !profile) return;
  const onboarding = { ...profile.onboarding, ...patch };
  setProfile({ ...profile, onboarding });
  try {
    localStorage.setItem(onboardingKey(user.uid), JSON.stringify(onboarding));
  } catch {
    /* storage unavailable: the flags still hold for this session */
  }
  if (!firebaseEnabled || user.isDev || profileSync !== 'ok') return;
  try {
    await setDoc(doc(fbDb(), 'users', user.uid), { onboarding, updatedAt: serverTimestamp() }, { merge: true });
  } catch (err) {
    console.warn('[profile] Could not save onboarding progress to Firestore; kept on this device.', err);
  }
}

/** Profile fields the client is allowed to write (stats/xp are server-only). */
export async function saveProfile(user: AuthUser, patch: { username?: string; appearance?: Appearance }): Promise<void> {
  const clean = { ...patch, ...(patch.username ? { username: sanitizeName(patch.username) } : {}) };
  if (!firebaseEnabled || user.isDev || useAuth.getState().profileSync !== 'ok') {
    const current = localProfile(user);
    localStorage.setItem(`${LOCAL_KEY}:${user.uid}`, JSON.stringify({ ...current, ...clean }));
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ ...current, ...clean }));
    return;
  }
  await setDoc(doc(fbDb(), 'users', user.uid), { ...clean, isGuest: user.isGuest, updatedAt: serverTimestamp() }, { merge: true });
}

export interface MatchHistoryEntry {
  matchId: string;
  role: 'HUMAN' | 'CAT';
  won: boolean;
  xp: number;
  endedAt: Date;
}

export async function recentMatches(uid: string): Promise<MatchHistoryEntry[]> {
  if (!firebaseEnabled) return [];
  const q = query(collection(fbDb(), 'matchPlayers'), where('uid', '==', uid), orderBy('endedAt', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const x = d.data() as { matchId: string; role: 'HUMAN' | 'CAT'; won: boolean; xp: number; endedAt: { toDate(): Date } };
    return { matchId: x.matchId, role: x.role, won: x.won, xp: x.xp, endedAt: x.endedAt.toDate() };
  });
}

export type LeaderMetric = 'xp' | 'games' | 'wins' | 'tasks' | 'investigations';

export interface LeaderRow {
  uid: string;
  name: string;
  value: number;
}

export async function leaderboard(metric: LeaderMetric): Promise<LeaderRow[]> {
  if (!firebaseEnabled) return [];
  const q = query(collection(fbDb(), 'leaderboard'), orderBy(metric, 'desc'), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const x = d.data() as Record<string, unknown>;
    return { uid: d.id, name: String(x.name ?? '—'), value: Number(x[metric] ?? 0) };
  });
}
