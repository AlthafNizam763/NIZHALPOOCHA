'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isInMatch } from '@nizhal/shared';
import { useAuth } from '@/state/authStore';
import { useRoom } from '@/state/roomStore';
import { useGame } from '@/state/gameStore';

/** Redirects to /login when signed out. Returns true once a user is available. */
export function useRequireAuth(): boolean {
  const status = useAuth((s) => s.status);
  const router = useRouter();
  useEffect(() => {
    if (status === 'signedOut') router.replace('/login');
  }, [status, router]);
  return status === 'signedIn';
}

/**
 * Keeps the URL in sync with where the player actually is (room / match),
 * e.g. after a refresh or a reconnect.
 */
export function useRoomRedirect(where: 'menu' | 'lobby' | 'play'): void {
  const router = useRouter();
  const room = useRoom((s) => s.room);
  const phase = room?.phase;
  const hasEnd = useGame((s) => !!s.end);
  const hasMatchState = useGame((s) => !!s.state);

  useEffect(() => {
    if (!phase) {
      if (where === 'lobby') router.replace('/home');
      if (where === 'play' && !hasEnd) router.replace('/home');
      return;
    }
    const inMatch = isInMatch(phase) || phase === 'FINISHED';
    if (where === 'menu') router.replace(inMatch && hasMatchState ? '/play' : '/lobby');
    else if (where === 'lobby' && inMatch && hasMatchState) router.replace('/play');
    else if (where === 'play' && !inMatch && !hasEnd) router.replace('/lobby');
  }, [phase, where, router, hasEnd, hasMatchState]);
}
