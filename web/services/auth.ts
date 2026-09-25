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
  getRedirectResult,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { Capacitor } from '@capacitor/core';
import { useAuth, type AuthUser } from '@/state/authStore';
import type { I18nKey } from '@/utils/i18n';
import { firebaseEnabled, fbAuth } from './firebase';
import { ensureProfile, localProfile, saveProfile } from './profile';

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
    useAuth.setState({ profileSync: 'ok' });
  } catch (err) {
    // Keep the player moving with a local profile instead of hanging on "Loading…".
    const denied = err instanceof FirebaseError && err.code === 'permission-denied';
    console.warn(
      denied
        ? '[auth] Firestore denied access to users/{uid}. Deploy firebase/firestore.rules to this project (or use a dedicated project). Using a local profile.'
        : '[auth] Could not load the profile from Firestore; using a local profile.',
      err,
    );
    useAuth.setState({ profileSync: denied ? 'denied' : 'offline' });
    store.setProfile(localProfile(user));
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
  // Finishes a Google redirect sign-in (used when the browser blocks the popup).
  // Success arrives through the auth listener; only log failures here.
  if (!Capacitor.isNativePlatform()) getRedirectResult(fbAuth()).catch((err) => console.warn('[auth] Google redirect sign-in failed', err));
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

/**
 * Google sign-in.
 *  - Native apps: the system Google account picker (via @capacitor-firebase/authentication),
 *    then the returned ID token signs in the Firebase JS SDK, so the rest of the app is unchanged.
 *    The plugin is only bundled once Firebase's native config file is added (docs/MOBILE.md).
 *  - Browsers: a popup, falling back to a full-page redirect when popups are blocked.
 */
export async function signInGoogle() {
  if (Capacitor.isNativePlatform()) {
    if (!Capacitor.isPluginAvailable('FirebaseAuthentication')) throw new FirebaseError('auth/google-not-configured', 'native Google sign-in is not set up in this build');
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication');
    let idToken: string | undefined;
    let accessToken: string | undefined;
    try {
      const result = await FirebaseAuthentication.signInWithGoogle();
      idToken = result.credential?.idToken;
      accessToken = result.credential?.accessToken;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (/cancel/i.test(message)) throw new FirebaseError('auth/popup-closed-by-user', message);
      // "10:" / DEVELOPER_ERROR = this build's signing SHA-1 is not registered in Firebase.
      console.warn('[auth] Native Google sign-in failed. Check the SHA-1 fingerprint and google-services.json (docs/MOBILE.md).', err);
      throw new FirebaseError('auth/google-not-configured', message);
    }
    if (!idToken) throw new FirebaseError('auth/google-not-configured', 'no ID token returned');
    await signInWithCredential(fbAuth(), GoogleAuthProvider.credential(idToken, accessToken));
    return;
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(fbAuth(), provider);
  } catch (err) {
    if (err instanceof FirebaseError && err.code === 'auth/popup-blocked') return signInWithRedirect(fbAuth(), provider);
    if (err instanceof FirebaseError && err.code === 'auth/operation-not-allowed') {
      console.warn('[auth] The Google provider is disabled for this Firebase project. Enable it in Firebase console → Authentication → Sign-in method → Google.');
    }
    if (err instanceof FirebaseError && err.code === 'auth/unauthorized-domain') {
      console.warn(`[auth] "${location.hostname}" is not an authorized domain. Add it in Firebase console → Authentication → Settings → Authorized domains.`);
    }
    throw err;
  }
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
    case 'auth/unauthorized-domain':
      return 'auth.err.domain';
    case 'auth/google-not-configured':
      return 'auth.err.googleSetup';
    case 'auth/popup-blocked':
      return 'auth.err.popupBlocked';
    default:
      return 'auth.err.generic';
  }
}
