'use client';
import { useEffect, useState } from 'react';
import { useGame } from '@/state/gameStore';
import { useSettings } from '@/state/settingsStore';
import { useT } from '@/hooks/useT';
import { useIsTouch } from '@/hooks/useDevice';
import { narrator } from '@/services/narrator';
import type { I18nKey } from '@/utils/i18n';
import { Button } from '@/components/ui/Button';
import { CatForm } from '@/components/ui/CatForm';
import { NarrationControls } from '@/components/intro/NarrationControls';
import { LESSONS, useTutorial, type CoachLine, type LessonId } from './tutorialStore';
import type { TutorialDirector } from './director';

const LESSON_KEYS: Record<LessonId, I18nKey> = {
  move: 'tut.lesson.move',
  camera: 'tut.lesson.camera',
  interact: 'tut.lesson.interact',
  task: 'tut.lesson.task',
  investigate: 'tut.lesson.investigate',
  report: 'tut.lesson.report',
  meeting: 'tut.lesson.meeting',
  vote: 'tut.lesson.vote',
};

function lineKey(line: CoachLine | null, touch: boolean): I18nKey | null {
  if (!line) return null;
  return typeof line === 'string' ? line : touch ? line.touch : line.keys;
}

/** Pulsing ring + bouncing arrow over the HUD element the coach refers to. */
function Highlight() {
  const target = useTutorial((s) => s.highlight);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!target) return setRect(null);
    const find = () => {
      // First visible match (e.g. the meeting chat panel is hidden behind a toggle on phones).
      const els = document.querySelectorAll(`[data-tut="${target}"]`);
      const r = [...els].map((el) => el.getBoundingClientRect()).find((b) => b.width > 0 && b.height > 0);
      setRect(r ?? null);
    };
    find();
    const id = setInterval(find, 200);
    return () => clearInterval(id);
  }, [target]);

  if (!rect) return null;
  const pad = 6;
  return (
    <div className="pointer-events-none fixed inset-0 z-[65]" aria-hidden>
      <div className="tut-ring absolute rounded-2xl" style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }} />
      <div className="tut-bounce absolute -translate-x-1/2 text-3xl text-lamp drop-shadow-[0_2px_2px_rgba(0,0,0,.8)]" style={{ left: rect.left + rect.width / 2, top: Math.max(4, rect.top - 44) }}>
        ▼
      </div>
    </div>
  );
}

/** Short guided line: what to do now, or the player's own thought. */
function CoachCard({ onSkip }: { onSkip: () => void }) {
  const t = useT();
  const touch = useIsTouch();
  const lesson = useTutorial((s) => s.lesson);
  const objective = lineKey(useTutorial((s) => s.objective), touch);
  const thought = useTutorial((s) => s.thought);
  const phase = useGame((s) => s.state?.phase);
  const panel = useGame((s) => s.panel?.kind);
  const spoken = thought ?? objective;

  useEffect(() => {
    if (spoken) narrator.say(spoken);
  }, [spoken]);

  const hiddenPhase = phase === 'ROLE_REVEAL' || phase === 'REPORT' || phase === 'RESULT' || phase === 'FINISHED';
  const busy = panel === 'task' || panel === 'repair' || panel === 'fakeTask' || panel === 'menu';
  if (hiddenPhase || busy || (!objective && !thought)) return null;

  const inMeeting = phase === 'MEETING' || phase === 'VOTING';
  const n = lesson ? LESSONS.indexOf(lesson) + 1 : 0;

  return (
    <div
      className={`pointer-events-none fixed z-[55] flex ${
        inMeeting ? 'bottom-20 left-3 max-w-[min(24rem,48vw)] md:bottom-4' : 'inset-x-0 top-[5.5rem] justify-center px-3 [@media(max-height:480px)]:top-[4.8rem]'
      }`}
    >
      <div className="animate-rise pointer-events-auto w-full max-w-md rounded-2xl border border-lamp/50 bg-ink/90 px-4 py-2.5 shadow-[0_8px_24px_rgba(0,0,0,.55)] backdrop-blur-sm">
        <div className="mb-1 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-wider text-rain">
          <span className="flex items-center gap-2">
            {lesson && (
              <>
                <span className="flex gap-0.5" aria-hidden>
                  {LESSONS.map((l, i) => (
                    <span key={l} className={`h-1.5 w-3 rounded-full ${i < n - 1 ? 'bg-leaf' : i === n - 1 ? 'bg-lamp' : 'bg-white/15'}`} />
                  ))}
                </span>
                <span>
                  {t('tut.lesson', { n, total: LESSONS.length })} · {t(LESSON_KEYS[lesson])}
                </span>
              </>
            )}
          </span>
          <button type="button" onClick={onSkip} className="normal-case tracking-normal text-rain underline-offset-2 hover:text-paper hover:underline">
            {t('tut.skip')}
          </button>
        </div>
        <p key={spoken} className="animate-rise text-base leading-snug sm:text-lg" aria-live="polite">
          {thought ? (
            <span className="italic text-paper">
              <span className="mr-1.5 not-italic font-semibold text-leaf">{t('tut.you')}:</span>“{t(thought)}”
            </span>
          ) : (
            <span className="font-semibold text-lamp">{t(objective!)}</span>
          )}
        </p>
      </div>
    </div>
  );
}

/** The tutorial's own "use" action for clues (investigation lesson). */
function InspectButton({ director }: { director: TutorialDirector }) {
  const t = useT();
  const clue = useTutorial((s) => s.inspectable);
  const panel = useGame((s) => s.panel);
  // Opposite the joystick, where the other action buttons live.
  const left = useSettings((s) => s.joystickSide === 'right');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'e' && !e.repeat) director.inspect();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [director]);

  if (!clue || panel) return null;
  return (
    <div className={`pointer-events-none fixed bottom-0 z-20 pb-safe ${left ? 'left-0 pl-safe' : 'right-0 pr-safe'}`}>
      <button
        type="button"
        onClick={() => director.inspect()}
        className="tut-ring pointer-events-auto relative m-2 flex h-20 w-20 flex-col items-center justify-center rounded-2xl border-2 border-[#9fd3e6] bg-[#2a5f73] font-display text-sm uppercase text-paper shadow-lg active:scale-95 sm:h-24 sm:w-24"
      >
        <svg viewBox="0 0 24 24" className="mb-0.5 h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l5 5" />
        </svg>
        {t('tut.inv.inspect')}
        <span className="absolute right-1.5 top-1 hidden text-[10px] opacity-60 sm:block">E</span>
      </button>
    </div>
  );
}

/** Esc / ☰ inside the tutorial. */
function TutorialMenu({ onExit, exitLabel }: { onExit: () => void; exitLabel: I18nKey }) {
  const t = useT();
  const panel = useGame((s) => s.panel);
  if (panel?.kind !== 'menu') return null;
  const close = () => useGame.getState().set({ panel: null });
  return (
    <div className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-3" onClick={close}>
      <div className="animate-rise w-full max-w-sm space-y-3 rounded-2xl border border-line bg-panel p-5" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-xl">{t('tut.title')}</h2>
        <NarrationControls />
        <p className="hidden text-xs text-rain sm:block">{t('set.keys')}</p>
        <Button full onClick={close}>
          {t('hud.resume')}
        </Button>
        <Button full variant="secondary" onClick={onExit}>
          {t(exitLabel)}
        </Button>
      </div>
    </div>
  );
}

function Complete({ onContinue, onAgain }: { onContinue: () => void; onAgain: () => void }) {
  const t = useT();
  const finished = useTutorial((s) => s.finished);
  const outcome = useTutorial((s) => s.outcome);
  if (!finished) return null;
  return (
    <div className="pointer-events-auto fixed inset-0 z-[70] flex items-center justify-center bg-ink/95 p-4 pt-safe pb-safe">
      <div className="animate-rise flex w-full max-w-lg flex-col items-center gap-4 text-center">
        {outcome === 'caught' && <CatForm size={96} />}
        <div className="font-display text-sm uppercase tracking-[0.3em] text-leaf">{t('tut.done.title')}</div>
        <h2 className={`font-display text-3xl sm:text-4xl ${outcome === 'caught' ? 'text-lamp' : 'text-paper'}`}>{t(outcome === 'caught' ? 'tut.result.caught' : 'tut.result.missed')}</h2>
        {outcome === 'missed' && <p className="text-mist">{t('tut.result.missedHint')}</p>}
        <ul className="flex flex-wrap justify-center gap-1.5">
          {LESSONS.map((l) => (
            <li key={l} className="flex items-center gap-1 rounded-full border border-leaf/40 bg-leaf/10 px-2.5 py-1 text-xs text-leaf">
              ✓ {t(LESSON_KEYS[l])}
            </li>
          ))}
        </ul>
        <p className="max-w-md text-sm text-mist">{t('tut.done.body')}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="secondary" onClick={onAgain}>
            {t('tut.done.again')}
          </Button>
          <Button variant="lamp" size="lg" onClick={onContinue}>
            {t('tut.done.continue')}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TutorialOverlay({
  director,
  onFinish,
  onRestart,
  onSkip,
  exitLabel,
}: {
  director: TutorialDirector;
  onFinish: () => void;
  onRestart: () => void;
  onSkip: () => void;
  exitLabel: I18nKey;
}) {
  useEffect(() => () => narrator.stop(), []);
  return (
    <>
      <CoachCard onSkip={onSkip} />
      <Highlight />
      <InspectButton director={director} />
      <TutorialMenu onExit={onSkip} exitLabel={exitLabel} />
      <Complete onContinue={onFinish} onAgain={onRestart} />
    </>
  );
}
