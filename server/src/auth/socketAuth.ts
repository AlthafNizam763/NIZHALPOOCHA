import type { Socket } from 'socket.io';
import { adminAuth, adminHasCredentials } from './firebaseAdmin';
import { config } from '../utils/config';
import { createLogger } from '../utils/logger';

const log = createLogger('auth');

export interface SocketIdentity {
  uid: string;
  /** Display name from the token, if any (the lobby name is chosen separately). */
  tokenName: string | null;
  isAnonymous: boolean;
  isDev: boolean;
}

export interface SocketData {
  identity: SocketIdentity;
}

/**
 * Socket.IO middleware: every connection must present a Firebase ID token
 * (`auth.token`). In local development without Firebase Admin, an explicit
 * dev identity (`auth.devUid`) is accepted when ALLOW_DEV_AUTH=true.
 */
export async function authenticateSocket(socket: Socket, next: (err?: Error) => void): Promise<void> {
  const auth = (socket.handshake.auth ?? {}) as { token?: unknown; devUid?: unknown };
  try {
    const firebase = adminAuth();
    if (typeof auth.token === 'string' && auth.token.length > 0 && firebase) {
      // The revocation check needs a service account; without one it would reject every token.
      const decoded = await firebase.verifyIdToken(auth.token, adminHasCredentials());
      (socket.data as SocketData).identity = {
        uid: decoded.uid,
        tokenName: (decoded.name as string | undefined) ?? null,
        isAnonymous: decoded.firebase?.sign_in_provider === 'anonymous',
        isDev: false,
      };
      return next();
    }
    if (config.allowDevAuth && typeof auth.devUid === 'string' && /^dev_[A-Za-z0-9_-]{6,40}$/.test(auth.devUid)) {
      (socket.data as SocketData).identity = { uid: auth.devUid, tokenName: null, isAnonymous: true, isDev: true };
      return next();
    }
    const why = typeof auth.token === 'string' && auth.token ? 'token sent but Firebase Admin is not configured' : typeof auth.devUid === 'string' ? 'dev identity sent but dev auth is off' : 'no credentials';
    log.warn(`Rejected connection ${socket.id}: ${why}`);
    next(new Error('UNAUTHORIZED'));
  } catch (err) {
    const e = err as { code?: string; message?: string };
    log.warn(`Token verification failed for ${socket.id}: ${e.code ?? ''} ${e.message ?? ''}`.trim());
    next(new Error('UNAUTHORIZED'));
  }
}
