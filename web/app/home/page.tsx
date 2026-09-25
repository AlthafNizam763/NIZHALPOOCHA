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
import { Badge, Modal, Spinner } from '@/components/ui/Controls';
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

/** Hero-stage extras standing beside the player. */
const STAGE: Appearance[] = [
  { body: 'girl', skin: 1, hair: 2, hairColor: 0, top: 2, topStyle: 'shirt', bottom: 4, footwear: 'sandals', accessory: 'none' },
  { body: 'boy', skin: 3, hair: 1, hairColor: 0, top: 6, topStyle: 'shirt', bottom: 4, footwear: 'sandals', accessory: 'none' },
];

const click = (fn: () => void) => () => {
  audio.play('click');
  fn();
};

/** Big illustrated play card (ONLINE / PRIVATE): tactile, solid, one accent each. */
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
  tone: 'gold' | 'moss';
  children: ReactNode;
  footer: ReactNode;
}) {
  const frame = tone === 'gold' ? 'border-lamp border-b-gold-deep' : 'border-leaf/70 border-b-moss-deep';
  const glow = tone === 'gold' ? 'bg-[radial-gradient(ellipse_at_50%_100%,rgba(241,180,62,.32),transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_50%_100%,rgba(130,212,156,.24),transparent_70%)]';
  const titleColor = tone === 'gold' ? 'text-lamp' : 'text-leaf';
  return (
    <button
      onClick={click(onClick)}
      disabled={disabled}
      className={`tactile group relative flex flex-col items-center overflow-hidden rounded-[var(--radius-card)] border-2 border-b-[6px] bg-panel px-3 pt-2 pb-3 text-left active:border-b-[3px] [@media(max-height:560px)]:pt-1 [@media(max-height:560px)]:pb-2 ${frame}`}
    >
      <span aria-hidden className={`pointer-events-none absolute inset-0 ${glow}`} />
      <span className={`headline relative max-w-full text-2xl uppercase tracking-wide max-[400px]:text-lg sm:text-3xl ${titleColor}`}>{title}</span>
      <div className="relative flex h-24 w-full items-end justify-center sm:h-28 [@media(max-height:820px)]:h-[4.5rem] [@media(max-height:560px)]:hidden">
        <div className="origin-bottom transition-transform duration-200 group-hover:scale-105 [@media(max-height:820px)]:scale-[0.7] [@media(max-height:820px)]:group-hover:scale-[0.74]">{children}</div>
      </div>
      <div className="relative mt-1 w-full border-t border-line pt-2 text-center [@media(max-height:560px)]:mt-0 [@media(max-height:560px)]:border-0 [@media(max-height:560px)]:pt-0">{footer}</div>
    </button>
  );
}

/** Wide action button under the cards (HOW TO PLAY / QUICK PLAY). */
function ActionButton({ label, icon, onClick, disabled, tone }: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean; tone: 'canal' | 'moss' }) {
  const color = tone === 'canal' ? 'bg-canal border-canal-deep' : 'bg-moss border-moss-deep';
  return (
    <button
      onClick={click(onClick)}
      disabled={disabled}
      className={`tactile relative flex min-h-12 items-center justify-center gap-2 rounded-2xl border-2 border-b-[5px] px-3 py-1.5 font-display font-extrabold uppercase leading-tight text-paper active:border-b-2 max-[400px]:text-sm sm:text-xl [@media(max-height:480px)]:min-h-10 ${color}`}
      style={{ textShadow: '0 2px 0 rgba(0,0,0,.35)' }}
    >
      <span className="relative shrink-0 max-[400px]:hidden">{icon}</span>
      <span className="relative">{label}</span>
    </button>
  );
}

/** Round icon button for the bottom tray (settings, wardrobe, language, sound…). */
function TrayButton({ label, onClick, children, active }: { label: string; onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button
      onClick={click(onClick)}
      aria-label={label}
      title={label}
      className={`tactile flex h-14 w-14 flex-col items-center justify-center rounded-full border-2 border-b-ink bg-panel-2 text-paper hover:text-lamp max-[420px]:h-12 max-[420px]:w-12 sm:h-16 sm:w-16 [@media(max-height:480px)]:h-12 [@media(max-height:480px)]:w-12 ${active ? 'border-lamp/70' : 'border-line'}`}
    >
      {children}
    </button>
  );
}

function RailTile({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={click(onClick)} className="tactile surface flex w-24 flex-col items-center gap-1 rounded-2xl border-b-ink px-1 py-2 text-paper hover:border-lamp/60">
      {children}
      <span className="text-center font-display text-xs font-bold uppercase leading-tight">{label}</span>
    </button>
  );
}

/**
 * Hero stage: three villagers under the lamp, their shadows thrown on the wall
 * behind them. One shadow has cat ears — "Everyone looks human. Not everyone is."
 * The player stands in the middle.
 */
function ShadowLineup({ me }: { me: Appearance }) {
  const cast = [
    { a: STAGE[0]!, size: 92, cat: false, delay: '0s', mood: 'suspicious' as const },
    { a: me, size: 118, cat: false, delay: '0.6s', mood: 'happy' as const },
    { a: STAGE[1]!, size: 92, cat: true, delay: '1.2s', mood: 'sly' as const },
  ];
  return (
    <div aria-hidden className="relative flex items-end justify-center gap-5 px-6 [@media(max-height:820px)]:hidden">
      <span className="absolute inset-x-0 bottom-0 mx-auto h-6 w-72 rounded-[50%] bg-[radial-gradient(ellipse,rgba(241,180,62,.28),transparent_70%)]" />
      {cast.map((c, i) => (
        <div key={i} className="relative">
          {/* shadow on the wall */}
          <svg viewBox="0 0 60 100" className="absolute -top-3 left-1/2 w-[70%] -translate-x-[35%] opacity-60" style={{ height: c.size * 0.9 }}>
            {c.cat ? (
              <>
                <path d="M16 30 L15 6 L25 16 Q30 14 35 16 L45 6 L44 30 Q46 42 38 46 Q54 52 54 100 L6 100 Q6 52 22 46 Q14 42 16 30 Z" fill="#050b08" />
                <g className="animate-eyes">
                  <ellipse cx="24" cy="28" rx="2.6" ry="1.7" fill="#f1b43e" />
                  <ellipse cx="36" cy="28" rx="2.6" ry="1.7" fill="#f1b43e" />
                </g>
              </>
            ) : (
              <path d="M18 28 Q18 10 30 10 Q42 10 42 28 Q42 40 36 46 Q54 52 54 100 L6 100 Q6 52 24 46 Q18 40 18 28 Z" fill="#050b08" />
            )}
          </svg>
          <div className="animate-idle relative" style={{ animationDelay: c.delay }}>
            <CharacterAvatar appearance={c.a} size={c.size} mood={c.mood} blink />
          </div>
          {i === 1 && <span className="absolute -bottom-1 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-lamp" />}
        </div>
      ))}
    </div>
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
          <span className="font-semibold drop-shadow">
            {VERSION} · {t('app.town')}
          </span>
          {user.isDev && (
            <span className="self-start [@media(max-height:480px)]:hidden">
              <Badge tone="gold">DEV</Badge>
            </span>
          )}
        </div>
        <button
          onClick={click(() => router.push('/profile'))}
          className="tactile surface flex items-center gap-2 rounded-full border-b-ink py-1 pl-1 pr-3 text-left hover:border-lamp/70"
          aria-label={t('home.profile')}
        >
          <span className="overflow-hidden rounded-full border-2 border-lamp/70 bg-night">
            <CharacterAvatar appearance={profile.appearance} size={42} />
          </span>
          <span className="min-w-0">
            <span className="block max-w-32 truncate font-display text-sm font-bold">{profile.username}</span>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-lamp">
              {t('home.level', { n: lvl.level })}
              <span className="h-1.5 w-12 overflow-hidden rounded-full bg-ink">
                <span className="block h-full bg-lamp" style={{ width: `${(lvl.into / lvl.needed) * 100}%` }} />
              </span>
            </span>
          </span>
          <span className={`ml-1 h-2.5 w-2.5 rounded-full ${connected ? 'bg-leaf shadow-[0_0_6px_var(--color-leaf)]' : 'bg-rain'}`} aria-hidden />
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
          <p className="-mt-1 flex items-center gap-2 text-center font-display text-base font-bold text-paper drop-shadow-[0_2px_2px_rgba(0,0,0,.8)] [@media(max-height:680px)]:hidden">
            <span aria-hidden className="h-[2px] w-6 shrink-0 rounded-full bg-lamp/70 max-sm:hidden" />
            {t('app.tagline')}
            <span aria-hidden className="h-[2px] w-6 shrink-0 rounded-full bg-lamp/70 max-sm:hidden" />
          </p>

          <ShadowLineup me={profile.appearance} />

          <div className="w-full max-w-lg">
            <div className="grid grid-cols-2 gap-3">
              <PlayCard
                title={t('home.online')}
                tone="gold"
                onClick={() => router.push('/rooms')}
                disabled={!connected}
                footer={
                  <span className="inline-flex max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full bg-ink/70 px-2.5 py-0.5 text-xs font-semibold text-leaf max-[400px]:px-1.5 max-[400px]:text-[11px] sm:text-sm">
                    <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-leaf" />
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
                tone="moss"
                onClick={() => setPrivateOpen(true)}
                disabled={!connected}
                footer={<span className="text-xs leading-tight text-mist [@media(max-height:560px)]:hidden">{t('home.privateHint')}</span>}
              >
                <div className="flex items-end gap-1">
                  <CharacterAvatar appearance={FRIENDS[0]!} size={88} />
                  <IconKey className="mb-6 h-10 w-10 drop-shadow-[0_0_8px_rgba(241,180,62,.6)]" />
                  <CharacterAvatar appearance={FRIENDS[1]!} size={88} />
                </div>
              </PlayCard>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 [@media(max-height:480px)]:mt-1.5">
              <ActionButton tone="canal" label={t('home.howToPlay')} icon={<IconBook className="h-6 w-6" />} onClick={() => setHowTo(true)} />
              <ActionButton
                tone="moss"
                label={t('home.quickPlay')}
                icon={busy ? <Spinner className="h-5 w-7" /> : <IconBolt className="h-6 w-6" />}
                onClick={() => void quickPlay()}
                disabled={!connected || busy}
              />
            </div>
          </div>

          <div className="flex w-full max-w-lg flex-col gap-2 [@media(max-height:480px)]:text-[11px]">
            {!connected && (
              <div className="surface flex items-center justify-center gap-2 rounded-full px-3 py-1.5 text-sm text-mist" role="status">
                <Spinner className="h-5 w-7" />
                {t('conn.connecting')}
              </div>
            )}
            {profileSync !== 'ok' && (
              <p className="surface rounded-2xl border-lamp/40 p-2.5 text-xs text-lamp" role="status">
                {t(profileSync === 'denied' ? 'profile.syncDenied' : 'profile.syncOffline')}
              </p>
            )}
            {user.isDev && <p className="surface rounded-2xl border-lamp/40 p-2.5 text-xs text-lamp [@media(max-height:480px)]:hidden">{t('common.devMode')}</p>}
          </div>
        </section>

        <div className="hidden w-[calc(5vw+6rem)] sm:block" />
      </div>

      {/* Bottom bar */}
      <footer className="relative z-10 flex flex-wrap items-end justify-between gap-3 px-6 pb-[3vh] sm:flex-nowrap sm:px-[5vw] [@media(max-height:480px)]:pb-1">
        <button
          onClick={click(() => void quit())}
          className="tactile order-last flex h-12 shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl border-2 border-laterite border-b-laterite-deep bg-panel-2 px-4 font-display font-extrabold uppercase text-paper hover:bg-laterite/25 sm:order-none [@media(max-height:480px)]:h-10"
        >
          <IconDoor className="h-5 w-5" />
          {native ? t('home.quit') : t('auth.logout')}
        </button>
        <div className="flex w-full justify-center sm:w-auto">
          <div className="surface flex gap-2 rounded-full p-2 max-[420px]:gap-1.5 max-[420px]:p-1.5 sm:gap-3 [@media(max-height:480px)]:p-1">
            <TrayButton label={t('home.settings')} onClick={() => router.push('/settings')}>
              <IconGear className="h-6 w-6" />
            </TrayButton>
            <TrayButton label={t('home.customize')} onClick={() => setCustomize(true)}>
              <IconShirt className="h-6 w-6" />
            </TrayButton>
            <TrayButton label={t('home.language')} onClick={() => settings.set({ language: settings.language === 'en' ? 'ml' : 'en' })}>
              <IconLanguage className="h-5 w-5" />
              <span className="font-display text-[11px] font-bold leading-none text-lamp">{settings.language === 'en' ? 'EN' : 'മ'}</span>
            </TrayButton>
            <TrayButton label={t('home.sound')} onClick={toggleSound} active={!muted}>
              <IconSound muted={muted} className="h-6 w-6" />
            </TrayButton>
            <span className="sm:hidden">
              <TrayButton label={t('home.leaderboard')} onClick={() => router.push('/leaderboard')}>
                <IconTrophy className="h-6 w-6" />
              </TrayButton>
            </span>
            <span className="sm:hidden">
              <TrayButton label={t('story.title')} onClick={() => router.push('/story')}>
                <IconMoon className="h-6 w-6" />
              </TrayButton>
            </span>
          </div>
        </div>
        <div className="hidden w-32 sm:block" />
      </footer>

      <HowToPlay open={howTo} onClose={() => setHowTo(false)} />

      <Modal open={privateOpen} onClose={() => setPrivateOpen(false)} title={t('home.private')}>
        <p className="mb-4 text-sm text-mist">{t('home.privateHint')}</p>
        <div className="grid gap-2">
          <Button size="lg" variant="gold" onClick={() => router.push('/create')}>
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
