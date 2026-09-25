'use client';
import { useEffect, useState } from 'react';
import { useGame } from '@/state/gameStore';
import { useSettings } from '@/state/settingsStore';
import { useT } from '@/hooks/useT';
import { useIsTouch } from '@/hooks/useDevice';
import { narrator } from '@/services/narrator';
import type { I18nKey } from '@/utils/i18n';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Controls';
import { CatForm } from '@/components/ui/CatForm';
import { NarrationControls, NarrationStatus } from '@/components/intro/NarrationControls';
import { SPOKEN_KEYS } from '@/utils/i18n/narration';
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

/** Pulsing gold ring + bouncing arrow over the HUD element the coach refers to. */
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
      <div
        className="tut-ring absolute rounded-2xl border-2 border-lamp"
        style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }}
      />
      <div className="tut-bounce absolute -translate-x-1/2" style={{ left: rect.left + rect.width / 2, top: Math.max(4, rect.top - 44) }}>
        <svg viewBox="0 0 28 24" className="h-7 w-8 drop-shadow-[0_3px_0_var(--color-ink)]">
          <path d="M3 3h22L14 21z" fill="var(--color-lamp)" stroke="var(--color-gold-deep)" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
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
    if (spoken) void narrator.say(spoken);
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
      <div className="surface animate-rise pointer-events-auto relative w-full max-w-md rounded-[var(--radius-card)] py-2.5 pl-4 pr-3 [@media(max-height:480px)]:py-2">
        {/* Callout tail: down toward the player, or toward the meeting corner. */}
        <span
          aria-hidden
          className={`absolute -bottom-[7px] h-3 w-3 rotate-45 border-b-[1.5px] border-r-[1.5px] border-line bg-panel ${inMeeting ? 'left-6' : 'left-1/2 -translate-x-1/2'}`}
        />
        <span aria-hidden className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-lamp" />
        <div className="mb-1 flex items-center justify-between gap-3">
          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {lesson && (
              <>
                <span className="flex gap-0.5" aria-hidden>
                  {LESSONS.map((l, i) => (
                    <span key={l} className={`h-1.5 w-3 rounded-full ${i < n - 1 ? 'bg-leaf' : i === n - 1 ? 'bg-lamp' : 'bg-ink'}`} />
                  ))}
                </span>
                <span className="font-display text-xs font-bold leading-tight text-mist">
                  {t('tut.lesson', { n, total: LESSONS.length })} · {t(LESSON_KEYS[lesson])}
                </span>
              </>
            )}
          </span>
          <button
            type="button"
            onClick={onSkip}
            className="flex min-h-8 shrink-0 items-center gap-1 rounded-full border border-line bg-ink/60 px-2.5 font-display text-xs font-bold leading-tight text-rain transition-colors hover:border-lamp/60 hover:text-paper"
          >
            {t('tut.skip')}
            <svg viewBox="0 0 24 24" className="h-3 w-3 shrink-0" fill="currentColor" aria-hidden>
              <path d="M5 5l9 7-9 7V5zm10 0h3v14h-3V5z" />
            </svg>
          </button>
        </div>
        <p key={spoken} className="animate-rise text-base leading-snug sm:text-lg [@media(max-height:480px)]:text-sm" aria-live="polite">
          {thought ? (
            <span className="italic text-paper">
              <span className="mr-1.5 font-display font-bold not-italic text-leaf">{t('tut.you')}:</span>“{t(thought)}”
            </span>
          ) : (
            <span className="font-display font-bold text-lamp">{t(objective!)}</span>
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
        className="tut-ring tactile pointer-events-auto relative m-2 flex h-20 w-20 flex-col items-center justify-center rounded-[var(--radius-card)] border-2 border-canal-deep bg-canal px-1 font-display text-sm font-bold uppercase leading-tight text-paper sm:h-24 sm:w-24"
      >
        <svg viewBox="0 0 24 24" className="mb-0.5 h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <circle cx="10.5" cy="10.5" r="6" />
          <path d="M15 15l5 5" />
        </svg>
        {t('tut.inv.inspect')}
        <span className="absolute right-1.5 top-1 hidden h-4 min-w-4 items-center justify-center rounded bg-ink/50 px-0.5 text-[10px] leading-none text-mist sm:flex">E</span>
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
    <div className="pointer-events-auto fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto bg-ink/75 p-3" onClick={close}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('tut.title')}
        className="surface kasavu animate-screen-in my-auto w-full max-w-sm space-y-3 rounded-[var(--radius-card)] p-5 pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="headline text-2xl leading-tight text-paper">{t('tut.title')}</h2>
        <NarrationControls />
        <p className="hidden rounded-xl bg-ink/60 px-3 py-2 text-xs leading-snug text-rain sm:block">{t('set.keys')}</p>
        <Button full variant="gold" onClick={close}>
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
    <div className="pointer-events-auto fixed inset-0 z-[70] flex flex-col items-center overflow-y-auto bg-ink/95 p-4 pt-safe pb-safe">
      <div className="surface kasavu animate-screen-in my-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-[var(--radius-card)] px-4 pb-5 pt-6 text-center sm:px-6 [@media(max-height:480px)]:gap-2.5 [@media(max-height:480px)]:pb-3 [@media(max-height:480px)]:pt-4">
        {outcome === 'caught' && <CatForm size={96} className="[@media(max-height:480px)]:hidden" />}
        <div className="font-display text-sm font-bold uppercase leading-tight tracking-[0.3em] text-leaf">{t('tut.done.title')}</div>
        <h2 className={`headline text-3xl leading-tight sm:text-4xl [@media(max-height:480px)]:text-2xl ${outcome === 'caught' ? 'text-lamp' : 'text-paper'}`}>
          {t(outcome === 'caught' ? 'tut.result.caught' : 'tut.result.missed')}
        </h2>
        {outcome === 'missed' && <p className="leading-snug text-mist">{t('tut.result.missedHint')}</p>}
        <ul className="flex flex-wrap justify-center gap-1.5">
          {LESSONS.map((l) => (
            <li key={l}>
              <Badge tone="good">✓ {t(LESSON_KEYS[l])}</Badge>
            </li>
          ))}
        </ul>
        <p className="max-w-md text-sm leading-snug text-mist">{t('tut.done.body')}</p>
        <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:justify-center">
          <Button variant="secondary" size="lg" onClick={onAgain}>
            {t('tut.done.again')}
          </Button>
          <Button variant="gold" size="lg" onClick={onContinue}>
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
  useEffect(() => {
    void narrator.preload(SPOKEN_KEYS.filter((k) => k.startsWith('tut.')));
    return () => narrator.stop();
  }, []);
  return (
    <>
      <CoachCard onSkip={onSkip} />
      <div className="pointer-events-none fixed inset-x-0 top-[11rem] z-[56] flex justify-center px-3 [@media(max-height:480px)]:top-[9.5rem]">
        <div className="pointer-events-auto">
          <NarrationStatus />
        </div>
      </div>
      <Highlight />
      <InspectButton director={director} />
      <TutorialMenu onExit={onSkip} exitLabel={exitLabel} />
      <Complete onContinue={onFinish} onAgain={onRestart} />
    </>
  );
}
