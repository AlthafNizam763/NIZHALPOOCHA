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
import { Cinematic, NarrationToggle } from '@/components/intro/Cinematic';
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
    <main className="fixed inset-0 flex flex-col items-center justify-center gap-6 bg-black p-6 pt-safe pb-safe text-center">
      <div className="menu-rain absolute inset-0 opacity-60" aria-hidden />
      <p className="relative font-display text-sm uppercase tracking-[0.3em] text-lamp">{t('intro.prerollTitle')}</p>
      <h1 className="relative font-display text-5xl text-paper sm:text-6xl">
        NIZHALPOOCHA
        <span className="mt-1 block text-3xl text-lamp">നിഴൽപ്പൂച്ച</span>
      </h1>
      <p className="relative max-w-sm text-sm text-mist">{t('intro.beginHint')}</p>
      <div className="relative flex flex-col items-center gap-3">
        <Button
          variant="lamp"
          size="lg"
          className="min-w-48"
          onClick={() => {
            audio.unlock();
            audio.startAmbience();
            setStage('film');
          }}
        >
          {t('intro.begin')}
        </Button>
        <NarrationToggle />
        <button type="button" onClick={() => leave(true)} className="h-10 text-sm text-rain underline-offset-4 hover:text-paper hover:underline">
          {t('intro.skip')}
        </button>
      </div>
    </main>
  );
}
