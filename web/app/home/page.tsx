'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { levelFromXp } from '@nizhal/shared';
import { useAuth } from '@/state/authStore';
import { useConnection } from '@/state/connectionStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth, useRoomRedirect } from '@/hooks/useRoute';
import { rooms, errorKey } from '@/services/net';
import { logout } from '@/services/auth';
import { useUi } from '@/state/uiStore';
import { Screen } from '@/components/ui/Screen';
import { Logo } from '@/components/ui/Backdrop';
import { Button } from '@/components/ui/Button';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { Panel, Spinner } from '@/components/ui/Controls';
import { LoadingScreen } from '@/components/ui/LoadingScreen';

function Tile({ title, hint, onClick, accent, disabled, loading }: { title: string; hint: string; onClick: () => void; accent?: boolean; disabled?: boolean; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`group flex min-h-24 w-full flex-col justify-between rounded-2xl border p-4 text-left transition-colors disabled:opacity-50 ${
        accent ? 'border-moss-deep bg-moss hover:bg-moss-deep' : 'border-line bg-panel hover:bg-panel-2'
      }`}
    >
      <span className="font-display text-2xl leading-tight">{loading ? '…' : title}</span>
      <span className={`text-sm ${accent ? 'text-paper/80' : 'text-rain'}`}>{hint}</span>
    </button>
  );
}

export default function HomePage() {
  const ready = useRequireAuth();
  useRoomRedirect('menu');
  const t = useT();
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const user = useAuth((s) => s.user);
  const connected = useConnection((s) => s.status === 'connected');
  const toast = useUi((s) => s.toast);
  const [busy, setBusy] = useState(false);

  if (!ready) return <LoadingScreen messageKey="loading.session" />;
  if (!profile) return <LoadingScreen messageKey="loading.profile" />;
  const lvl = levelFromXp(profile.xp);

  async function quickPlay() {
    setBusy(true);
    const r = await rooms.quickPlay({ name: profile!.username, appearance: profile!.appearance });
    setBusy(false);
    if (r.ok) router.push('/lobby');
    else toast(errorKey(r.error), undefined, 'danger');
  }

  return (
    <Screen wide>
      <div className="grid gap-5 md:grid-cols-[1fr_1.3fr] md:items-start">
        <div className="space-y-4">
          <div className="hidden md:block">
            <Logo small />
          </div>
          <Panel className="flex items-center gap-4 p-4">
            <CharacterAvatar appearance={profile.appearance} size={88} animate />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-rain">{t('app.town')}</div>
              <div className="font-display truncate text-2xl">{t('home.greeting', { name: profile.username })}</div>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="rounded-md bg-night px-2 py-0.5 text-lamp">{t('home.level', { n: lvl.level })}</span>
                <span className="text-rain">
                  {lvl.into}/{lvl.needed} XP
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-night">
                <div className="h-full bg-lamp" style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
              </div>
            </div>
          </Panel>
          <p className="hidden text-sm leading-relaxed text-mist md:block">{t('home.story')}</p>
          {user?.isDev && <p className="rounded-lg border border-lamp/40 bg-night p-3 text-xs text-lamp">{t('common.devMode')}</p>}
        </div>

        <div className="space-y-3">
          <div className="md:hidden">
            <Logo small />
          </div>
          {!connected && (
            <div className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-sm text-mist" role="status">
              <Spinner className="h-4 w-4" />
              {t('conn.connecting')}
            </div>
          )}
          <Tile title={t('home.quickPlay')} hint={t('home.quickPlayHint')} accent onClick={() => void quickPlay()} disabled={!connected} loading={busy} />
          <div className="grid grid-cols-2 gap-3">
            <Tile title={t('home.create')} hint={t('home.createHint')} onClick={() => router.push('/create')} disabled={!connected} />
            <Tile title={t('home.join')} hint={t('home.joinHint')} onClick={() => router.push('/join')} disabled={!connected} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" onClick={() => router.push('/profile')}>
              {t('home.profile')}
            </Button>
            <Button variant="secondary" onClick={() => router.push('/leaderboard')}>
              {t('home.leaderboard')}
            </Button>
            <Button variant="secondary" onClick={() => router.push('/settings')}>
              {t('home.settings')}
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => void logout().then(() => router.replace('/login'))}>
              {t('auth.logout')}
            </Button>
          </div>
        </div>
      </div>
    </Screen>
  );
}
