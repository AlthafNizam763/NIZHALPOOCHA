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
import { EMPTY_USER_STATS, type AuthUser, type Profile, type UserStats } from '@/state/authStore';
import { firebaseEnabled, fbDb } from './firebase';

const LOCAL_KEY = 'nz-local-profile';

function sanitizeName(name: string): string {
  const clean = name.replace(/[^\p{L}\p{M}\p{N} _.-]/gu, '').trim().slice(0, 16);
  return clean.length >= 2 ? clean : `Guest${Math.floor(1000 + Math.random() * 9000)}`;
}

function localProfile(user: AuthUser): Profile {
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
    return { uid: user.uid, username: profile.username, appearance: profile.appearance, xp: 0, coins: 0, stats: { ...EMPTY_USER_STATS }, isGuest: user.isGuest };
  }
  const d = snap.data() as { username?: string; appearance?: Appearance; xp?: number; coins?: number; stats?: Partial<UserStats>; isGuest?: boolean };
  return {
    uid: user.uid,
    username: sanitizeName(d.username ?? user.displayName),
    appearance: { ...DEFAULT_APPEARANCE, ...d.appearance },
    xp: d.xp ?? 0,
    coins: d.coins ?? 0,
    stats: { ...EMPTY_USER_STATS, ...d.stats },
    isGuest: user.isGuest,
  };
}

/** Profile fields the client is allowed to write (stats/xp are server-only). */
export async function saveProfile(user: AuthUser, patch: { username?: string; appearance?: Appearance }): Promise<void> {
  const clean = { ...patch, ...(patch.username ? { username: sanitizeName(patch.username) } : {}) };
  if (!firebaseEnabled || user.isDev) {
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
