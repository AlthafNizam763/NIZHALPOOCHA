'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth } from '@/hooks/useRoute';
import { audio } from '@/services/audio';
import { narrator } from '@/services/narrator';
import { markOnboarding } from '@/services/profile';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Button } from '@/components/ui/Button';
import { Cinematic } from '@/components/intro/Cinematic';
import { NarrationControls } from '@/components/intro/NarrationControls';
import { IntroRecap } from '@/components/intro/IntroRecap';

type Stage = 'ready' | 'film' | 'recap';

/**
 * The story intro. First-time players continue to the tutorial afterwards
 * (skipping shows a short recap first); a replay from Story returns there.
 */
export default function IntroPage() {
  const ready = useRequireAuth();
  const t = useT();
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const [stage, setStage] = useState<Stage>('ready');
  // Decided once, so marking the intro as seen mid-way doesn't flip the flow.
  const [firstRun, setFirstRun] = useState<boolean | null>(null);

  useEffect(() => {
    if (profile && firstRun === null) setFirstRun(!profile.onboarding.hasSeenIntro);
  }, [profile, firstRun]);

  useEffect(
    () => () => {
      audio.stopDrone();
      audio.stopAmbience();
      narrator.stop();
    },
    [],
  );

  const toTutorial = useCallback(() => router.replace('/tutorial'), [router]);

  const leave = useCallback(
    (skipped: boolean) => {
      audio.stopDrone();
      audio.stopAmbience();
      narrator.stop();
      if (!firstRun) return router.replace('/story');
      void markOnboarding({ hasSeenIntro: true });
      if (skipped) setStage('recap');
      else toTutorial();
    },
    [firstRun, router, toTutorial],
  );

  if (!ready || !profile || firstRun === null) return <LoadingScreen messageKey="loading.profile" />;

  if (stage === 'recap') return <IntroRecap onDone={toTutorial} />;

  if (stage === 'film') return <Cinematic onDone={() => leave(false)} onSkip={() => leave(true)} />;

  // A tap is needed before audio can start (browser autoplay rules).
  return (
    <main className="fixed inset-0 flex flex-col items-center overflow-y-auto bg-ink p-4 pt-safe pb-safe text-center">
      <div className="menu-rain absolute inset-0 opacity-60" aria-hidden />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_100%,color-mix(in_srgb,var(--color-lamp)_16%,transparent),transparent_70%)]"
      />
      <div className="animate-screen-in relative my-auto flex w-full max-w-md flex-col items-center gap-5 [@media(max-height:480px)]:gap-2.5">
        <p className="font-display text-sm font-bold uppercase leading-tight tracking-[0.3em] text-lamp">{t('intro.prerollTitle')}</p>
        <div>
          <h1 className="headline text-5xl leading-none text-paper max-[380px]:text-4xl sm:text-6xl [@media(max-height:480px)]:text-4xl">NIZHALPOOCHA</h1>
          <span className="headline mt-1 block text-3xl leading-tight text-lamp [@media(max-height:480px)]:text-2xl">നിഴൽപ്പൂച്ച</span>
          <div aria-hidden className="mt-2 flex justify-center gap-1.5">
            <span className="h-[3px] w-10 rounded-full bg-lamp" />
            <span className="h-[3px] w-3 rounded-full bg-gold-deep" />
          </div>
        </div>
        <p className="max-w-sm text-sm leading-snug text-mist">{t('intro.beginHint')}</p>
        <div className="surface kasavu flex w-full flex-col items-center gap-3 rounded-[var(--radius-card)] p-4 pt-5 [@media(max-height:480px)]:gap-2 [@media(max-height:480px)]:p-3 [@media(max-height:480px)]:pt-4">
          <Button
            variant="gold"
            size="lg"
            full
            onClick={() => {
              audio.unlock();
              audio.startAmbience();
              setStage('film');
            }}
          >
            {t('intro.begin')}
          </Button>
          <NarrationControls className="items-center text-center" />
        </div>
        <button
          type="button"
          onClick={() => leave(true)}
          className="flex min-h-10 items-center gap-1.5 rounded-full px-4 font-display text-sm font-bold text-rain transition-colors hover:bg-panel-2/70 hover:text-paper"
        >
          {t('intro.skip')}
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
            <path d="M5 5l9 7-9 7V5zm10 0h3v14h-3V5z" />
          </svg>
        </button>
      </div>
    </main>
  );
}
