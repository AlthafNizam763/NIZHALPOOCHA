'use client';
import { create } from 'zustand';

export type ConnStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'replaced' | 'unauthorized';

interface ConnState {
  status: ConnStatus;
  ping: number | null;
  /** serverTime - clientTime, used to render server deadlines. */
  clockOffset: number;
  set: (patch: Partial<Omit<ConnState, 'set'>>) => void;
}

export const useConnection = create<ConnState>()((set) => ({
  status: 'idle',
  ping: null,
  clockOffset: 0,
  set: (patch) => set(patch),
}));

/** Current server time estimate. */
export function serverNow(): number {
  return Date.now() + useConnection.getState().clockOffset;
}
