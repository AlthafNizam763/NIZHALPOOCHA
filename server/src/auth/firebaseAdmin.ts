import { readFileSync } from 'node:fs';
import { cert, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { config } from '../utils/config';
import { createLogger } from '../utils/logger';

const log = createLogger('firebase');

let app: App | null = null;
let initialized = false;
let serviceAccount = false;

/**
 * Initializes Firebase Admin from a service account (file path or base64 JSON),
 * or from Application Default Credentials when only a project id is given.
 * Returns null when no credentials are configured (local dev without Firebase).
 */
export function getAdminApp(): App | null {
  if (initialized) return app;
  initialized = true;
  try {
    const { serviceAccountPath, serviceAccountBase64, projectId } = config.firebase;
    if (serviceAccountPath) {
      const json = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      app = getApps()[0] ?? initializeApp({ credential: cert(json), projectId: json.project_id ?? projectId });
      serviceAccount = true;
    } else if (serviceAccountBase64) {
      const json = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
      app = getApps()[0] ?? initializeApp({ credential: cert(json), projectId: json.project_id ?? projectId });
      serviceAccount = true;
    } else if (projectId && (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST)) {
      // Local Firebase Emulator Suite: no credentials needed (never used in production).
      app = getApps()[0] ?? initializeApp({ projectId });
    } else if (projectId) {
      app = getApps()[0] ?? initializeApp({ credential: applicationDefault(), projectId });
    }
    if (app) {
      log.info(`Firebase Admin initialized (project ${app.options.projectId ?? 'unknown'})`);
      if (!serviceAccount && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        log.warn('No service account: sign-in tokens are verified by signature only (no revocation check) and match results may not be saved.');
      }
    } else if (config.isProd) {
      log.error('Firebase Admin NOT configured — every sign-in will be rejected. Set FIREBASE_PROJECT_ID (and a service account).');
    } else {
      log.warn('Firebase Admin NOT configured — token verification and persistence are disabled.');
    }
  } catch (err) {
    log.error('Failed to initialize Firebase Admin', err);
    app = null;
  }
  return app;
}

export function adminAuth(): Auth | null {
  const a = getAdminApp();
  return a ? getAuth(a) : null;
}

/**
 * Whether the admin app holds real credentials. Checking a token for revocation calls the
 * Auth API and needs them; checking its signature only needs the project id.
 */
export function adminHasCredentials(): boolean {
  return !!getAdminApp() && (serviceAccount || !!process.env.GOOGLE_APPLICATION_CREDENTIALS);
}

export function adminDb(): Firestore | null {
  const a = getAdminApp();
  return a ? getFirestore(a) : null;
}
