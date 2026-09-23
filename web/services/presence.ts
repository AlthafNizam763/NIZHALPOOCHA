'use client';
import { onDisconnect, ref, serverTimestamp, set } from 'firebase/database';
import { useAuth } from '@/state/authStore';
import { useSettings } from '@/state/settingsStore';
import { fbRtdb } from './firebase';

export type PresenceState = 'online' | 'in_lobby' | 'in_game' | 'offline';

let last: PresenceState | null = null;

/**
 * Lightweight presence in Realtime Database: status/{uid} = { state, lastChanged }.
 * Never used for gameplay — only for friends' online indicators.
 */
export function setPresence(state: PresenceState): void {
  const user = useAuth.getState().user;
  if (!user || user.isDev || state === last) return;
  const db = fbRtdb();
  if (!db) return;
  last = state;
  const visible = useSettings.getState().showOnline;
  const node = ref(db, `status/${user.uid}`);
  const value = { state: visible ? state : 'offline', lastChanged: serverTimestamp() };
  void onDisconnect(node)
    .set({ state: 'offline', lastChanged: serverTimestamp() })
    .then(() => set(node, value))
    .catch((e) => console.warn('[presence]', e));
}
