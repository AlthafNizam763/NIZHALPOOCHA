'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { TASK_DEFS, getMap, getMode, type TaskAssignment } from '@nizhal/shared';
import { useGame, EMPTY_PLAYERS, EMPTY_TASKS } from '@/state/gameStore';
import { useConnection, serverNow } from '@/state/connectionStore';
import { useUi } from '@/state/uiStore';
import { useT } from '@/hooks/useT';
import { useIsTouch, useTicker } from '@/hooks/useDevice';
import { actions as net, errorKey, type NetResult } from '@/services/net';
import { audio } from '@/services/audio';
import type { I18nKey } from '@/utils/i18n';
import { VoiceControls } from '@/components/voice/VoiceControls';

const mmss = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// ── Action icons (stroke = currentColor) ─────────────────────────────────
const svg = (className: string, children: ReactNode) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {children}
  </svg>
);
const ICONS = {
  use: (c: string) => svg(c, <><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12" /><path d="M11 11.5v-2a1.5 1.5 0 0 1 3 0V12" /><path d="M14 11a1.5 1.5 0 0 1 3 0v1.5" /><path d="M17 12a1.5 1.5 0 0 1 3 0v3.5a6 6 0 0 1-6 6h-1.2a6 6 0 0 1-4.6-2.2L5 16a1.6 1.6 0 0 1 2.5-2L8 14.6" /></>),
  report: (c: string) => svg(c, <><path d="M4 10v4h3l6 4V6L7 10z" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" /></>),
  kill: (c: string) => svg(c, <><path d="M6 4c1 5 2 9 1 15" /><path d="M11 3c1 6 1.5 11 0 17" /><path d="M16 4c1.5 5 2 9 1 15" /></>),
  sabotage: (c: string) => svg(c, <path d="M13 2 4 14h7l-1 8 9-12h-7z" />),
  emergency: (c: string) => svg(c, <><path d="M6 17V11a6 6 0 0 1 12 0v6" /><path d="M4 17h16" /><path d="M10 20.5h4" /><path d="M12 3v2" /></>),
  cameras: (c: string) => svg(c, <><rect x="3" y="7" width="13" height="10" rx="2" /><path d="m16 11 5-3v8l-5-3" /></>),
  repair: (c: string) => svg(c, <path d="M14.5 6.5a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.5-7.5a4 4 0 0 0-5-5l2.5 2.5-1 2-2 1z" />),
  collect: (c: string) => svg(c, <><path d="M9 3h6" /><path d="M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" /><path d="M7.5 14h9" /></>),
};

// ── Top-left: task progress ───────────────────────────────────────────────
export function TaskPanel() {
  const t = useT();
  const progress = useGame((s) => s.state?.taskProgress);
  const tasks = useGame((s) => s.self?.tasks ?? EMPTY_TASKS);
  const isCat = useGame((s) => s.self?.role === 'CAT');
  // Compact by default on short (phone landscape) screens; tap to expand.
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerHeight > 520);
  const map = getMap(useGame.getState().state?.mapId ?? 'kadalimukku_old_town');
  const zoneName = (task: TaskAssignment) => {
    const st = map.taskStations.find((s) => s.id === task.stationId);
    return st ? t(`zone.${st.zoneId}` as I18nKey) : '';
  };

  return (
    <div className="surface pointer-events-auto w-56 max-w-[40vw] rounded-[var(--radius-card)] p-2.5 text-xs sm:w-64 sm:text-sm">
      <button className="flex min-h-7 w-full items-center justify-between gap-2 rounded-lg text-left" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="font-display font-bold uppercase leading-tight tracking-wide text-lamp">{t('hud.totalTasks')}</span>
        <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-rain transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 5l7 7-7 7" />
        </svg>
      </button>
      {progress ? (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-3 flex-1 overflow-hidden rounded-full border border-line bg-ink">
            <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          </div>
          <span className="font-display font-bold tabular-nums text-paper">
            {progress.done}/{progress.total}
          </span>
        </div>
      ) : (
        <div className="mt-1.5 flex items-center gap-1.5 font-semibold leading-tight text-laterite">
          <span aria-hidden className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-laterite" />
          {t('hud.commsDown')}
        </div>
      )}
      {open && (
        <ul className="mt-2 space-y-1 border-t border-line pt-2">
          {isCat && <li className="rounded-lg bg-lamp/10 px-1.5 py-0.5 text-[11px] leading-tight text-lamp">{t('hud.fakeTasks')}</li>}
          {tasks.map((task) => (
            <li key={task.id} className={`flex items-start justify-between gap-2 leading-tight ${task.done ? 'text-leaf opacity-75' : 'text-paper'}`}>
              <span className="flex min-w-0 items-start gap-1.5">
                <span
                  aria-hidden
                  className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border text-[9px] font-black ${task.done ? 'border-leaf bg-leaf text-ink' : 'border-line-strong'}`}
                >
                  {task.done ? '✓' : ''}
                </span>
                <span className={`truncate ${task.done ? 'line-through' : ''}`}>{t(TASK_DEFS[task.type].nameKey as I18nKey)}</span>
              </span>
              <span className="shrink-0 text-rain">{zoneName(task)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Top-center: timer + area ──────────────────────────────────────────────
export function TopCenter() {
  useTicker(500);
  const t = useT();
  const state = useGame((s) => s.state);
  const zoneId = useGame((s) => s.zoneId);
  if (!state) return null;
  const sab = state.sabotage;
  const critical = sab?.critical && sab.endsAt;
  return (
    <div className="pointer-events-none flex flex-col items-center gap-1">
      {critical ? (
        <div className="animate-pulse rounded-full border-2 border-laterite-deep bg-laterite px-4 py-1 font-display text-sm font-bold leading-tight text-paper shadow-[0_0_18px_var(--color-laterite)]">
          {t('hud.critical', { name: t(`sabotage.${sab.type}`), n: Math.max(0, Math.ceil((sab.endsAt! - serverNow()) / 1000)) })}
        </div>
      ) : (
        <div className="surface rounded-full px-4 py-0.5 font-display text-lg font-bold tabular-nums text-paper">{state.startedAt ? mmss(serverNow() - state.startedAt) : '0:00'}</div>
      )}
      {sab && !sab.critical && <HudChip tone="danger">{t(`sabotage.${sab.type}`)}</HudChip>}
      <ModeStatus />
      <HudChip tone="neutral">{t(`zone.${zoneId}` as I18nKey)}</HudChip>
    </div>
  );
}

/** Small pill for HUD status lines (solid enough to read over the map). */
function HudChip({ children, tone }: { children: ReactNode; tone: 'neutral' | 'danger' | 'info' | 'good' }) {
  const tones = {
    neutral: 'border-line bg-ink/80 text-mist',
    danger: 'border-laterite-deep bg-laterite/90 text-paper',
    info: 'border-canal-deep bg-canal/90 text-paper',
    good: 'border-moss-deep bg-moss/90 text-paper',
  }[tone];
  return <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold leading-tight tabular-nums ${tones}`}>{children}</span>;
}

/** Mode objectives: survival clock, antidote progress, camera network state. */
function ModeStatus() {
  const t = useT();
  const ms = useGame((s) => s.state?.modeState);
  const hasCameras = useGame((s) => (s.state ? getMap(s.state.mapId).cameras.length > 0 : false));
  if (!ms) return null;
  const survival = ms.survivalEndsAt !== null ? ms.survivalEndsAt - serverNow() : ms.survivalRemainingMs;
  return (
    <div className="flex flex-wrap justify-center gap-1">
      {survival !== null && (
        <HudChip tone="info">
          {t('hud.survive')} {mmss(survival)}
        </HudChip>
      )}
      {ms.antidote && (
        <HudChip tone="good">
          {t('objective.antidote')} {ms.antidote.collectedIds.length}/{ms.antidote.total}
        </HudChip>
      )}
      {hasCameras && !ms.camerasOnline && <HudChip tone="danger">{t('hud.camerasOffline')}</HudChip>}
    </div>
  );
}

// ── Top-right: ping / map / menu ─────────────────────────────────────────
export function TopRight() {
  const t = useT();
  const ping = useConnection((s) => s.ping);
  const setPanel = (p: 'map' | 'menu') => useGame.getState().set({ panel: useGame.getState().panel?.kind === p ? null : { kind: p } });
  const pingColor = ping === null ? 'bg-rain' : ping < 120 ? 'bg-leaf' : ping < 250 ? 'bg-lamp' : 'bg-laterite';
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <VoiceControls compact />
      <span className="flex items-center gap-1.5 rounded-full border border-line bg-ink/80 px-2.5 py-1 text-xs font-semibold tabular-nums text-mist">
        <span aria-hidden className={`h-2 w-2 rounded-full ${pingColor}`} />
        {ping === null ? '—' : t('hud.ping', { n: ping })}
      </span>
      <button
        onClick={() => setPanel('map')}
        data-tut="map"
        className="tactile flex h-11 items-center gap-1.5 rounded-full border-2 border-line border-b-ink bg-panel-2 px-3.5 font-display text-sm font-bold text-paper hover:text-lamp"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z" />
          <path d="M9 4v13.5M15 6.5V20" />
        </svg>
        {t('hud.map')}
      </button>
      <button
        onClick={() => setPanel('menu')}
        className="tactile flex h-11 w-11 items-center justify-center rounded-full border-2 border-line border-b-ink bg-panel-2 text-paper hover:text-lamp"
        aria-label={t('hud.menu')}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden>
          <path d="M5 7h14M5 12h14M5 17h14" />
        </svg>
      </button>
    </div>
  );
}

// ── Bottom-right: contextual actions ─────────────────────────────────────
type ActionTone = 'use' | 'report' | 'kill' | 'sabotage' | 'neutral';

/**
 * Big round game button: colour-coded by action, icon on top, label below,
 * darker lip that compresses on press. Cooldowns darken the face and show the
 * seconds remaining in large numerals.
 */
function ActionButton({
  label,
  hotkey,
  onClick,
  tone,
  icon,
  cooldown,
  big,
  tut,
}: {
  label: string;
  hotkey?: string;
  onClick: () => void;
  tone: ActionTone;
  icon: keyof typeof ICONS;
  cooldown?: number;
  big?: boolean;
  /** Anchor for the tutorial coach's highlight. */
  tut?: string;
}) {
  const tones: Record<ActionTone, { face: string; icon: string }> = {
    use: { face: 'border-moss-deep bg-moss text-paper', icon: 'text-lamp' },
    report: { face: 'border-laterite-deep bg-laterite text-paper', icon: 'text-paper' },
    kill: { face: 'border-ink bg-laterite-deep text-paper ring-2 ring-lamp ring-offset-2 ring-offset-ink/60', icon: 'text-lamp' },
    sabotage: { face: 'border-canal-deep bg-canal text-paper', icon: 'text-paper' },
    neutral: { face: 'border-line border-b-ink bg-panel-2 text-paper', icon: 'text-lamp' },
  };
  const cooling = (cooldown ?? 0) > 0;
  const s = tones[tone];
  return (
    <button
      onClick={onClick}
      disabled={cooling}
      data-tut={tut}
      aria-label={cooling ? `${label} ${cooldown}` : label}
      className={`tactile relative flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-full border-2 font-display font-extrabold uppercase shadow-[0_10px_22px_-10px_rgb(0_0_0/0.8)] ${s.face} ${
        big ? 'h-20 w-20 sm:h-24 sm:w-24' : 'h-16 w-16 sm:h-20 sm:w-20'
      }`}
      style={{ textShadow: '0 2px 0 rgba(0,0,0,.35)' }}
    >
      <span className={`${s.icon} ${cooling ? 'opacity-30' : ''}`}>{ICONS[icon](big ? 'h-8 w-8 sm:h-10 sm:w-10' : 'h-6 w-6 sm:h-8 sm:w-8')}</span>
      <span className="pointer-events-none absolute -bottom-2.5 left-1/2 w-max max-w-[7.5rem] -translate-x-1/2 rounded-full text-center border border-line bg-ink/90 px-2 py-px text-[11px] leading-tight text-paper sm:text-xs">
        {label}
      </span>
      {cooling && (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/45 text-3xl tabular-nums text-paper sm:text-4xl">{cooldown}</span>
      )}
      {hotkey && (
        <span className="absolute -right-0.5 -top-0.5 hidden h-5 w-5 items-center justify-center rounded-full border border-line bg-ink text-[10px] font-bold text-mist sm:flex" aria-hidden>
          {hotkey}
        </span>
      )}
    </button>
  );
}

export function ActionButtons() {
  useTicker(250);
  const t = useT();
  const toast = useUi((s) => s.toast);
  const self = useGame((s) => s.self);
  const acts = useGame((s) => s.actions);
  const phase = useGame((s) => s.state?.phase);
  const panel = useGame((s) => s.panel);
  const touch = useIsTouch();

  const isCat = self?.role === 'CAT';
  const alive = self?.alive ?? false;
  const infects = useGame((s) => getMode(s.state?.settings.mode ?? 'classic').catAttack === 'infect');
  const now = serverNow();
  const killCd = self?.killReadyAt ? Math.ceil((self.killReadyAt - now) / 1000) : 0;
  const sabCd = self?.sabotageReadyAt ? Math.ceil((self.sabotageReadyAt - now) / 1000) : 0;
  const emCd = self ? Math.ceil((self.emergencyReadyAt - now) / 1000) : 0;

  const fail = (r: NetResult<unknown>) => {
    if (!r.ok) {
      audio.play('warning');
      toast(errorKey(r.error), undefined, 'warn');
    }
  };

  const doTask = async () => {
    const id = acts.taskId;
    const task = self?.tasks.find((x) => x.id === id);
    if (!id || !task) return;
    audio.play('interact');
    if (isCat) return useGame.getState().set({ panel: { kind: 'fakeTask', taskId: id } });
    const r = await net.taskStart(id);
    if (r.ok) useGame.getState().set({ panel: { kind: 'task', taskId: id, minigame: TASK_DEFS[task.type].minigame } });
    else fail(r);
  };
  const doRepair = async () => {
    const id = acts.repairStationId;
    if (!id) return;
    audio.play('interact');
    const r = await net.repairStart(id);
    if (r.ok) useGame.getState().set({ panel: { kind: 'repair', stationId: id } });
    else fail(r);
  };
  const doReport = async () => acts.bodyId && fail(await net.report(acts.bodyId));
  const doEmergency = async () => fail(await net.emergency());
  const doKill = async () => acts.killTargetId && fail(await net.kill(acts.killTargetId));
  const doObjective = async () => {
    const id = acts.objectiveId;
    if (!id) return;
    audio.play('interact');
    const r = await net.objectiveStart(id);
    if (r.ok) useGame.getState().set({ panel: { kind: 'objective', objectiveId: id } });
    else fail(r);
  };
  const doCameras = async () => {
    audio.play('interact');
    const r = await net.watchCameras(true);
    if (r.ok) useGame.getState().set({ panel: { kind: 'cameras' } });
    else fail(r);
  };
  const doSabotage = () => useGame.getState().set({ panel: panel?.kind === 'sabotage' ? null : { kind: 'sabotage' } });

  // Keyboard shortcuts (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || e.repeat) return;
      const gs = useGame.getState();
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        gs.set({ panel: gs.panel ? null : { kind: 'menu' } });
        return;
      }
      if (k === 'm') {
        gs.set({ panel: gs.panel?.kind === 'map' ? null : { kind: 'map' } });
        return;
      }
      if (gs.state?.phase !== 'PLAYING' || !gs.self?.alive || (gs.panel && gs.panel.kind !== 'map')) return;
      if (k === 'e') {
        if (gs.actions.repairStationId) void doRepair();
        else if (gs.actions.objectiveId) void doObjective();
        else if (gs.actions.taskId) void doTask();
        else if (gs.actions.console) void doCameras();
        else if (gs.actions.emergency) void doEmergency();
      } else if (k === 'r' && gs.actions.bodyId) void doReport();
      else if (k === 'f' && gs.self.role === 'CAT' && gs.actions.killTargetId) void doKill();
      else if (k === 'q' && gs.self.role === 'CAT') doSabotage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (phase !== 'PLAYING' || !alive || self?.infectedUntil) return null;

  return (
    <div className="pointer-events-auto flex flex-wrap-reverse items-end justify-end gap-x-2 gap-y-4 pb-2 sm:gap-x-3">
      {acts.emergency && <ActionButton label={t('action.emergency')} hotkey="E" tone="neutral" icon="emergency" cooldown={emCd > 0 ? emCd : 0} onClick={() => void doEmergency()} />}
      {acts.repairStationId && <ActionButton label={t('action.repair')} hotkey="E" tone="use" icon="repair" tut="action-repair" onClick={() => void doRepair()} />}
      {acts.console && <ActionButton label={t('action.cameras')} hotkey="E" tone="neutral" icon="cameras" onClick={() => void doCameras()} />}
      {acts.objectiveId && <ActionButton label={t('action.collect')} hotkey="E" tone="use" icon="collect" onClick={() => void doObjective()} />}
      {acts.taskId && <ActionButton label={t('action.task')} hotkey="E" tone="use" icon="use" tut="action-task" onClick={() => void doTask()} />}
      {acts.bodyId && <ActionButton label={t('action.report')} hotkey="R" tone="report" icon="report" big tut="action-report" onClick={() => void doReport()} />}
      {isCat && <ActionButton label={t('action.sabotage')} hotkey="Q" tone="sabotage" icon="sabotage" cooldown={sabCd > 0 ? sabCd : 0} onClick={doSabotage} />}
      {isCat && (acts.killTargetId || !touch) && (
        <ActionButton
          label={t(infects ? 'action.infect' : 'action.kill')}
          hotkey="F"
          tone="kill"
          icon="kill"
          big
          cooldown={killCd > 0 ? killCd : 0}
          onClick={() => void doKill()}
        />
      )}
    </div>
  );
}

// ── Spectator ─────────────────────────────────────────────────────────────
export function SpectatorBar() {
  const t = useT();
  const players = useGame((s) => s.state?.players ?? EMPTY_PLAYERS);
  const followId = useGame((s) => s.followId);
  const selfAlive = useGame((s) => s.self?.alive ?? true);
  if (selfAlive) return null;
  const alive = players.filter((p) => p.status === 'alive');
  const chip = (on: boolean) =>
    `min-h-9 shrink-0 rounded-full border-2 px-3.5 py-1 font-display text-xs font-bold leading-tight transition-colors ${
      on ? 'border-gold-deep bg-lamp text-ink' : 'border-line bg-ink/85 text-mist hover:border-lamp/60 hover:text-paper'
    }`;
  return (
    <div className="pointer-events-auto flex max-w-[90vw] flex-col items-center gap-1.5">
      <div className="rounded-full border-2 border-canal-deep bg-canal px-4 py-0.5 font-display text-sm font-extrabold uppercase leading-tight tracking-widest text-paper">{t('hud.spectator')}</div>
      <div className="flex max-w-full gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        <button onClick={() => useGame.getState().set({ followId: null })} className={chip(followId === null)} aria-pressed={followId === null}>
          {t('hud.freeCam')}
        </button>
        {alive.map((p) => (
          <button key={p.id} onClick={() => useGame.getState().set({ followId: p.id })} className={chip(followId === p.id)} aria-pressed={followId === p.id}>
            {t('hud.follow')} {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
