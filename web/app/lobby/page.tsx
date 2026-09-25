'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GAME, effectiveCatCountFor, isInMatch, isValidCatCountFor, type Appearance } from '@nizhal/shared';
import { useAuth } from '@/state/authStore';
import { useRoom } from '@/state/roomStore';
import { useGame } from '@/state/gameStore';
import { useUi } from '@/state/uiStore';
import { serverNow } from '@/state/connectionStore';
import { useT } from '@/hooks/useT';
import { useTicker } from '@/hooks/useDevice';
import { useRequireAuth, useRoomRedirect } from '@/hooks/useRoute';
import { rooms, errorKey, type NetResult } from '@/services/net';
import { saveProfile } from '@/services/profile';
import { Screen } from '@/components/ui/Screen';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge, Modal, Panel } from '@/components/ui/Controls';
import { Notice } from '@/components/ui/Feedback';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { RoomSummary } from '@/components/lobby/SettingsForm';
import { CustomizePanel } from '@/components/lobby/CustomizePanel';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { VoiceBadge, VoiceControls } from '@/components/voice/VoiceControls';

/** The cat count the host picked on Create Room, remembered per room for this tab. */
function desiredCats(code: string, current: number): number {
  const key = `nz-desired-cats:${code}`;
  try {
    const saved = Number(sessionStorage.getItem(key));
    if (saved > 0) return saved;
    sessionStorage.setItem(key, String(current));
  } catch {
    /* storage unavailable: fall back to the room's current value */
  }
  return current;
}

export default function LobbyPage() {
  const ready = useRequireAuth();
  useRoomRedirect('lobby');
  useTicker(250);
  const t = useT();
  const router = useRouter();
  const room = useRoom((s) => s.room);
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const setProfile = useAuth((s) => s.setProfile);
  const hasMatchState = useGame((s) => !!s.state);
  const toast = useUi((s) => s.toast);
  const [customize, setCustomize] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const syncing = useRef<number | null>(null);

  // Cats were chosen for the room on Create Room. As players join or leave, the host keeps
  // the count within what this table allows (same rule the server enforces at start),
  // aiming for the host's original pick. Only an actual change is sent to the server.
  const host = room && user && room.hostId === user.uid && (room.phase === 'WAITING' || room.phase === 'LOBBY') ? room : null;
  const hostTable = host ? Math.max(GAME.MIN_PLAYERS, host.players.length) : 0;
  const hostTarget = host ? effectiveCatCountFor(host.settings.mode, hostTable, desiredCats(host.code, host.settings.catCount)) : 0;
  useEffect(() => {
    if (!host || host.settings.catCount === hostTarget || syncing.current === hostTarget) return;
    syncing.current = hostTarget;
    void rooms.settings({ catCount: hostTarget }).finally(() => (syncing.current = null));
  }, [host, hostTarget]);

  if (!ready || !user) return <LoadingScreen messageKey="loading.session" />;
  if (!room) return <LoadingScreen messageKey="loading.room" />;

  const me = room.players.find((p) => p.id === user.uid);
  const isHost = room.hostId === user.uid;
  const count = room.players.length;
  const everyoneReady = room.players.every((p) => p.isHost || p.ready);
  const catsValid = isValidCatCountFor(room.settings.mode, Math.max(GAME.MIN_PLAYERS, count), room.settings.catCount);
  const catsAdjusted = count >= GAME.MIN_PLAYERS && room.settings.catCount !== desiredCats(room.code, room.settings.catCount);
  const canStart = isHost && count >= GAME.MIN_PLAYERS && everyoneReady && catsValid && room.phase === 'LOBBY';
  const countdown = room.phase === 'STARTING' && room.countdownEndsAt ? Math.max(0, Math.ceil((room.countdownEndsAt - serverNow()) / 1000)) : null;
  const matchRunningWithoutMe = isInMatch(room.phase) && !hasMatchState;

  async function act(p: Promise<NetResult<unknown>>) {
    const r = await p;
    if (!r.ok) toast(errorKey(r.error), undefined, 'danger');
  }

  async function saveLook(name: string, appearance: Appearance) {
    if (!user) return;
    setSaving(true);
    try {
      await saveProfile(user, { username: name, appearance });
      if (profile) setProfile({ ...profile, username: name, appearance });
      await act(rooms.profile({ name, appearance }));
      setCustomize(false);
    } catch {
      toast('err.SERVER_ERROR', undefined, 'danger');
    } finally {
      setSaving(false);
    }
  }

  async function copyCode() {
    const code = room!.code;
    let ok = false;
    try {
      await navigator.clipboard.writeText(code);
      ok = true;
    } catch {
      // Clipboard API is unavailable on insecure origins (e.g. LAN http) — fall back to execCommand.
      const el = document.createElement('textarea');
      el.value = code;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      try {
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
      el.remove();
    }
    if (!ok) return toast('err.SERVER_ERROR', undefined, 'danger');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function share() {
    const text = t('lobby.shareText', { code: room!.code });
    if (!navigator.share) return copyCode();
    try {
      await navigator.share({ text });
    } catch {
      /* user cancelled */
    }
  }

  const slots = Array.from({ length: room.settings.maxPlayers }, (_, i) => room.players.find((p) => p.slot === i) ?? null);

  return (
    <Screen
      wide
      title={t('lobby.title')}
      footer={
        <div className="space-y-1.5 lg:ml-auto lg:max-w-[340px]">
          {isHost && !everyoneReady && count >= GAME.MIN_PLAYERS && <p className="text-center text-xs leading-tight text-mist">{t('lobby.needReady')}</p>}
          {isHost ? (
            <Button variant="gold" size="lg" full disabled={!canStart} onClick={() => void act(rooms.start())}>
              {t('lobby.start')}
            </Button>
          ) : (
            <Button
              size="lg"
              full
              variant={me?.ready ? 'secondary' : 'primary'}
              onClick={() => void act(rooms.ready(!me?.ready))}
              disabled={room.phase === 'STARTING' || matchRunningWithoutMe}
            >
              {me?.ready ? t('lobby.cancelReady') : t('lobby.imReady')}
            </Button>
          )}
        </div>
      }
      onBack={() => void rooms.leave().then(() => router.replace('/home'))}
      actions={
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => void copyCode()}
            className={`tactile flex items-center gap-2 rounded-full border-2 bg-panel-2 py-1 pl-3.5 pr-2.5 hover:border-lamp/70 ${copied ? 'border-lamp' : 'border-line'} border-b-ink`}
            aria-label={`${t('lobby.code')} ${room.code}`}
            title={t('common.copy')}
          >
            <span className="hidden text-[10px] font-semibold uppercase leading-none tracking-wider text-rain sm:inline">{t('lobby.code')}</span>
            <span className="keep-tracking select-all font-display text-xl font-extrabold tracking-[0.15em] text-lamp sm:text-2xl sm:tracking-[0.2em]">{room.code}</span>
            <span aria-hidden className={`flex h-7 w-7 items-center justify-center rounded-full ${copied ? 'bg-lamp text-ink' : 'bg-ink text-mist'}`}>
              {copied ? (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8.5" y="8.5" width="11" height="11" rx="2.5" />
                  <path d="M15.5 8.5V6.5a2 2 0 0 0-2-2h-7a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2" />
                </svg>
              )}
            </span>
          </button>
          <IconButton label={copied ? t('common.copied') : t('common.share')} onClick={() => void share()}>
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="6" cy="12" r="2.5" />
              <circle cx="17.5" cy="6" r="2.5" />
              <circle cx="17.5" cy="18" r="2.5" />
              <path d="M8.3 10.8l7-3.6M8.3 13.2l7 3.6" />
            </svg>
          </IconButton>
        </div>
      }
    >
      {matchRunningWithoutMe && (
        <Notice tone="warn" className="mb-3">
          {t('err.removedFromMatch')}
        </Notice>
      )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm leading-tight text-mist">
          <Badge tone={room.settings.isPublic ? 'good' : 'neutral'}>{room.settings.isPublic ? t('create.public') : t('create.private')}</Badge>
          {count < GAME.MIN_PLAYERS ? <span>{t('lobby.waiting', { n: count, min: GAME.MIN_PLAYERS })}</span> : ''}
        </div>
        <VoiceControls />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <div className="grid grid-cols-3 content-start gap-2 sm:grid-cols-4 md:grid-cols-5">
          {slots.map((p, i) =>
            p ? (
              <div
                key={p.id}
                className={`relative flex flex-col items-center rounded-2xl border-2 px-1.5 pb-2 pt-2 ${
                  p.id === user.uid ? 'border-lamp bg-lamp/10 shadow-[0_0_18px_-8px_var(--color-lamp)]' : 'surface border-line'
                }`}
              >
                <span className="absolute left-2 top-1.5 font-display text-xs font-bold text-rain">{i + 1}</span>
                <span className="absolute right-1.5 top-1.5">
                  <VoiceBadge id={p.id} />
                </span>
                <div className="relative mt-1">
                  <span aria-hidden className="absolute inset-x-0 bottom-0 mx-auto h-3 w-14 rounded-[50%] bg-ink/70" />
                  <CharacterAvatar appearance={p.appearance} size={70} dim={!p.connected} blink={p.connected} className="relative" />
                </div>
                <div className={`mt-1 w-full truncate text-center font-display text-sm font-bold leading-tight ${p.id === user.uid ? 'text-lamp' : 'text-paper'}`}>{p.name}</div>
                <div className="mt-1 flex min-h-5 max-w-full items-center justify-center">
                  {p.isHost ? (
                    <Badge tone="gold">
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="currentColor" aria-hidden>
                        <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />
                      </svg>
                      {t('lobby.host')}
                    </Badge>
                  ) : !p.connected ? (
                    <Badge>{t('lobby.offline')}</Badge>
                  ) : p.ready ? (
                    <Badge tone="good">✓ {t('lobby.ready')}</Badge>
                  ) : (
                    <Badge>{t('lobby.notReady')}</Badge>
                  )}
                </div>
                {isHost && p.id !== user.uid && (
                  <button
                    onClick={() => void act(rooms.kick(p.id))}
                    className="mt-1 min-h-7 rounded-full px-2.5 text-xs font-semibold text-rain transition-colors hover:bg-laterite/15 hover:text-laterite"
                  >
                    {t('lobby.kick')}
                  </button>
                )}
              </div>
            ) : (
              <div
                key={`empty-${i}`}
                className="flex min-h-32 flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-line bg-ink/30 px-1 text-center text-xs leading-tight text-rain/80"
              >
                <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-line font-display text-base font-bold text-rain">
                  {i + 1}
                </span>
                {t('lobby.emptySlot')}
              </div>
            ),
          )}
        </div>

        <div className="space-y-3">
          <Panel className="p-3">
            <RoomSummary settings={room.settings} />
          </Panel>

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <Button variant="secondary" className="col-span-2 lg:col-span-1" onClick={() => setCustomize(true)} disabled={room.phase === 'STARTING'}>
              {t('lobby.customize')}
            </Button>
            {isHost && catsAdjusted && (
              <Notice tone="info" className="col-span-2 text-xs lg:col-span-1">
                {t('lobby.catsAdjusted', { n: count, cats: room.settings.catCount })}
              </Notice>
            )}
          </div>
        </div>
      </div>

      <Modal open={customize} onClose={() => setCustomize(false)} title={t('custom.title')} wide>
        {profile && <CustomizePanel initialName={me?.name ?? profile.username} initial={me?.appearance ?? profile.appearance} onSave={(n, a) => void saveLook(n, a)} saving={saving} />}
      </Modal>

      {countdown !== null && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-2 bg-ink/85 p-6 text-center">
          <div className="font-display text-lg font-bold uppercase leading-tight tracking-wider text-mist">{t('lobby.starting')}</div>
          <div className="relative flex h-40 w-40 items-center justify-center rounded-full border-4 border-lamp/60 bg-night shadow-[0_0_60px_-10px_var(--color-lamp)]">
            <span key={countdown} className="headline animate-rise text-8xl leading-none text-lamp">
              {countdown}
            </span>
          </div>
        </div>
      )}
    </Screen>
  );
}
