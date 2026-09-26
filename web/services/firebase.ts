'use client';
import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  browserSessionPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectDatabaseEmulator, getDatabase, type Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || undefined,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

/**
 * Local Firebase Emulator Suite (`firebase emulators:start`). Only the public web
 * config is ever used here — admin credentials live on the game server only.
 */
const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || '';
/**
 * The emulators only speak plain HTTP, which an HTTPS page can't reach (mixed content), so a
 * stray emulator host in a deployed build is ignored instead of breaking every Firebase call.
 */
export const usingEmulators =
  emulatorHost.length > 0 && (typeof window === 'undefined' || window.location.protocol === 'http:');

/** When false the app runs in local dev mode (dev identities, no persistence). */
export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let rtdb: Database | null = null;

export function fbApp(): FirebaseApp {
  if (!firebaseEnabled) throw new Error('Firebase is not configured');
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  return app;
}

export function fbAuth(): Auth {
  if (!auth) {
    const perSession = process.env.NEXT_PUBLIC_AUTH_PERSISTENCE === 'session';
    auth = initializeAuth(fbApp(), {
      persistence: perSession ? [browserSessionPersistence] : [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
    if (usingEmulators) connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
  }
  return auth;
}

export function fbDb(): Firestore {
  if (!db) {
    db = getFirestore(fbApp());
    if (usingEmulators) connectFirestoreEmulator(db, emulatorHost, 8080);
  }
  return db;
}

/**
 * Google Analytics. Browser-only and loaded lazily so it never runs during the static
 * export; skipped under the emulators or when the browser doesn't support it.
 */
export async function initAnalytics(): Promise<void> {
  if (!firebaseEnabled || usingEmulators || !firebaseConfig.measurementId || typeof window === 'undefined') return;
  const { getAnalytics, isSupported } = await import('firebase/analytics');
  if (await isSupported().catch(() => false)) getAnalytics(fbApp());
}

export function fbRtdb(): Database | null {
  if (!firebaseConfig.databaseURL) return null;
  if (!rtdb) {
    rtdb = getDatabase(fbApp());
    if (usingEmulators) connectDatabaseEmulator(rtdb, emulatorHost, 9000);
  }
  return rtdb;
}
