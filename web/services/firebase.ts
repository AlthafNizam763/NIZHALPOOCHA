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
};

/**
 * Local Firebase Emulator Suite (`firebase emulators:start`). Only the public web
 * config is ever used here — admin credentials live on the game server only.
 */
const emulatorHost = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST || '';
export const usingEmulators = emulatorHost.length > 0;

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

export function fbRtdb(): Database | null {
  if (!firebaseConfig.databaseURL) return null;
  if (!rtdb) {
    rtdb = getDatabase(fbApp());
    if (usingEmulators) connectDatabaseEmulator(rtdb, emulatorHost, 9000);
  }
  return rtdb;
}
