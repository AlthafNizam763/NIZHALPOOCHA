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
import { Modal, Spinner } from '@/components/ui/Controls';
import { Button } from '@/components/ui/Button';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { CustomizePanel } from '@/components/lobby/CustomizePanel';
import { HomeBackdrop } from '@/components/home/HomeBackdrop';
import { HomeScene } from '@/components/home/HomeScene';
import { TitleLogo } from '@/components/home/TitleLogo';
import { HowToPlay } from '@/components/home/HowToPlay';
import { IconBolt, IconBook, IconDoor, IconGear, IconKey, IconLanguage, IconMoon, IconShirt, IconSound, IconTrophy } from '@/components/home/icons';
import { audio } from '@/services/audio';
import { onboardingRoute } from '@/services/onboarding';
import { useRoom } from '@/state/roomStore';

const VERSION = 'v0.1.0';

/** Card illustrations: original Kadalimukku villagers (never game-accurate roles). */
const CROWD: Appearance[] = [
  { body: 'girl', skin: 3, hair: 2, hairColor: 0, top: 5, topStyle: 'shirt', bottom: 7, footwear: 'sandals', accessory: 'none' },
  { body: 'boy', skin: 1, hair: 0, hairColor: 1, top: 3, topStyle: 'raincoat', bottom: 6, footwear: 'shoes', accessory: 'umbrella' },
  { body: 'girl', skin: 0, hair: 3, hairColor: 2, top: 7, topStyle: 'tshirt', bottom: 2, footwear: 'sandals', accessory: 'backpack' },
];
const FRIENDS: Appearance[] = [
  { body: 'boy', skin: 2, hair: 1, hairColor: 0, top: 4, topStyle: 'shirt', bottom: 6, footwear: 'sandals', accessory: 'glasses' },
  { body: 'girl', skin: 1, hair: 1, hairColor: 3, top: 0, topStyle: 'tshirt', bottom: 4, footwear: 'shoes', accessory: 'none' },
];

const click = (fn: () => void) => () => {
  audio.play('click');
  fn();
};

/** Big illustrated card button (ONLINE / PRIVATE). */
function PlayCard({
  title,
  onClick,
  disabled,
  tone,
  children,
  footer,
}: {
  title: string;
  onClick: () => void;
  disabled?: boolean;
  tone: 'amber' | 'violet';
  children: ReactNode;
  footer: ReactNode;
}) {
  const frame =
    tone === 'amber'
      ? 'from-[#ffd77a] via-[#e9a33a] to-[#9a5a14] shadow-[0_0_28px_rgba(233,163,58,.45)]'
      : 'from-[#c9a2ff] via-[#8b5cf6] to-[#4c2a99] shadow-[0_0_28px_rgba(139,92,246,.45)]';
  const inner = tone === 'amber' ? 'from-[#6b4212] via-[#3d250b] to-[#221406]' : 'from-[#3f2a78] via-[#26184d] to-[#150d2c]';
  return (
    <button
      onClick={click(onClick)}
      disabled={disabled}
      className={`group relative rounded-2xl bg-gradient-to-b p-[3px] text-left transition-transform duration-150 hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:hover:translate-y-0 ${frame}`}
    >
      <div className={`flex h-full flex-col items-center overflow-hidden rounded-[13px] bg-gradient-to-b px-3 pt-2 pb-3 [@media(max-height:560px)]:pt-1 [@media(max-height:560px)]:pb-2 ${inner}`}>
        <span
          className="max-w-full font-display text-2xl font-extrabold uppercase tracking-wide text-[#fff5dd] max-[400px]:text-lg sm:text-3xl"
          style={{ textShadow: '1.5px 1.5px 0 #1b0f06, -1.5px -1.5px 0 #1b0f06, 1.5px -1.5px 0 #1b0f06, -1.5px 1.5px 0 #1b0f06, 0 1.5px 0 #1b0f06, 0 -1.5px 0 #1b0f06, 1.5px 0 0 #1b0f06, -1.5px 0 0 #1b0f06, 0 3px 0 #1b0f06' }}
        >
          {title}
        </span>
        <div className="flex h-24 w-full items-end justify-center sm:h-28 [@media(max-height:820px)]:h-[4.5rem] [@media(max-height:560px)]:hidden">
          <div className="origin-bottom [@media(max-height:820px)]:scale-[0.7]">{children}</div>
        </div>
        <div className="mt-1 w-full border-t border-white/10 pt-2 text-center [@media(max-height:560px)]:mt-0 [@media(max-height:560px)]:border-0 [@media(max-height:560px)]:pt-0">{footer}</div>
      </div>
    </button>
  );
}

/** Glossy 3D pill button (HOW TO PLAY / QUICK PLAY). */
function GlossButton({ label, icon, onClick, disabled, tone }: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean; tone: 'blue' | 'green' }) {
  const color =
    tone === 'blue'
      ? 'from-[#4d8ff0] to-[#1f4fb8] border-[#15357d] shadow-[0_6px_18px_rgba(31,79,184,.45)]'
      : 'from-[#4cc36a] to-[#1f8a3c] border-[#135c27] shadow-[0_6px_18px_rgba(31,138,60,.45)]';
  return (
    <button
      onClick={click(onClick)}
      disabled={disabled}
      className={`relative flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-xl [@media(max-height:480px)]:min-h-10 border-2 border-b-[5px] bg-gradient-to-b px-3 py-1.5 font-display font-extrabold uppercase leading-tight text-white transition-transform active:translate-y-0.5 active:border-b-2 disabled:opacity-50 max-[400px]:text-sm sm:text-xl ${color}`}
      style={{ textShadow: '0 2px 0 rgba(0,0,0,.45)' }}
    >
      <span className="pointer-events-none absolute inset-x-1 top-0.5 h-1/2 rounded-t-lg bg-white/15" />
      <span className="relative shrink-0 max-[400px]:hidden">{icon}</span>
      <span className="relative">{label}</span>
    </button>
  );
}

/** Octagonal framed icon button for the bottom tray. */
function OctButton({ label, onClick, children, tone = 'violet' }: { label: string; onClick: () => void; children: ReactNode; tone?: 'violet' | 'teal' | 'gold' }) {
  const ring = { violet: 'bg-[#8b5cf6]', teal: 'bg-[#2aa3b8]', gold: 'bg-[#e9a33a]' }[tone];
  return (
    <button onClick={click(onClick)} aria-label={label} title={label} className={`octagon group h-14 w-14 p-[3px] transition-transform hover:-translate-y-0.5 max-[420px]:h-12 max-[420px]:w-12 sm:h-16 sm:w-16 [@media(max-height:480px)]:h-12 [@media(max-height:480px)]:w-12 ${ring}`}>
      <span className="octagon flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-[#1d2440] to-[#0d1122] text-paper group-hover:text-lamp">{children}</span>
    </button>
  );
}

function RailTile({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={click(onClick)}
      className="flex w-24 flex-col items-center gap-1 rounded-2xl bg-gradient-to-b from-[#9b6bff] to-[#4c2a99] p-[3px] transition-transform hover:-translate-y-0.5"
    >
      <span className="flex w-full flex-col items-center gap-1 rounded-[13px] bg-gradient-to-b from-[#1d2440] to-[#0d1122] px-1 py-2 text-paper">
        {children}
        <span className="text-center text-[10px] font-bold leading-tight uppercase">{label}</span>
      </span>
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
  const inRoom = useRoom((s) => !!s.room);
  // First-run players finish the intro and tutorial before reaching Home.
  const pending = profile && !inRoom ? onboardingRoute(profile) : null;

  useEffect(() => {
    if (pending) router.replace(pending);
  }, [pending, router]);

  useEffect(() => {
    if (!connected) return;
    const load = () => void rooms.list().then((r) => r.ok && setOnline(r.data.online));
    load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, [connected]);

  if (!ready) return <LoadingScreen messageKey="loading.session" />;
  if (!profile || !user || pending) return <LoadingScreen messageKey="loading.profile" />;
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

  return (
    <main className="relative flex min-h-dvh flex-col overflow-x-hidden pt-safe pb-safe pl-safe pr-safe">
      <HomeBackdrop />
      <HomeScene />

      {/* Top bar */}
      <header className="relative z-20 flex items-start justify-between gap-3 px-6 pt-[6vh] sm:px-[5vw] [@media(max-height:820px)]:pt-[5vh] [@media(max-height:480px)]:absolute [@media(max-height:480px)]:inset-x-0 [@media(max-height:480px)]:top-0 [@media(max-height:480px)]:pt-[7vh]">
        <div className="flex flex-col gap-1 text-xs text-mist">
          <span className="drop-shadow">
            {VERSION} · {t('app.town')}
          </span>
          {user.isDev && <span className="self-start rounded bg-lamp/20 px-1.5 py-0.5 text-lamp">DEV</span>}
        </div>
        <button
          onClick={click(() => router.push('/profile'))}
          className="flex items-center gap-2 rounded-2xl border-2 border-white/15 bg-[#0d1122]/85 py-1 pl-1 pr-3 text-left hover:border-lamp/70"
          aria-label={t('home.profile')}
        >
          <span className="overflow-hidden rounded-xl bg-[#1d2440]">
            <CharacterAvatar appearance={profile.appearance} size={42} />
          </span>
          <span className="min-w-0">
            <span className="block max-w-32 truncate text-sm font-bold">{profile.username}</span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-lamp">
              {t('home.level', { n: lvl.level })}
              <span className="h-1 w-12 overflow-hidden rounded-full bg-black/50">
                <span className="block h-full bg-lamp" style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
              </span>
            </span>
          </span>
          <span className={`ml-1 h-2.5 w-2.5 rounded-full ${connected ? 'bg-[#4cc36a] shadow-[0_0_6px_#4cc36a]' : 'bg-rain'}`} aria-hidden />
        </button>
      </header>

      {/* Middle: rail + title + play cards */}
      <div className="relative z-10 flex flex-1 items-center">
        <nav className="hidden flex-col gap-3 pl-[5vw] sm:flex" aria-label={t('home.profile')}>
          <RailTile label={t('home.profile')} onClick={() => router.push('/profile')}>
            <CharacterAvatar appearance={profile.appearance} size={44} />
          </RailTile>
          <RailTile label={t('home.leaderboard')} onClick={() => router.push('/leaderboard')}>
            <IconTrophy className="h-8 w-8 text-lamp" />
          </RailTile>
          <RailTile label={t('story.title')} onClick={() => router.push('/story')}>
            <IconMoon className="h-8 w-8 text-lamp" />
          </RailTile>
        </nav>

        <section className="flex flex-1 flex-col items-center gap-4 px-4 py-5 [@media(max-height:820px)]:gap-3 [@media(max-height:820px)]:py-2 [@media(max-height:480px)]:gap-2 [@media(max-height:480px)]:py-1">
          <div className="animate-rise pt-4 [@media(max-height:820px)]:pt-3 [@media(max-height:480px)]:pt-1">
            <div className="[@media(max-height:820px)]:hidden">
              <TitleLogo />
            </div>
            <div className="hidden [@media(max-height:820px)]:block">
              <TitleLogo compact />
            </div>
          </div>
          <p className="-mt-1 text-center text-sm font-semibold text-paper drop-shadow-[0_2px_2px_rgba(0,0,0,.8)] [@media(max-height:680px)]:hidden">{t('app.tagline')}</p>

          <div className="w-full max-w-lg rounded-3xl bg-black/35 p-2.5 ring-1 ring-white/10 backdrop-blur-[2px] sm:p-3 [@media(max-height:480px)]:p-1.5">
            <div className="grid grid-cols-2 gap-3">
              <PlayCard
                title={t('home.online')}
                tone="amber"
                onClick={() => router.push('/rooms')}
                disabled={!connected}
                footer={
                  <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full border border-[#4cc36a]/50 bg-black/40 px-2.5 py-0.5 text-xs font-semibold text-[#7ee29a] max-[400px]:px-1.5 max-[400px]:text-[11px] sm:text-sm">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-[#4cc36a]" />
                    <span className="min-w-0">{online !== null ? t('rooms.online', { n: online }) : t('home.onlineHint')}</span>
                  </span>
                }
              >
                <div className="flex items-end">
                  <CharacterAvatar appearance={CROWD[0]!} size={78} className="-mr-4 opacity-90" />
                  <CharacterAvatar appearance={CROWD[1]!} size={104} className="relative z-10" />
                  <CharacterAvatar appearance={CROWD[2]!} size={78} className="-ml-4 opacity-90" />
                </div>
              </PlayCard>
              <PlayCard
                title={t('home.private')}
                tone="violet"
                onClick={() => setPrivateOpen(true)}
                disabled={!connected}
                footer={<span className="text-xs leading-tight text-[#e6dbff] [@media(max-height:560px)]:hidden">{t('home.privateHint')}</span>}
              >
                <div className="flex items-end gap-1">
                  <CharacterAvatar appearance={FRIENDS[0]!} size={88} />
                  <IconKey className="mb-6 h-10 w-10 drop-shadow-[0_0_8px_rgba(233,176,79,.6)]" />
                  <CharacterAvatar appearance={FRIENDS[1]!} size={88} />
                </div>
              </PlayCard>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 [@media(max-height:480px)]:mt-1.5">
              <GlossButton tone="blue" label={t('home.howToPlay')} icon={<IconBook className="h-6 w-6" />} onClick={() => setHowTo(true)} />
              <GlossButton
                tone="green"
                label={t('home.quickPlay')}
                icon={busy ? <Spinner className="h-5 w-5 border-white" /> : <IconBolt className="h-6 w-6" />}
                onClick={() => void quickPlay()}
                disabled={!connected || busy}
              />
            </div>
          </div>

          <div className="flex w-full max-w-lg flex-col gap-2 [@media(max-height:480px)]:text-[11px]">
            {!connected && (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-sm text-mist" role="status">
                <Spinner className="h-4 w-4" />
                {t('conn.connecting')}
              </div>
            )}
            {profileSync !== 'ok' && (
              <p className="rounded-lg border border-lamp/40 bg-black/70 p-2.5 text-xs text-lamp" role="status">
                {t(profileSync === 'denied' ? 'profile.syncDenied' : 'profile.syncOffline')}
              </p>
            )}
            {user.isDev && <p className="rounded-lg border border-lamp/40 bg-black/70 p-2.5 text-xs text-lamp [@media(max-height:480px)]:hidden">{t('common.devMode')}</p>}
          </div>
        </section>

        <div className="hidden w-[calc(5vw+6rem)] sm:block" />
      </div>

      {/* Bottom bar */}
      <footer className="relative z-10 flex flex-wrap items-end justify-between gap-3 px-6 pb-[3vh] sm:flex-nowrap sm:px-[5vw] [@media(max-height:480px)]:pb-1">
        <button
          onClick={click(() => void quit())}
          className="order-last flex h-12 shrink-0 [@media(max-height:480px)]:h-10 items-center gap-2 whitespace-nowrap rounded-xl border-2 border-[#e2554a] bg-[#0d1122]/90 px-4 font-display font-extrabold uppercase text-paper shadow-[0_0_14px_rgba(226,85,74,.35)] hover:bg-[#2a1116] sm:order-none"
        >
          <IconDoor className="h-5 w-5" />
          {native ? t('home.quit') : t('auth.logout')}
        </button>
        <div className="flex w-full justify-center sm:w-auto">
          <div className="flex gap-2 rounded-2xl bg-[#0d1122]/80 p-2 ring-1 ring-white/10 max-[420px]:gap-1.5 max-[420px]:p-1.5 sm:gap-3 [@media(max-height:480px)]:p-1">
            <OctButton label={t('home.settings')} onClick={() => router.push('/settings')}>
              <IconGear className="h-6 w-6" />
            </OctButton>
            <OctButton label={t('home.customize')} onClick={() => setCustomize(true)}>
              <IconShirt className="h-6 w-6" />
            </OctButton>
            <OctButton label={t('home.language')} tone="teal" onClick={() => settings.set({ language: settings.language === 'en' ? 'ml' : 'en' })}>
              <IconLanguage className="h-5 w-5" />
              <span className="text-[10px] font-bold leading-none">{settings.language === 'en' ? 'EN' : 'മ'}</span>
            </OctButton>
            <OctButton label={t('home.sound')} tone="teal" onClick={toggleSound}>
              <IconSound muted={muted} className="h-6 w-6" />
            </OctButton>
            <span className="sm:hidden">
              <OctButton label={t('home.leaderboard')} tone="gold" onClick={() => router.push('/leaderboard')}>
                <IconTrophy className="h-6 w-6" />
              </OctButton>
            </span>
            <span className="sm:hidden">
              <OctButton label={t('story.title')} tone="gold" onClick={() => router.push('/story')}>
                <IconMoon className="h-6 w-6" />
              </OctButton>
            </span>
          </div>
        </div>
        <div className="hidden w-32 sm:block" />
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
