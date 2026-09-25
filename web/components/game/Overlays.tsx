'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SABOTAGE_DEFS, availableSabotages, getMap, getMode, type SabotageType } from '@nizhal/shared';
import { useGame, EMPTY_PLAYERS } from '@/state/gameStore';
import { useUi } from '@/state/uiStore';
import { serverNow } from '@/state/connectionStore';
import { useSettings } from '@/state/settingsStore';
import { useT } from '@/hooks/useT';
import { useIsPortrait, useIsTouch, useTicker } from '@/hooks/useDevice';
import { actions as net, errorKey, rooms } from '@/services/net';
import type { I18nKey } from '@/utils/i18n';
import { Button } from '@/components/ui/Button';
import { CatForm } from '@/components/ui/CatForm';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { CameraFeedView, MapView } from './MapView';

// ── Cat sabotage menu ─────────────────────────────────────────────────────
export function SabotageMenu() {
  const t = useT();
  const toast = useUi((s) => s.toast);
  const panel = useGame((s) => s.panel);
  const active = useGame((s) => s.state?.sabotage);
  const locked = useGame((s) => (s.state?.lockedDoorIds.length ?? 0) > 0);
  const [pickDoor, setPickDoor] = useState(false);
  if (panel?.kind !== 'sabotage') return null;
  const map = getMap(useGame.getState().state?.mapId ?? 'kadalimukku_old_town');
  const close = () => useGame.getState().set({ panel: null });

  const fire = async (type: SabotageType, building?: string) => {
    const r = await net.sabotage(type, building);
    if (!r.ok) toast(errorKey(r.error), undefined, 'warn');
    setPickDoor(false);
    close();
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-3 sm:items-center" onClick={close}>
      <div className="animate-rise w-full max-w-lg rounded-2xl border border-laterite/60 bg-panel p-4" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display mb-3 text-xl">{pickDoor ? t('sabotage.pickBuilding') : t('sabotage.title')}</h2>
        {pickDoor ? (
          <div className="grid grid-cols-2 gap-2">
            {map.buildings
              .filter((b) => b.lockable)
              .map((b) => (
                <Button key={b.id} variant="secondary" onClick={() => void fire('DOOR_LOCK', b.id)}>
                  {t(`zone.${b.zoneId}` as I18nKey)}
                </Button>
              ))}
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {availableSabotages(map).map((type) => {
              const def = SABOTAGE_DEFS[type];
              const disabled = def.major ? !!active : locked;
              return (
                <button
                  key={type}
                  disabled={disabled}
                  onClick={() => (type === 'DOOR_LOCK' ? setPickDoor(true) : void fire(type))}
                  className="rounded-xl border border-line bg-night p-3 text-left hover:border-laterite disabled:opacity-40"
                >
                  <div className={`font-semibold ${def.critical ? 'text-laterite' : 'text-paper'}`}>{t(`sabotage.${type}`)}</div>
                  <div className="text-xs text-rain">{t(`sabotage.${type}.desc`)}</div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Map overlay (M) ───────────────────────────────────────────────────────
export function MapOverlay() {
  const panel = useGame((s) => s.panel);
  const t = useT();
  if (panel?.kind !== 'map') return null;
  const w = typeof window === 'undefined' ? 600 : Math.min(window.innerWidth - 32, (window.innerHeight - 80) * 1.5, 960);
  return (
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-black/55 p-4" onClick={() => useGame.getState().set({ panel: null })}>
      <div onClick={(e) => e.stopPropagation()} className="animate-rise">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-display text-lg">{t(`map.${useGame.getState().state?.mapId ?? 'kadalimukku_old_town'}`)}</span>
          <button onClick={() => useGame.getState().set({ panel: null })} className="h-10 w-10 rounded-lg text-2xl text-rain hover:text-paper">
            ×
          </button>
        </div>
        <MapView width={w} labels />
      </div>
    </div>
  );
}

// ── Esc / ☰ menu ─────────────────────────────────────────────────────────
export function GameMenu() {
  const t = useT();
  const router = useRouter();
  const panel = useGame((s) => s.panel);
  const settings = useSettings();
  if (panel?.kind !== 'menu') return null;
  const close = () => useGame.getState().set({ panel: null });
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-3" onClick={close}>
      <div className="animate-rise w-full max-w-sm space-y-3 rounded-2xl border border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl">{t('hud.menu')}</h2>
        <label className="block text-sm">
          <span className="text-mist">{t('set.master')}</span>
          <input type="range" min={0} max={1} step={0.05} value={settings.masterVolume} onChange={(e) => settings.set({ masterVolume: +e.target.value })} className="w-full accent-[#3f7d5c]" />
        </label>
        <p className="hidden text-xs text-rain sm:block">{t('set.keys')}</p>
        <Button full onClick={close}>
          {t('hud.resume')}
        </Button>
        <Button
          full
          variant="danger"
          onClick={() =>
            void rooms.leave().then(() => {
              useGame.getState().reset();
              router.replace('/home');
            })
          }
        >
          {t('hud.leaveMatch')}
        </Button>
      </div>
    </div>
  );
}

// ── Role reveal ──────────────────────────────────────────────────────────
export function RoleReveal() {
  const t = useT();
  const phase = useGame((s) => s.state?.phase);
  const role = useGame((s) => s.role);
  const catCount = useGame((s) => s.state?.settings.catCount ?? 1);
  const modeId = useGame((s) => s.state?.settings.mode ?? 'classic');
  const players = useGame((s) => s.state?.players ?? EMPTY_PLAYERS);
  if (phase !== 'ROLE_REVEAL' || !role) return null;
  const isCat = role.role === 'CAT';
  const fellow = players.filter((p) => role.fellowCats.some((c) => c.id === p.id));
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink/95 p-6 text-center">
      <div className="animate-rise text-mist">{t('role.youAre')}</div>
      <div className={`animate-rise font-display text-5xl sm:text-6xl ${isCat ? 'text-lamp' : 'text-leaf'}`}>{t(`role.${role.role}`)}</div>
      <div className="my-4">{isCat ? <CatForm size={140} /> : null}</div>
      <div className="mb-1 rounded-md bg-panel-2 px-2 py-0.5 text-xs uppercase tracking-widest text-rain">{t(`mode.${modeId}`)}</div>
      <p className="max-w-md text-mist">{t((isCat ? getMode(modeId).catGoalKey : getMode(modeId).humanGoalKey) as I18nKey)}</p>
      {!isCat && <p className="mt-2 text-sm text-rain">{t('role.catsAmong', { n: catCount })}</p>}
      {isCat && fellow.length > 0 && (
        <div className="mt-5">
          <div className="mb-2 text-sm text-rain">{t('role.fellowCats')}</div>
          <div className="flex justify-center gap-4">
            {fellow.map((p) => (
              <div key={p.id} className="flex flex-col items-center">
                <CharacterAvatar appearance={p.appearance} size={64} />
                <span className="text-sm text-lamp">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Body reported / emergency splash ─────────────────────────────────────
export function ReportSplash() {
  const t = useT();
  const state = useGame((s) => s.state);
  if (state?.phase !== 'REPORT' || !state.meeting) return null;
  const m = state.meeting;
  const caller = state.players.find((p) => p.id === m.callerId);
  const victim = state.players.find((p) => p.id === m.reportedVictimId);
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[radial-gradient(circle,#2a1612_0%,#0e1512_70%)] p-6 text-center">
      <div className="animate-rise font-display text-5xl text-laterite sm:text-6xl">{t(m.reason === 'report' ? 'meeting.report' : 'meeting.emergency')}</div>
      {victim ? (
        <div className="flex items-center gap-4">
          {caller && <CharacterAvatar appearance={caller.appearance} size={80} />}
          <span className="text-2xl text-rain">→</span>
          <div className="rotate-90">
            <CharacterAvatar appearance={victim.appearance} size={80} dim />
          </div>
        </div>
      ) : (
        caller && <CharacterAvatar appearance={caller.appearance} size={96} animate />
      )}
      <p className="text-mist">
        {victim ? t('meeting.foundBody', { name: caller?.name ?? '', victim: victim.name }) : t('meeting.calledBy', { name: caller?.name ?? '' })}
      </p>
    </div>
  );
}

// ── Portrait warning for gameplay on phones ─────────────────────────────
export function RotateDevice() {
  const t = useT();
  const portrait = useIsPortrait();
  const touch = useIsTouch();
  if (!portrait || !touch) return null;
  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 bg-ink p-8 text-center">
      <div className="animate-rotate-phone h-24 w-14 rounded-xl border-4 border-paper/80">
        <div className="mx-auto mt-1 h-1 w-4 rounded bg-paper/60" />
      </div>
      <div className="font-display text-2xl">{t('rotate.title')}</div>
      <p className="text-sm text-mist">{t('rotate.hint')}</p>
    </div>
  );
}

/** Seconds remaining until a server deadline (re-rendering handled by caller). */
export function secondsUntil(at: number | null | undefined): number {
  return at ? Math.max(0, Math.ceil((at - serverNow()) / 1000)) : 0;
}

export function useSecondsUntil(at: number | null | undefined): number {
  useTicker(250);
  return secondsUntil(at);
}

// ── Security console camera feed ─────────────────────────────────────────
export function CameraPanel() {
  const t = useT();
  const panel = useGame((s) => s.panel);
  const online = useGame((s) => s.state?.modeState.camerasOnline ?? true);
  if (panel?.kind !== 'cameras') return null;
  const close = () => {
    void net.watchCameras(false);
    useGame.getState().set({ panel: null, cameraFeed: null });
  };
  const w = typeof window === 'undefined' ? 600 : Math.min(window.innerWidth - 32, (window.innerHeight - 110) * 1.5, 960);
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="animate-rise">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="font-display text-lg">{t('cameras.title')}</div>
            <div className={`text-xs ${online ? 'text-rain' : 'text-laterite'}`}>{online ? t('cameras.hint') : t('cameras.offline')}</div>
          </div>
          <button onClick={close} className="h-10 w-10 shrink-0 rounded-lg text-2xl text-rain hover:text-paper" aria-label="close">
            ×
          </button>
        </div>
        <CameraFeedView width={w} />
      </div>
    </div>
  );
}

// ── Infection: frozen while turning ──────────────────────────────────────
export function InfectionOverlay() {
  const t = useT();
  const until = useGame((s) => s.self?.infectedUntil ?? null);
  const n = useSecondsUntil(until);
  if (!until) return null;
  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[radial-gradient(circle,rgba(40,70,30,0.55)_0%,rgba(8,12,8,0.92)_70%)] p-6 text-center">
      <div className="animate-pulse font-display text-4xl text-lamp sm:text-5xl">{t('infection.youInfected')}</div>
      <CatForm size={120} />
      <p className="text-mist">{t('infection.turning', { n })}</p>
    </div>
  );
}
