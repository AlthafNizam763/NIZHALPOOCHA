'use client';
import { useEffect, useState } from 'react';
import { TASK_DEFS, getMap, type TaskAssignment } from '@nizhal/shared';
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

// ── Top-left: task progress ───────────────────────────────────────────────
export function TaskPanel() {
  const t = useT();
  const progress = useGame((s) => s.state?.taskProgress);
  const tasks = useGame((s) => s.self?.tasks ?? EMPTY_TASKS);
  const isCat = useGame((s) => s.self?.role === 'CAT');
  // Compact by default on short (phone landscape) screens; tap to expand.
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.innerHeight > 520);
  const map = getMap(useGame.getState().state?.mapId ?? 'kadalimukku_night');
  const zoneName = (task: TaskAssignment) => {
    const st = map.taskStations.find((s) => s.id === task.stationId);
    return st ? t(`zone.${st.zoneId}` as I18nKey) : '';
  };

  return (
    <div className="pointer-events-auto w-56 max-w-[40vw] rounded-xl border border-line/80 bg-ink/80 p-2.5 text-xs sm:w-64 sm:text-sm">
      <button className="flex w-full items-center justify-between" onClick={() => setOpen(!open)}>
        <span className="font-semibold uppercase tracking-wide text-mist">{t('hud.totalTasks')}</span>
        <span className="text-rain">{open ? '▾' : '▸'}</span>
      </button>
      {progress ? (
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-night">
            <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }} />
          </div>
          <span className="tabular-nums text-mist">
            {progress.done}/{progress.total}
          </span>
        </div>
      ) : (
        <div className="mt-1.5 text-laterite">{t('hud.commsDown')}</div>
      )}
      {open && (
        <ul className="mt-2 space-y-1">
          {isCat && <li className="text-[11px] text-lamp">{t('hud.fakeTasks')}</li>}
          {tasks.map((task) => (
            <li key={task.id} className={`flex justify-between gap-2 ${task.done ? 'text-leaf line-through opacity-70' : 'text-paper'}`}>
              <span className="truncate">{t(TASK_DEFS[task.type].nameKey as I18nKey)}</span>
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
        <div className="animate-pulse rounded-lg border border-laterite bg-laterite/85 px-3 py-1 text-sm font-bold">
          {t('hud.critical', { name: t(`sabotage.${sab.type}`), n: Math.max(0, Math.ceil((sab.endsAt! - serverNow()) / 1000)) })}
        </div>
      ) : (
        <div className="rounded-lg bg-ink/70 px-3 py-1 font-display text-lg tabular-nums text-paper">{state.startedAt ? mmss(serverNow() - state.startedAt) : '0:00'}</div>
      )}
      {sab && !sab.critical && <div className="rounded-md bg-laterite/80 px-2 py-0.5 text-xs">{t(`sabotage.${sab.type}`)}</div>}
      <div className="rounded-md bg-ink/60 px-2 py-0.5 text-xs text-mist">{t(`zone.${zoneId}` as I18nKey)}</div>
    </div>
  );
}

// ── Top-right: ping / map / menu ─────────────────────────────────────────
export function TopRight() {
  const t = useT();
  const ping = useConnection((s) => s.ping);
  const setPanel = (p: 'map' | 'menu') => useGame.getState().set({ panel: useGame.getState().panel?.kind === p ? null : { kind: p } });
  const pingColor = ping === null ? 'text-rain' : ping < 120 ? 'text-leaf' : ping < 250 ? 'text-lamp' : 'text-laterite';
  return (
    <div className="pointer-events-auto flex items-center gap-2">
      <VoiceControls compact />
      <span className={`rounded-md bg-ink/70 px-2 py-1 text-xs tabular-nums ${pingColor}`}>{ping === null ? '—' : t('hud.ping', { n: ping })}</span>
      <button onClick={() => setPanel('map')} data-tut="map" className="h-11 rounded-xl border border-line bg-ink/80 px-3 text-sm">
        {t('hud.map')}
      </button>
      <button onClick={() => setPanel('menu')} className="h-11 w-11 rounded-xl border border-line bg-ink/80 text-lg" aria-label={t('hud.menu')}>
        ☰
      </button>
    </div>
  );
}

// ── Bottom-right: contextual actions ─────────────────────────────────────
function ActionButton({
  label,
  hotkey,
  onClick,
  tone,
  cooldown,
  big,
  tut,
}: {
  label: string;
  hotkey?: string;
  onClick: () => void;
  tone: 'task' | 'danger' | 'report' | 'neutral';
  cooldown?: number;
  big?: boolean;
  /** Anchor for the tutorial coach's highlight. */
  tut?: string;
}) {
  const tones = {
    task: 'border-lamp/70 bg-lamp/90 text-ink',
    danger: 'border-laterite bg-laterite text-paper',
    report: 'border-canal bg-canal text-paper',
    neutral: 'border-line bg-panel-2/95 text-paper',
  };
  const cooling = (cooldown ?? 0) > 0;
  return (
    <button
      onClick={onClick}
      disabled={cooling}
      data-tut={tut}
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 font-display uppercase shadow-lg transition-transform active:scale-95 disabled:opacity-55 ${tones[tone]} ${
        big ? 'h-20 w-20 text-base sm:h-24 sm:w-24' : 'h-16 w-16 text-sm sm:h-20 sm:w-20'
      }`}
    >
      {cooling ? <span className="text-2xl tabular-nums">{cooldown}</span> : <span className="leading-tight">{label}</span>}
      {hotkey && <span className="absolute right-1.5 top-1 hidden text-[10px] opacity-60 sm:block">{hotkey}</span>}
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
        else if (gs.actions.taskId) void doTask();
        else if (gs.actions.emergency) void doEmergency();
      } else if (k === 'r' && gs.actions.bodyId) void doReport();
      else if (k === 'f' && gs.self.role === 'CAT' && gs.actions.killTargetId) void doKill();
      else if (k === 'q' && gs.self.role === 'CAT') doSabotage();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (phase !== 'PLAYING' || !alive) return null;

  return (
    <div className="pointer-events-auto flex flex-wrap-reverse items-end justify-end gap-2 sm:gap-3">
      {acts.emergency && <ActionButton label={t('action.emergency')} hotkey="E" tone="neutral" cooldown={emCd > 0 ? emCd : 0} onClick={() => void doEmergency()} />}
      {acts.repairStationId && <ActionButton label={t('action.repair')} hotkey="E" tone="task" tut="action-repair" onClick={() => void doRepair()} />}
      {acts.taskId && <ActionButton label={t('action.task')} hotkey="E" tone="task" tut="action-task" onClick={() => void doTask()} />}
      {acts.bodyId && <ActionButton label={t('action.report')} hotkey="R" tone="report" big tut="action-report" onClick={() => void doReport()} />}
      {isCat && <ActionButton label={t('action.sabotage')} hotkey="Q" tone="neutral" cooldown={sabCd > 0 ? sabCd : 0} onClick={doSabotage} />}
      {isCat && (acts.killTargetId || !touch) && (
        <ActionButton
          label={t('action.kill')}
          hotkey="F"
          tone="danger"
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
  return (
    <div className="pointer-events-auto flex max-w-[90vw] flex-col items-center gap-1.5">
      <div className="rounded-lg border border-canal bg-canal/80 px-3 py-1 font-display text-sm uppercase tracking-widest">{t('hud.spectator')}</div>
      <div className="flex max-w-full gap-1.5 overflow-x-auto scrollbar-thin">
        <button onClick={() => useGame.getState().set({ followId: null })} className={`h-9 shrink-0 rounded-lg border px-3 text-xs ${followId === null ? 'border-paper bg-panel-2' : 'border-line bg-ink/80'}`}>
          {t('hud.freeCam')}
        </button>
        {alive.map((p) => (
          <button
            key={p.id}
            onClick={() => useGame.getState().set({ followId: p.id })}
            className={`h-9 shrink-0 rounded-lg border px-3 text-xs ${followId === p.id ? 'border-paper bg-panel-2' : 'border-line bg-ink/80'}`}
          >
            {t('hud.follow')} {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

