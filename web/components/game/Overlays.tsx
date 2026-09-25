'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SABOTAGE_DEFS, availableSabotages, getMap, getMode, type SabotageType } from '@nizhal/shared';
import { useGame, EMPTY_PLAYERS } from '@/state/gameStore';
import { useUi } from '@/state/uiStore';
import { serverNow } from '@/state/connectionStore';
import { useSettings } from '@/state/settingsStore';
import { useT } from '@/hooks/useT';
import { useTicker } from '@/hooks/useDevice';
import { actions as net, errorKey, rooms } from '@/services/net';
import type { I18nKey } from '@/utils/i18n';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Controls';
import { CatForm } from '@/components/ui/CatForm';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { CameraFeedView, MapView } from './MapView';

/** Round × button used by the in-game overlays (same look as `Modal`'s close). */
function CloseButton({ onClick, label = 'close' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="tactile flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-line border-b-ink bg-panel-2 text-xl text-mist hover:text-paper"
      aria-label={label}
    >
      ×
    </button>
  );
}

const SCRIM = 'pointer-events-auto fixed inset-0 flex items-center justify-center bg-ink/75 p-3';

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
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-end justify-center bg-ink/75 p-3 sm:items-center" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        className="surface kasavu animate-screen-in max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] p-4 pt-5 scrollbar-thin"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="headline flex min-w-0 items-center gap-2 text-2xl leading-tight text-paper">
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-canal-deep bg-canal text-paper">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2 4 14h7l-1 8 9-12h-7z" />
              </svg>
            </span>
            {pickDoor ? t('sabotage.pickBuilding') : t('sabotage.title')}
          </h2>
          <CloseButton onClick={close} />
        </div>
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
                  className={`tactile flex min-h-16 flex-col items-start gap-0.5 rounded-2xl border-2 border-b-ink bg-panel-2 p-3 text-left ${
                    def.critical ? 'border-laterite/60 hover:border-laterite' : 'border-line hover:border-canal'
                  }`}
                >
                  <span className={`flex items-center gap-1.5 font-display font-bold leading-tight ${def.critical ? 'text-laterite' : 'text-paper'}`}>
                    {def.critical && <span aria-hidden className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-laterite" />}
                    {t(`sabotage.${type}`)}
                  </span>
                  <span className="text-xs leading-snug text-rain">{t(`sabotage.${type}.desc`)}</span>
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
    <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-ink/75 p-4" onClick={() => useGame.getState().set({ panel: null })}>
      <div onClick={(e) => e.stopPropagation()} className="animate-screen-in">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="headline min-w-0 truncate text-2xl leading-tight text-paper">{t(`map.${useGame.getState().state?.mapId ?? 'kadalimukku_old_town'}`)}</span>
          <CloseButton onClick={() => useGame.getState().set({ panel: null })} />
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
    <div className={`${SCRIM} z-40`} onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('hud.menu')}
        className="surface kasavu animate-screen-in w-full max-w-sm space-y-4 rounded-[var(--radius-card)] p-5 pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="headline text-2xl leading-tight text-paper">{t('hud.menu')}</h2>
          <CloseButton onClick={close} />
        </div>
        <label className="block rounded-2xl border-2 border-line bg-ink/60 px-3 py-2.5 text-sm">
          <span className="flex items-center justify-between font-semibold text-mist">
            {t('set.master')}
            <span className="font-display font-bold tabular-nums text-lamp">{Math.round(settings.masterVolume * 100)}%</span>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.masterVolume}
            onChange={(e) => settings.set({ masterVolume: +e.target.value })}
            className="mt-1 w-full accent-lamp"
          />
        </label>
        <p className="hidden text-xs leading-snug text-rain sm:block">{t('set.keys')}</p>
        <div className="grid gap-2">
          <Button full size="lg" variant="gold" onClick={close}>
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
  // This screen is private to the viewer, so tinting by their own role is safe.
  const glow = isCat ? 'var(--color-lamp)' : 'var(--color-leaf)';
  return (
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center overflow-y-auto bg-ink p-6 text-center pt-safe pb-safe"
      style={{ background: `radial-gradient(circle at 50% 38%, color-mix(in srgb, ${glow} 16%, transparent) 0%, transparent 55%), var(--color-ink)` }}
    >
      <div className="animate-rise font-display text-lg font-bold uppercase tracking-widest text-mist">{t('role.youAre')}</div>
      <div className={`headline animate-screen-in text-5xl leading-tight sm:text-6xl ${isCat ? 'text-lamp' : 'text-leaf'}`}>{t(`role.${role.role}`)}</div>
      <div className="mt-1 flex items-center gap-2" aria-hidden>
        <span className="block h-[3px] w-12 rounded-full bg-lamp" />
        <span className="block h-[3px] w-3 rounded-full bg-gold-deep" />
      </div>
      <div className="my-4 animate-rise">{isCat ? <CatForm size={140} /> : null}</div>
      <div className="mb-2">
        <Badge tone="info">{t(`mode.${modeId}`)}</Badge>
      </div>
      <p className="max-w-md leading-snug text-paper">{t((isCat ? getMode(modeId).catGoalKey : getMode(modeId).humanGoalKey) as I18nKey)}</p>
      {!isCat && <p className="mt-2 text-sm leading-snug text-rain">{t('role.catsAmong', { n: catCount })}</p>}
      {isCat && fellow.length > 0 && (
        <div className="surface animate-rise mt-5 rounded-[var(--radius-card)] px-5 py-3">
          <div className="mb-2 font-display text-sm font-bold leading-tight text-rain">{t('role.fellowCats')}</div>
          <div className="flex flex-wrap justify-center gap-4">
            {fellow.map((p) => (
              <div key={p.id} className="flex flex-col items-center">
                <span className="overflow-hidden rounded-2xl border-2 border-lamp/60 bg-night">
                  <CharacterAvatar appearance={p.appearance} size={64} />
                </span>
                <span className="mt-1 font-display text-sm font-bold text-lamp">{p.name}</span>
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
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 overflow-hidden p-6 text-center"
      style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-laterite-deep) 55%, var(--color-night)) 0%, var(--color-ink) 72%)' }}
    >
      {/* laterite band behind the title */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-28 -translate-y-[130%] -skew-y-3 bg-laterite-deep/55 shadow-[0_0_60px_var(--color-laterite-deep)]" />
      <div className="headline animate-screen-in relative text-5xl uppercase leading-tight text-laterite sm:text-7xl">
        {t(m.reason === 'report' ? 'meeting.report' : 'meeting.emergency')}
      </div>
      {victim ? (
        <div className="animate-rise relative flex items-center gap-4">
          {caller && (
            <span className="rounded-full bg-night/70 p-2 ring-2 ring-line">
              <CharacterAvatar appearance={caller.appearance} size={80} mood="scared" />
            </span>
          )}
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-lamp" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          <span className="rounded-full bg-ink/70 p-2 ring-2 ring-laterite/60">
            <span className="block rotate-90">
              <CharacterAvatar appearance={victim.appearance} size={80} dim />
            </span>
          </span>
        </div>
      ) : (
        caller && (
          <span className="animate-rise relative rounded-full bg-night/70 p-3 ring-2 ring-lamp/60">
            <CharacterAvatar appearance={caller.appearance} size={96} animate mood="suspicious" />
          </span>
        )
      )}
      <p className="relative max-w-md text-lg leading-snug text-paper">
        {victim ? t('meeting.foundBody', { name: caller?.name ?? '', victim: victim.name }) : t('meeting.calledBy', { name: caller?.name ?? '' })}
      </p>
    </div>
  );
}

// ── Portrait warning for gameplay on phones ─────────────────────────────
// The rotate prompt is shared with the sign-in screens; re-exported for the game.
export { RotateDevice } from '@/components/ui/RotateDevice';

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
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-ink/80 p-4" onClick={close}>
      <div onClick={(e) => e.stopPropagation()} className="animate-screen-in">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="headline flex items-center gap-2 text-2xl leading-tight text-paper">
              <span aria-hidden className={`h-2.5 w-2.5 shrink-0 rounded-full ${online ? 'animate-pulse bg-laterite' : 'bg-rain'}`} />
              {t('cameras.title')}
            </div>
            <div className="mt-0.5">
              {online ? <span className="text-xs leading-snug text-rain">{t('cameras.hint')}</span> : <Badge tone="danger">{t('cameras.offline')}</Badge>}
            </div>
          </div>
          <CloseButton onClick={close} />
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
    <div
      className="pointer-events-auto fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-6 text-center"
      style={{ background: 'radial-gradient(circle, color-mix(in srgb, var(--color-moss-deep) 60%, transparent) 0%, color-mix(in srgb, var(--color-ink) 94%, transparent) 70%)' }}
    >
      <div className="headline animate-pulse text-4xl leading-tight text-lamp sm:text-5xl">{t('infection.youInfected')}</div>
      <CatForm size={120} />
      <p className="rounded-full border-2 border-lamp/50 bg-ink/80 px-4 py-1.5 font-display font-bold leading-tight text-paper">{t('infection.turning', { n })}</p>
    </div>
  );
}
