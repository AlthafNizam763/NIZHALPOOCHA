import 'dotenv/config';

function bool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined || v === '') return fallback;
  return v === 'true' || v === '1';
}

const isProd = process.env.NODE_ENV === 'production';

type IceServer = { urls: string | string[]; username?: string; credential?: string };
function parseIce(raw: string | undefined): IceServer[] {
  const fallback: IceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  if (!raw) return fallback;
  try {
    const v = JSON.parse(raw) as IceServer[];
    return Array.isArray(v) && v.length ? v : fallback;
  } catch {
    console.error('VOICE_ICE_SERVERS is not valid JSON — using public STUN only');
    return fallback;
  }
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  isProd,
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || undefined,
    serviceAccountBase64: process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || undefined,
    projectId: process.env.FIREBASE_PROJECT_ID || undefined,
  },
  /** Dev identities are refused in production no matter what the env says. */
  allowDevAuth: !isProd && bool(process.env.ALLOW_DEV_AUTH, false),
  maintenance: bool(process.env.MAINTENANCE_MODE, false),
  /** WebRTC ICE servers for voice chat (JSON array). Add a TURN server for players behind strict NATs. */
  voiceIceServers: parseIce(process.env.VOICE_ICE_SERVERS),
} as const;
