'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { GAME, catLimitsFor, isInMatch, type Appearance, type RoomSettings } from '@nizhal/shared';
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
import { Button } from '@/components/ui/Button';
import { Modal, Panel } from '@/components/ui/Controls';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { SettingsForm } from '@/components/lobby/SettingsForm';
import { CustomizePanel } from '@/components/lobby/CustomizePanel';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { VoiceBadge, VoiceControls } from '@/components/voice/VoiceControls';

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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!ready || !user) return <LoadingScreen messageKey="loading.session" />;
  if (!room) return <LoadingScreen messageKey="loading.room" />;

  const me = room.players.find((p) => p.id === user.uid);
  const isHost = room.hostId === user.uid;
  const count = room.players.length;
  const everyoneReady = room.players.every((p) => p.isHost || p.ready);
  const lim = catLimitsFor(room.settings.mode, Math.max(GAME.MIN_PLAYERS, count));
  const catsValid = room.settings.catCount >= lim.min && room.settings.catCount <= lim.max;
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
      onBack={() => void rooms.leave().then(() => router.replace('/home'))}
      actions={
        <div className="flex shrink-0 items-center gap-2 rounded-xl border border-line bg-panel px-3 py-1.5">
          <button onClick={() => void copyCode()} className="flex items-center gap-2" aria-label={`${t('lobby.code')} ${room.code}`} title={t('common.copy')}>
            <span className="hidden text-xs text-rain sm:inline">{t('lobby.code')}</span>
            <span className="select-all font-display text-xl tracking-[0.15em] text-lamp sm:text-2xl sm:tracking-[0.2em]">{room.code}</span>
          </button>
          <button onClick={() => void share()} className="text-xs text-rain hover:text-mist">
            {copied ? t('common.copied') : t('common.share')}
          </button>
        </div>
      }
    >
      {matchRunningWithoutMe && <p className="mb-3 rounded-xl border border-lamp/40 bg-panel p-3 text-sm text-lamp">{t('err.removedFromMatch')}</p>}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm text-mist">
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${room.settings.isPublic ? 'bg-moss/30 text-leaf' : 'bg-panel-2 text-mist'}`}>
            {room.settings.isPublic ? t('create.public') : t('create.private')}
          </span>
          {count < GAME.MIN_PLAYERS ? t('lobby.waiting', { n: count, min: GAME.MIN_PLAYERS }) : ''}
        </p>
        <VoiceControls />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid content-start grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {slots.map((p, i) =>
            p ? (
              <div key={p.id} className={`relative flex flex-col items-center rounded-2xl border p-2 ${p.id === user.uid ? 'border-moss bg-panel-2' : 'border-line bg-panel'}`}>
                <span className="absolute left-2 top-1.5 text-xs text-rain">{i + 1}</span>
                <span className="absolute right-1.5 top-1.5">
                  <VoiceBadge id={p.id} />
                </span>
                <CharacterAvatar appearance={p.appearance} size={70} dim={!p.connected} />
                <div className="mt-1 w-full truncate text-center text-sm font-semibold">{p.name}</div>
                <div className="mt-0.5 h-5 text-xs">
                  {p.isHost ? (
                    <span className="text-lamp">{t('lobby.host')}</span>
                  ) : !p.connected ? (
                    <span className="text-rain">{t('lobby.offline')}</span>
                  ) : p.ready ? (
                    <span className="text-leaf">✓ {t('lobby.ready')}</span>
                  ) : (
                    <span className="text-rain">{t('lobby.notReady')}</span>
                  )}
                </div>
                {isHost && p.id !== user.uid && (
                  <button onClick={() => void act(rooms.kick(p.id))} className="mt-1 h-7 rounded-md px-2 text-xs text-rain hover:bg-night hover:text-laterite">
                    {t('lobby.kick')}
                  </button>
                )}
              </div>
            ) : (
              <div key={`empty-${i}`} className="flex min-h-20 flex-col items-center justify-center rounded-2xl border border-dashed border-line text-xs text-rain/70">
                <span className="mb-1 text-lg">{i + 1}</span>
                {t('lobby.emptySlot')}
              </div>
            ),
          )}
        </div>

        <div className="space-y-3">
          <Panel className="hidden px-4 py-2 lg:block">
            <div className="font-display pt-1 text-lg">{t('lobby.settings')}</div>
            {!isHost && <div className="text-xs text-rain">{t('lobby.hostOnly')}</div>}
            <SettingsForm
              value={room.settings}
              playerCount={count}
              disabled={!isHost || room.phase === 'STARTING'}
              onChange={(patch: Partial<RoomSettings>) => void act(rooms.settings(patch))}
            />
          </Panel>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
            <Button variant="secondary" className="lg:hidden" onClick={() => setSettingsOpen(true)}>
              {t('lobby.settings')}
            </Button>
            <Button variant="secondary" onClick={() => setCustomize(true)} disabled={room.phase === 'STARTING'}>
              {t('lobby.customize')}
            </Button>
            {isHost ? (
              <Button variant="lamp" size="lg" className="col-span-2 lg:col-span-1" disabled={!canStart} onClick={() => void act(rooms.start())}>
                {t('lobby.start')}
              </Button>
            ) : (
              <Button
                size="lg"
                className="col-span-2 lg:col-span-1"
                variant={me?.ready ? 'secondary' : 'primary'}
                onClick={() => void act(rooms.ready(!me?.ready))}
                disabled={room.phase === 'STARTING' || matchRunningWithoutMe}
              >
                {me?.ready ? t('lobby.cancelReady') : t('lobby.imReady')}
              </Button>
            )}
            {isHost && !everyoneReady && count >= GAME.MIN_PLAYERS && <p className="col-span-2 text-center text-xs text-rain lg:col-span-1">{t('lobby.needReady')}</p>}
            {isHost && !catsValid && <p className="col-span-2 text-center text-xs text-laterite lg:col-span-1">{t('err.INVALID_CONFIG')}</p>}
          </div>
        </div>
      </div>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('lobby.settings')}>
        {!isHost && <div className="mb-2 text-xs text-rain">{t('lobby.hostOnly')}</div>}
        <SettingsForm value={room.settings} playerCount={count} disabled={!isHost} onChange={(patch) => void act(rooms.settings(patch))} />
      </Modal>

      <Modal open={customize} onClose={() => setCustomize(false)} title={t('custom.title')} wide>
        {profile && <CustomizePanel initialName={me?.name ?? profile.username} initial={me?.appearance ?? profile.appearance} onSave={(n, a) => void saveLook(n, a)} saving={saving} />}
      </Modal>

      {countdown !== null && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/70">
          <div className="text-mist">{t('lobby.starting')}</div>
          <div key={countdown} className="animate-rise font-display text-8xl text-lamp">
            {countdown}
          </div>
        </div>
      )}
    </Screen>
  );
}
