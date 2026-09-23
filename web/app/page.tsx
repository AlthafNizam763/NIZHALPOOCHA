'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { MonsoonBackdrop, Logo } from '@/components/ui/Backdrop';
import { Spinner } from '@/components/ui/Controls';

/** Splash: restores the session, then routes to login or home. */
export default function SplashPage() {
  const status = useAuth((s) => s.status);
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (status === 'loading') return;
    const id = setTimeout(() => router.replace(status === 'signedIn' ? '/home' : '/login'), 900);
    return () => clearTimeout(id);
  }, [status, router]);

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
