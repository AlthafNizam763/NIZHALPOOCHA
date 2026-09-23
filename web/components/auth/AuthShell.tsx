'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { firebaseEnabled } from '@/services/firebase';
import { authErrorKey, signInGoogle, signInGuest } from '@/services/auth';
import type { I18nKey } from '@/utils/i18n';
import { MonsoonBackdrop, Logo } from '@/components/ui/Backdrop';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Controls';

/** Shared layout for Login / Register: logo column on wide screens, card below it on phones. */
export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  const t = useT();
  const router = useRouter();
  const status = useAuth((s) => s.status);

  useEffect(() => {
    if (status === 'signedIn') router.replace('/home');
  }, [status, router]);

  return (
    <main className="relative flex min-h-dvh items-center justify-center p-4 pt-safe pb-safe">
      <MonsoonBackdrop />
      <div className="grid w-full max-w-4xl items-center gap-6 md:grid-cols-2">
        <div className="hidden text-center md:block">
          <Logo />
          <p className="mx-auto mt-6 max-w-sm text-mist">{t('app.tagline')}</p>
        </div>
        <Panel className="animate-rise w-full p-5 sm:p-6">
          <div className="mb-4 md:hidden">
            <Logo small />
          </div>
          <h1 className="font-display mb-4 text-2xl">{title}</h1>
          {!firebaseEnabled && <p className="mb-4 rounded-lg border border-lamp/40 bg-night p-3 text-xs text-lamp">{t('common.devMode')}</p>}
          {children}
          <AltSignIn />
        </Panel>
      </div>
    </main>
  );
}

/** Google (when Firebase is configured) and guest sign-in, shown under both forms. */
function AltSignIn() {
  const t = useT();
  const [busy, setBusy] = useState<'google' | 'guest' | null>(null);
  const [error, setError] = useState<I18nKey | null>(null);

  async function run(tag: 'google' | 'guest', fn: () => Promise<void>) {
    setBusy(tag);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(authErrorKey(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3">
      {firebaseEnabled && (
        <>
          <div className="my-3 flex items-center gap-3 text-xs text-rain">
            <span className="h-px flex-1 bg-line" />
            {t('auth.or')}
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" full loading={busy === 'google'} disabled={!!busy} onClick={() => void run('google', signInGoogle)}>
            {t('auth.google')}
          </Button>
        </>
      )}
      <Button
        variant={firebaseEnabled ? 'ghost' : 'primary'}
        size={firebaseEnabled ? 'md' : 'lg'}
        full
        className="mt-2"
        loading={busy === 'guest'}
        disabled={!!busy}
        onClick={() => void run('guest', signInGuest)}
      >
        {t('auth.guest')}
      </Button>
      {error && <p className="mt-2 text-sm text-laterite">{t(error)}</p>}
    </div>
  );
}

export function AuthSwitch({ prompt, action, href }: { prompt: string; action: string; href: string }) {
  const router = useRouter();
  return (
    <p className="mt-3 text-center text-sm text-rain">
      {prompt}{' '}
      <button type="button" onClick={() => router.push(href)} className="h-10 font-semibold text-leaf hover:text-paper">
        {action}
      </button>
    </p>
  );
}
