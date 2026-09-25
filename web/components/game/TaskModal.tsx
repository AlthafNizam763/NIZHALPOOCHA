'use client';
import { useCallback, useEffect, useState } from 'react';
import { GAME, SABOTAGE_DEFS, TASK_DEFS, type MinigameKind } from '@nizhal/shared';
import { useGame } from '@/state/gameStore';
import { useUi } from '@/state/uiStore';
import { useT } from '@/hooks/useT';
import { actions as net, errorKey } from '@/services/net';
import type { I18nKey } from '@/utils/i18n';
import { ArrangeGame, ClearGame, HoldRepair, MemoryGame, NumbersGame, TimingGame, WiresGame, type MinigameProps } from './minigames/Minigames';

const GAMES: Record<MinigameKind, (p: MinigameProps) => React.ReactElement> = {
  wires: WiresGame,
  numbers: NumbersGame,
  timing: TimingGame,
  memory: MemoryGame,
  arrange: ArrangeGame,
  clear: ClearGame,
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const close = () => useGame.getState().set({ panel: null });
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-ink/75 p-3">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="surface kasavu animate-screen-in max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-card)] p-4 pt-5 scrollbar-thin sm:p-5 sm:pt-6"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="headline min-w-0 text-2xl leading-tight text-paper">{title}</h2>
          <button
            onClick={close}
            className="tactile flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-line border-b-ink bg-panel-2 text-xl text-mist hover:text-paper"
            aria-label="close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Hosts task mini-games, sabotage repairs, objective pickups and the Cat's "pretend" task. */
export function TaskModal() {
  const t = useT();
  const panel = useGame((s) => s.panel);
  const tasks = useGame((s) => s.self?.tasks);
  const sabotage = useGame((s) => s.state?.sabotage);
  const toast = useUi((s) => s.toast);

  const finishTask = useCallback(
    async (taskId: string) => {
      // The server enforces a minimum duration; retry briefly if we were quicker.
      for (let i = 0; i < 6; i++) {
        const r = await net.taskComplete(taskId);
        if (r.ok) break;
        if (r.error !== 'TOO_FAST') {
          toast(errorKey(r.error), undefined, 'warn');
          break;
        }
        await sleep(500);
      }
      useGame.getState().set({ panel: null });
    },
    [toast],
  );

  const finishRepair = useCallback(
    async (stationId: string) => {
      for (let i = 0; i < 6; i++) {
        const r = await net.repair(stationId);
        if (r.ok) break;
        if (r.error !== 'TOO_FAST') {
          toast(errorKey(r.error), undefined, 'warn');
          break;
        }
        await sleep(400);
      }
      useGame.getState().set({ panel: null });
    },
    [toast],
  );

  const finishObjective = useCallback(
    async (objectiveId: string) => {
      for (let i = 0; i < 6; i++) {
        const r = await net.objectiveCollect(objectiveId);
        if (r.ok) break;
        if (r.error !== 'TOO_FAST') {
          toast(errorKey(r.error), undefined, 'warn');
          break;
        }
        await sleep(400);
      }
      useGame.getState().set({ panel: null });
    },
    [toast],
  );

  if (!panel) return null;

  if (panel.kind === 'objective') {
    return (
      <Shell title={t('objective.antidotePart')}>
        <p className="mb-4 text-center text-sm leading-snug text-mist">{t('objective.collecting')}</p>
        <HoldRepair ms={GAME.OBJECTIVE_MIN_MS + 300} onDone={() => void finishObjective(panel.objectiveId)} />
      </Shell>
    );
  }

  if (panel.kind === 'task') {
    const task = tasks?.find((x) => x.id === panel.taskId);
    if (!task) return null;
    const Game = GAMES[panel.minigame];
    return (
      <Shell title={t(TASK_DEFS[task.type].nameKey as I18nKey)}>
        <Game onDone={() => void finishTask(panel.taskId)} />
      </Shell>
    );
  }

  if (panel.kind === 'repair') {
    if (!sabotage) return null;
    return (
      <Shell title={`${t('action.repair')}: ${t(`sabotage.${sabotage.type}`)}`}>
        <HoldRepair ms={SABOTAGE_DEFS[sabotage.type].repairMinMs + 300} onDone={() => void finishRepair(panel.stationId)} />
      </Shell>
    );
  }

  if (panel.kind === 'fakeTask') {
    const task = tasks?.find((x) => x.id === panel.taskId);
    return (
      <Shell title={task ? t(TASK_DEFS[task.type].nameKey as I18nKey) : t('action.task')}>
        <FakeTask />
      </Shell>
    );
  }
  return null;
}

/** Cats cannot complete tasks; this lets them stand at a station convincingly. */
function FakeTask() {
  const t = useT();
  const [p, setP] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => {
      const v = Math.min(1, (performance.now() - start) / 3500);
      setP(v);
      if (v >= 1) {
        clearInterval(id);
        useGame.getState().set({ panel: null });
      }
    }, 50);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="space-y-3 py-2 text-center">
      <p className="leading-snug text-mist">{t('task.pretend')}</p>
      <div className="mx-auto h-4 max-w-xs overflow-hidden rounded-full border-2 border-line bg-ink">
        <div className="h-full rounded-full bg-lamp" style={{ width: `${p * 100}%` }} />
      </div>
      <p className="text-xs leading-snug text-rain">{t('task.pretendHint')}</p>
    </div>
  );
}
