'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/state/authStore';
import { onboardingRoute } from '@/services/onboarding';
import { useT } from '@/hooks/useT';
import { MonsoonBackdrop, Logo } from '@/components/ui/Backdrop';
import { Spinner } from '@/components/ui/Controls';

/**
 * Splash: restores the session, then routes to login, the first-run flow
 * (intro → tutorial) or home.
 */
export default function SplashPage() {
  const status = useAuth((s) => s.status);
  const profile = useAuth((s) => s.profile);
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'signedIn' && !profile) return;
    const target = status === 'signedIn' ? (onboardingRoute(profile!) ?? '/home') : '/login';
    const id = setTimeout(() => router.replace(target), 900);
    return () => clearTimeout(id);
  }, [status, profile, router]);

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 p-6 pt-safe pb-safe">
      <MonsoonBackdrop />
      <div className="animate-rise">
        <Logo />
      </div>
      <p className="animate-rise flex max-w-sm items-center gap-2 text-center font-display text-lg font-bold text-paper [animation-delay:200ms]">
        <span aria-hidden className="h-[2px] w-6 shrink-0 rounded-full bg-lamp/70" />
        {t('app.tagline')}
        <span aria-hidden className="h-[2px] w-6 shrink-0 rounded-full bg-lamp/70" />
      </p>
      <div className="surface mt-4 flex items-center gap-3 rounded-full px-5 py-2.5 text-sm font-semibold text-mist" role="status" aria-busy="true">
        <Spinner className="h-7 w-9" />
        {t('splash.loading')}
      </div>
    </main>
  );
}
