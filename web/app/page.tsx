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
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-8 p-6">
      <MonsoonBackdrop />
      <div className="animate-rise">
        <Logo />
      </div>
      <p className="animate-rise max-w-sm text-center text-mist [animation-delay:200ms]">{t('app.tagline')}</p>
      <div className="flex items-center gap-3 text-sm text-rain">
        <Spinner className="h-4 w-4" />
        {t('splash.loading')}
      </div>
    </main>
  );
}
