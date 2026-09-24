'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { levelFromXp, type Appearance } from '@nizhal/shared';
import { useAuth } from '@/state/authStore';
import { useConnection } from '@/state/connectionStore';
import { useSettings } from '@/state/settingsStore';
import { useUi } from '@/state/uiStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth, useRoomRedirect } from '@/hooks/useRoute';
import { rooms, errorKey } from '@/services/net';
import { logout } from '@/services/auth';
import { saveProfile } from '@/services/profile';
import { Logo } from '@/components/ui/Backdrop';
import { Modal, Spinner } from '@/components/ui/Controls';
import { Button } from '@/components/ui/Button';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { CustomizePanel } from '@/components/lobby/CustomizePanel';
import { HomeBackdrop } from '@/components/home/HomeBackdrop';
import { HowToPlay } from '@/components/home/HowToPlay';
import { IconDoor, IconGear, IconLanguage, IconShirt, IconSound, IconTrophy } from '@/components/home/icons';
import { audio } from '@/services/audio';

const VERSION = 'v0.1.0';

/** Big outlined title-screen button. */
function MainButton({ label, hint, onClick, disabled, busy }: { label: string; hint?: string; onClick: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <button
      onClick={() => {
        audio.play('click');
        onClick();
      }}
      disabled={disabled || busy}
      className="group flex min-h-16 flex-col items-center justify-center rounded-xl border-2 border-paper/85 bg-ink/45 px-4 py-2 backdrop-blur-[2px] transition-colors hover:border-lamp hover:bg-ink/65 disabled:opacity-45 sm:min-h-20 [@media(max-height:480px)]:min-h-14"
    >
      <span className="font-display text-2xl uppercase leading-tight tracking-wider text-paper group-hover:text-lamp sm:text-3xl [@media(max-height:480px)]:text-2xl">
        {busy ? <Spinner className="h-6 w-6" /> : label}
      </span>
      {hint && <span className="mt-1 text-xs text-mist">{hint}</span>}
    </button>
  );
}

function SubButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => {
        audio.play('click');
        onClick();
      }}
      disabled={disabled}
      className="min-h-11 rounded-lg border-2 border-paper/70 bg-ink/45 px-3 py-1.5 font-display text-base leading-tight uppercase tracking-wide text-paper transition-colors hover:border-lamp hover:text-lamp disabled:opacity-45 sm:text-lg"
    >
      {label}
    </button>
  );
}

/** Square framed button for the side rail and bottom row. */
function IconButton({ label, onClick, children, accent }: { label: string; onClick: () => void; children: ReactNode; accent?: boolean }) {
  return (
    <button
      onClick={() => {
        audio.play('click');
        onClick();
      }}
      aria-label={label}
      title={label}
      className={`flex h-14 w-14 flex-col items-center justify-center gap-0.5 rounded-xl border-2 bg-ink/55 text-paper transition-colors hover:border-lamp hover:text-lamp sm:h-16 sm:w-16 [@media(max-height:480px)]:h-12 [@media(max-height:480px)]:w-12 ${
        accent ? 'border-moss' : 'border-paper/60'
      }`}
    >
      {children}
    </button>
  );
}

function RailButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={() => {
        audio.play('click');
        onClick();
      }}
      className="flex w-24 flex-col items-center gap-1 rounded-xl border-2 border-moss bg-ink/55 px-1 py-2 text-paper transition-colors hover:border-lamp hover:text-lamp"
    >
      {children}
      <span className="text-center text-[10px] font-semibold leading-tight uppercase">{label}</span>
    </button>
  );
}

export default function HomePage() {
  const ready = useRequireAuth();
  useRoomRedirect('menu');
  const t = useT();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const setProfile = useAuth((s) => s.setProfile);
  const profileSync = useAuth((s) => s.profileSync);
  const connected = useConnection((s) => s.status === 'connected');
  const settings = useSettings();
  const toast = useUi((s) => s.toast);
  const [busy, setBusy] = useState(false);
  const [online, setOnline] = useState<number | null>(null);
  const [howTo, setHowTo] = useState(false);
  const [privateOpen, setPrivateOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastVolume, setLastVolume] = useState(0.8);
  const native = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!connected) return;
    const load = () => void rooms.list().then((r) => r.ok && setOnline(r.data.online));
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [connected]);

  if (!ready) return <LoadingScreen messageKey="loading.session" />;
  if (!profile || !user) return <LoadingScreen messageKey="loading.profile" />;
  const lvl = levelFromXp(profile.xp);
  const muted = settings.masterVolume === 0;

  async function quickPlay() {
    setBusy(true);
    const r = await rooms.quickPlay({ name: profile!.username, appearance: profile!.appearance });
    setBusy(false);
    if (r.ok) router.push('/lobby');
    else toast(errorKey(r.error), undefined, 'danger');
  }

  async function saveLook(name: string, appearance: Appearance) {
    setSaving(true);
    try {
      await saveProfile(user!, { username: name, appearance });
      setProfile({ ...profile!, username: name, appearance });
      setCustomize(false);
      toast('common.saved', undefined, 'good');
    } catch {
      toast('err.SERVER_ERROR', undefined, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function quit() {
    if (native) {
      const { App } = await import('@capacitor/app');
      await App.exitApp();
    } else {
      await logout();
      router.replace('/login');
    }
  }

  const toggleSound = () => {
    if (muted) settings.set({ masterVolume: lastVolume || 0.8 });
    else {
      setLastVolume(settings.masterVolume);
      settings.set({ masterVolume: 0 });
    }
  };

  const bottomIcons = (
    <>
      <IconButton label={t('home.settings')} onClick={() => router.push('/settings')}>
        <IconGear className="h-6 w-6" />
      </IconButton>
      <IconButton label={t('home.customize')} onClick={() => setCustomize(true)}>
        <IconShirt className="h-6 w-6" />
      </IconButton>
      <IconButton label={t('home.language')} onClick={() => settings.set({ language: settings.language === 'en' ? 'ml' : 'en' })}>
        <IconLanguage className="h-5 w-5" />
        <span className="text-[10px] font-bold leading-none">{settings.language === 'en' ? 'EN' : 'മ'}</span>
      </IconButton>
      <IconButton label={t('home.sound')} onClick={toggleSound}>
        <IconSound muted={muted} className="h-6 w-6" />
      </IconButton>
      <span className="sm:hidden">
        <IconButton label={t('home.leaderboard')} onClick={() => router.push('/leaderboard')} accent>
          <IconTrophy className="h-6 w-6" />
        </IconButton>
      </span>
    </>
  );

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden pt-safe pb-safe pl-safe pr-safe">
      <HomeBackdrop />

      {/* Top bar */}
      <header className="flex items-start justify-between gap-3 px-3 pt-1 sm:px-5">
        <div className="flex flex-col gap-1 text-xs text-rain">
          <span>
            {VERSION} · {t('app.town')}
          </span>
          {user.isDev && <span className="self-start rounded bg-lamp/20 px-1.5 py-0.5 text-lamp">DEV</span>}
        </div>
        <button
          onClick={() => router.push('/profile')}
          className="flex items-center gap-2 rounded-xl border border-line bg-ink/60 py-1 pl-1 pr-3 text-left backdrop-blur-[2px] hover:border-mist"
          aria-label={t('home.profile')}
        >
          <span className="overflow-hidden rounded-lg bg-night">
            <CharacterAvatar appearance={profile.appearance} size={40} />
          </span>
          <span className="min-w-0">
            <span className="block max-w-32 truncate text-sm font-semibold">{profile.username}</span>
            <span className="flex items-center gap-1.5 text-[11px] text-lamp">
              {t('home.level', { n: lvl.level })}
              <span className="h-1 w-12 overflow-hidden rounded-full bg-night">
                <span className="block h-full bg-lamp" style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
              </span>
            </span>
          </span>
        </button>
      </header>

      {/* Middle: side rail + title + main actions */}
      <div className="flex flex-1 items-center">
        <nav className="hidden flex-col gap-3 pl-4 sm:flex" aria-label={t('home.profile')}>
          <RailButton label={t('home.profile')} onClick={() => router.push('/profile')}>
            <CharacterAvatar appearance={profile.appearance} size={40} />
          </RailButton>
          <RailButton label={t('home.leaderboard')} onClick={() => router.push('/leaderboard')}>
            <IconTrophy className="h-7 w-7" />
          </RailButton>
        </nav>

        <section className="flex flex-1 flex-col items-center gap-5 px-4 py-6 [@media(max-height:480px)]:gap-3 [@media(max-height:480px)]:py-2">
          <div className="animate-rise drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
            <div className="[@media(max-height:480px)]:hidden">
              <Logo />
            </div>
            <div className="hidden [@media(max-height:480px)]:block">
              <Logo small />
            </div>
          </div>
          <p className="-mt-2 text-center text-sm text-mist [@media(max-height:480px)]:hidden">{t('app.tagline')}</p>

          <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:gap-4">
            <MainButton
              label={t('home.online')}
              hint={online !== null ? t('rooms.online', { n: online }) : t('home.onlineHint')}
              onClick={() => router.push('/rooms')}
              disabled={!connected}
            />
            <MainButton label={t('home.private')} hint={t('home.privateHint')} onClick={() => setPrivateOpen(true)} disabled={!connected} />
          </div>
          <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:gap-4">
            <SubButton label={t('home.howToPlay')} onClick={() => setHowTo(true)} />
            <SubButton label={busy ? '…' : t('home.quickPlay')} onClick={() => void quickPlay()} disabled={!connected || busy} />
          </div>

          <div className="flex w-full max-w-md flex-col gap-2 [@media(max-height:480px)]:gap-1 [@media(max-height:480px)]:text-[11px]">
            {!connected && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-ink/60 px-3 py-2 text-sm text-mist" role="status">
                <Spinner className="h-4 w-4" />
                {t('conn.connecting')}
              </div>
            )}
            {profileSync !== 'ok' && (
              <p className="rounded-lg border border-lamp/40 bg-ink/70 p-2.5 text-xs text-lamp" role="status">
                {t(profileSync === 'denied' ? 'profile.syncDenied' : 'profile.syncOffline')}
              </p>
            )}
            {user.isDev && <p className="rounded-lg border border-lamp/40 bg-ink/70 p-2.5 text-xs text-lamp [@media(max-height:480px)]:hidden">{t('common.devMode')}</p>}
          </div>
        </section>

        <div className="hidden w-24 sm:block" />
      </div>

      {/* Bottom bar */}
      <footer className="flex flex-wrap items-end justify-between gap-3 px-3 pb-2 sm:flex-nowrap sm:gap-2 sm:px-5 [@media(max-height:480px)]:pb-1">
        <button
          onClick={() => void quit()}
          className="order-last flex h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border-2 border-paper/70 bg-ink/55 px-3 font-display uppercase tracking-wide text-paper hover:border-laterite hover:text-laterite sm:order-none"
        >
          <IconDoor className="h-5 w-5" />
          {native ? t('home.quit') : t('auth.logout')}
        </button>
        <div className="flex w-full justify-center gap-2 sm:w-auto">{bottomIcons}</div>
        <div className="hidden w-28 sm:block" />
      </footer>

      <HowToPlay open={howTo} onClose={() => setHowTo(false)} />

      <Modal open={privateOpen} onClose={() => setPrivateOpen(false)} title={t('home.private')}>
        <p className="mb-4 text-sm text-mist">{t('home.privateHint')}</p>
        <div className="grid gap-2">
          <Button size="lg" onClick={() => router.push('/create')}>
            {t('home.create')}
          </Button>
          <Button size="lg" variant="secondary" onClick={() => router.push('/join')}>
            {t('home.join')}
          </Button>
        </div>
      </Modal>

      <Modal open={customize} onClose={() => setCustomize(false)} title={t('custom.title')} wide>
        <CustomizePanel initialName={profile.username} initial={profile.appearance} onSave={(n, a) => void saveLook(n, a)} saving={saving} />
      </Modal>
    </main>
  );
}
