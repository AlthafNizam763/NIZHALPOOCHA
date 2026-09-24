'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PublicRoomList, PublicRoomSummary } from '@nizhal/shared';
import { useAuth } from '@/state/authStore';
import { useConnection } from '@/state/connectionStore';
import { useUi } from '@/state/uiStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth, useRoomRedirect } from '@/hooks/useRoute';
import { rooms, errorKey } from '@/services/net';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Panel, Spinner } from '@/components/ui/Controls';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

const REFRESH_MS = 4000;

function RoomCard({ room, onJoin, joining }: { room: PublicRoomSummary; onJoin: () => void; joining: boolean }) {
  const t = useT();
  const statusStyle = { open: 'text-leaf', full: 'text-lamp', playing: 'text-rain' }[room.status];
  return (
    <Panel className="flex items-center gap-3 p-3 sm:p-4">
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{t('rooms.hostRoom', { name: room.hostName })}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-rain">
          <span className={statusStyle}>{t(`rooms.status.${room.status}`)}</span>
          <span>{t('map.kadalimukku_night')}</span>
          {room.voiceChat && <span>{t('rooms.voice')}</span>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-night">
            <div className="h-full bg-moss" style={{ width: `${(room.players / room.maxPlayers) * 100}%` }} />
          </div>
          <span className="text-xs tabular-nums text-mist">
            {room.players}/{room.maxPlayers}
          </span>
        </div>
      </div>
      <Button onClick={onJoin} disabled={room.status !== 'open'} loading={joining} aria-label={t('rooms.joinRoom', { name: room.hostName })}>
        {t('join.submit')}
      </Button>
    </Panel>
  );
}

/** Browse open public games and pick one — or fall back to Quick Play. */
export default function PublicRoomsPage() {
  const ready = useRequireAuth();
  useRoomRedirect('menu');
  const t = useT();
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const connected = useConnection((s) => s.status === 'connected');
  const toast = useUi((s) => s.toast);
  const [list, setList] = useState<PublicRoomList | null>(null);
  const [joining, setJoining] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const r = await rooms.list();
    if (r.ok) setList(r.data);
  }, []);

  useEffect(() => {
    if (!connected) return;
    void refresh();
    const id = setInterval(() => void refresh(), REFRESH_MS);
    return () => clearInterval(id);
  }, [connected, refresh]);

  async function join(code: string) {
    if (!profile) return;
    setJoining(code);
    const r = await rooms.join({ code, name: profile.username, appearance: profile.appearance });
    setJoining(null);
    if (r.ok) router.push('/lobby');
    else {
      toast(errorKey(r.error), undefined, 'warn');
      void refresh();
    }
  }

  async function quickPlay() {
    if (!profile) return;
    setJoining('quick');
    const r = await rooms.quickPlay({ name: profile.username, appearance: profile.appearance });
    setJoining(null);
    if (r.ok) router.push('/lobby');
    else toast(errorKey(r.error), undefined, 'warn');
  }

  if (!ready) return <LoadingScreen messageKey="loading.session" />;
  return (
    <Screen
      title={t('rooms.title')}
      back="/home"
      actions={
        list && (
          <span className="flex items-center gap-2 text-xs text-mist">
            <span className="h-2 w-2 rounded-full bg-leaf" />
            {t('rooms.online', { n: list.online })}
          </span>
        )
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2">
        <Button variant="primary" onClick={() => void quickPlay()} loading={joining === 'quick'} disabled={!connected}>
          {t('home.quickPlay')}
        </Button>
        <Button variant="secondary" onClick={() => router.push('/create/?public=1')} disabled={!connected}>
          {t('rooms.createPublic')}
        </Button>
      </div>

      {!list ? (
        <div className="flex items-center justify-center gap-3 py-10 text-sm text-mist">
          <Spinner className="h-4 w-4" />
          {t('common.loading')}
        </div>
      ) : list.rooms.length === 0 ? (
        <Panel className="p-6 text-center">
          <div className="font-display text-xl">{t('rooms.empty')}</div>
          <p className="mt-1 text-sm text-rain">{t('rooms.emptyHint')}</p>
        </Panel>
      ) : (
        <div className="space-y-2" aria-live="polite">
          {list.rooms.map((room) => (
            <RoomCard key={room.code} room={room} joining={joining === room.code} onJoin={() => void join(room.code)} />
          ))}
        </div>
      )}
    </Screen>
  );
}
