'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Appearance, PublicRoomList, PublicRoomSummary } from '@nizhal/shared';
import { useAuth } from '@/state/authStore';
import { useConnection } from '@/state/connectionStore';
import { useUi } from '@/state/uiStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth, useRoomRedirect } from '@/hooks/useRoute';
import { rooms, errorKey } from '@/services/net';
import { Screen } from '@/components/ui/Screen';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Panel, Spinner } from '@/components/ui/Controls';
import { EmptyState } from '@/components/ui/Feedback';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { MapPreview } from '@/components/lobby/SettingsForm';
import { IconBolt } from '@/components/home/icons';

const REFRESH_MS = 4000;

/** Empty-state illustration: two villagers waiting at the junction (not real players). */
const WAITING: Appearance[] = [
  { body: 'boy', skin: 2, hair: 1, hairColor: 0, top: 3, topStyle: 'raincoat', bottom: 6, footwear: 'sandals', accessory: 'umbrella' },
  { body: 'girl', skin: 1, hair: 2, hairColor: 1, top: 5, topStyle: 'shirt', bottom: 4, footwear: 'sandals', accessory: 'none' },
];

function OnlineBadge({ n }: { n: number }) {
  const t = useT();
  return (
    <Badge tone="good">
      <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-leaf" />
      {t('rooms.online', { n })}
    </Badge>
  );
}

function RoomCard({ room, onJoin, joining }: { room: PublicRoomSummary; onJoin: () => void; joining: boolean }) {
  const t = useT();
  const statusTone = ({ open: 'good', full: 'gold', playing: 'neutral' } as const)[room.status];
  const fill = room.players / room.maxPlayers;
  return (
    <Panel className={`flex items-center gap-3 p-3 transition-colors sm:gap-4 sm:p-4 ${room.status === 'open' ? 'hover:border-lamp/60' : ''}`}>
      <MapPreview mapId={room.mapId} className="hidden h-16 w-20 shrink-0 sm:block" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-lg font-bold leading-tight text-paper">{t('rooms.hostRoom', { name: room.hostName })}</div>
        <div className="mt-0.5 text-sm leading-tight text-mist">{t(`map.${room.mapId}`)}</div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone={statusTone}>{t(`rooms.status.${room.status}`)}</Badge>
          <Badge>{t(`mode.${room.mode}`)}</Badge>
          {room.voiceChat && <Badge tone="info">{t('rooms.voice')}</Badge>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-2 w-full max-w-40 overflow-hidden rounded-full border border-line bg-ink">
            <div className={`h-full rounded-full ${fill >= 1 ? 'bg-lamp' : 'bg-moss'}`} style={{ width: `${fill * 100}%` }} />
          </div>
          <span className="font-display text-sm font-bold tabular-nums text-paper">
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
        <div className="flex shrink-0 items-center gap-2">
          {list && (
            <span className="hidden sm:inline-flex">
              <OnlineBadge n={list.online} />
            </span>
          )}
          <IconButton label={t('rooms.refresh')} onClick={() => void refresh()} disabled={!connected}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M20 12a8 8 0 1 1-2.34-5.66" />
              <path d="M20 4v5h-5" />
            </svg>
          </IconButton>
        </div>
      }
    >
      {list && (
        <div className="-mt-2 mb-3 sm:hidden">
          <OnlineBadge n={list.online} />
        </div>
      )}
      <div className="mb-5 grid grid-cols-2 gap-2">
        <Button variant="gold" icon={<IconBolt className="h-5 w-5 shrink-0" />} onClick={() => void quickPlay()} loading={joining === 'quick'} disabled={!connected}>
          {t('home.quickPlay')}
        </Button>
        <Button variant="secondary" onClick={() => router.push('/create/?public=1')} disabled={!connected}>
          {t('rooms.createPublic')}
        </Button>
      </div>

      {!list ? (
        <div className="flex justify-center py-10">
          <div className="surface flex items-center gap-3 rounded-full px-5 py-2.5 text-sm font-semibold text-mist" role="status">
            <Spinner className="h-6 w-8" />
            {t('common.loading')}
          </div>
        </div>
      ) : list.rooms.length === 0 ? (
        <EmptyState
          title={t('rooms.empty')}
          hint={t('rooms.emptyHint')}
          art={
            <div aria-hidden className="relative flex items-end gap-2">
              <span className="absolute inset-x-0 -bottom-1 mx-auto h-4 w-32 rounded-[50%] bg-[radial-gradient(ellipse,rgba(241,180,62,.28),transparent_70%)]" />
              <div className="animate-idle">
                <CharacterAvatar appearance={WAITING[0]!} size={84} mood="suspicious" blink />
              </div>
              <div className="animate-idle [animation-delay:.8s]">
                <CharacterAvatar appearance={WAITING[1]!} size={84} blink />
              </div>
            </div>
          }
          action={
            <Button variant="primary" onClick={() => router.push('/create/?public=1')} disabled={!connected}>
              {t('rooms.createPublic')}
            </Button>
          }
        />
      ) : (
        <div className="space-y-2.5" aria-live="polite">
          {list.rooms.map((room) => (
            <RoomCard key={room.code} room={room} joining={joining === room.code} onJoin={() => void join(room.code)} />
          ))}
        </div>
      )}
    </Screen>
  );
}
