'use client';
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { useAuth, type AuthUser } from '@/state/authStore';
import type { I18nKey } from '@/utils/i18n';
import { firebaseEnabled, fbAuth } from './firebase';
import { ensureProfile, saveProfile } from './profile';

const DEV_KEY = 'nz-dev-identity';

/**
 * During registration Firebase fires the auth listener before the display name is
 * set. While this is true the listener must not create the profile document, or
 * it would be created with the wrong username.
 */
let registering = false;

function toAuthUser(u: User): AuthUser {
  return {
    uid: u.uid,
    // Guests get a stable, distinguishable default name from their uid (e.g. Guest7fQ2).
    displayName: u.displayName ?? (u.isAnonymous ? `Guest${u.uid.slice(-4)}` : (u.email?.split('@')[0] ?? 'Player')),
    email: u.email,
    isGuest: u.isAnonymous,
    isDev: false,
  };
}

async function applyUser(user: AuthUser | null, fromListener = false) {
  const store = useAuth.getState();
  if (fromListener && registering) return;
  store.setUser(user);
  if (!user) return;
  try {
    store.setProfile(await ensureProfile(user));
  } catch (err) {
    console.error('[auth] failed to load profile', err);
  }
}

/** Starts listening for session changes (session restore on load). Returns unsubscribe. */
export function initAuth(): () => void {
  if (!firebaseEnabled) {
    // Dev identities live in sessionStorage: each tab is its own player.
    try {
      const raw = sessionStorage.getItem(DEV_KEY);
      void applyUser(raw ? (JSON.parse(raw) as AuthUser) : null);
    } catch {
      void applyUser(null);
    }
    return () => {};
  }
  return onAuthStateChanged(fbAuth(), (u) => void applyUser(u ? toAuthUser(u) : null, true));
}

export async function devSignIn(): Promise<void> {
  const id = `dev_${Math.random().toString(36).slice(2, 12)}`;
  const user: AuthUser = { uid: id, displayName: `Guest${id.slice(-4)}`, email: null, isGuest: true, isDev: true };
  sessionStorage.setItem(DEV_KEY, JSON.stringify(user));
  await applyUser(user);
}

export async function signInEmail(email: string, password: string) {
  await signInWithEmailAndPassword(fbAuth(), email.trim(), password);
}

export async function registerEmail(email: string, password: string, displayName: string) {
  registering = true;
  try {
    const cred = await createUserWithEmailAndPassword(fbAuth(), email.trim(), password);
    await updateProfile(cred.user, { displayName: displayName.trim() });
    registering = false;
    await applyUser(toAuthUser(cred.user));
  } finally {
    registering = false;
  }
}

export async function signInGuest() {
  if (!firebaseEnabled) return devSignIn();
  await signInAnonymously(fbAuth());
}

export async function signInGoogle() {
  // Popup auth is web-only; native builds need a native Google plugin (see docs/MOBILE.md).
  if (Capacitor.isNativePlatform()) throw new FirebaseError('auth/operation-not-supported-in-this-environment', 'native');
  await signInWithPopup(fbAuth(), new GoogleAuthProvider());
}

export async function resetPassword(email: string) {
  await sendPasswordResetEmail(fbAuth(), email.trim());
}

/** Upgrades an anonymous guest to an email account, keeping the same uid and progress. */
export async function upgradeGuest(email: string, password: string) {
  const current = fbAuth().currentUser;
  if (!current) throw new Error('not signed in');
  const cred = await linkWithCredential(current, EmailAuthProvider.credential(email.trim(), password));
  await cred.user.reload();
  const upgraded = toAuthUser(fbAuth().currentUser ?? cred.user);
  await saveProfile(upgraded, {}); // records isGuest: false
  await applyUser(upgraded);
}

export async function logout() {
  if (!firebaseEnabled) {
    sessionStorage.removeItem(DEV_KEY);
    await applyUser(null);
    return;
  }
  await signOut(fbAuth());
}

/** Credentials for the socket handshake. */
export async function socketCredentials(): Promise<Record<string, string>> {
  const user = useAuth.getState().user;
  if (!user) return {};
  if (user.isDev) return { devUid: user.uid };
  const token = await fbAuth().currentUser?.getIdToken();
  return token ? { token } : {};
}

export function authErrorKey(err: unknown): I18nKey {
  const code = err instanceof FirebaseError ? err.code : '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-login-credentials':
      return 'auth.err.invalid';
    case 'auth/email-already-in-use':
    case 'auth/credential-already-in-use':
      return 'auth.err.exists';
    case 'auth/weak-password':
      return 'auth.err.weak';
    case 'auth/invalid-email':
    case 'auth/missing-email':
      return 'auth.err.email';
    case 'auth/network-request-failed':
      return 'auth.err.network';
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'auth.err.popup';
    case 'auth/operation-not-supported-in-this-environment':
    case 'auth/operation-not-allowed':
      return 'auth.err.unsupported';
    default:
      return 'auth.err.generic';
  }
}
