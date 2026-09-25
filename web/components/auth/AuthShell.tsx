'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Appearance } from '@nizhal/shared';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { firebaseEnabled } from '@/services/firebase';
import { authErrorKey, signInGoogle, signInGuest } from '@/services/auth';
import type { I18nKey } from '@/utils/i18n';
import { MonsoonBackdrop, Logo } from '@/components/ui/Backdrop';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Controls';
import { Notice } from '@/components/ui/Feedback';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';

/** Villagers waiting under the lamp on the sign-in screen (illustration only). */
const WAITING: Appearance[] = [
  { body: 'girl', skin: 2, hair: 0, hairColor: 0, top: 3, topStyle: 'raincoat', bottom: 7, footwear: 'sandals', accessory: 'umbrella' },
  { body: 'boy', skin: 1, hair: 2, hairColor: 1, top: 4, topStyle: 'shirt', bottom: 4, footwear: 'sandals', accessory: 'none' },
];

/** Shared layout for Login / Register: logo + illustration on wide screens, the card on top on phones. */
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
      <div className="grid w-full max-w-5xl items-center gap-8 md:grid-cols-[1.1fr_1fr]">
        <div className="hidden flex-col items-center text-center md:flex">
          <div className="animate-rise">
            <Logo small />
          </div>
          <p className="mx-auto mt-4 max-w-sm font-display text-lg font-bold text-paper">{t('app.tagline')}</p>
          <div aria-hidden className="relative mt-6 flex items-end gap-4">
            <span className="absolute inset-x-0 -bottom-1 mx-auto h-6 w-56 rounded-[50%] bg-[radial-gradient(ellipse,rgba(241,180,62,.3),transparent_70%)]" />
            <div className="animate-idle">
              <CharacterAvatar appearance={WAITING[0]!} size={120} mood="scared" blink />
            </div>
            <div className="animate-idle [animation-delay:.8s]">
              <CharacterAvatar appearance={WAITING[1]!} size={120} mood="suspicious" blink />
            </div>
          </div>
        </div>
        <Panel kasavu className="animate-screen-in w-full p-5 pt-7 sm:p-7">
          <div className="mb-4 md:hidden">
            <Logo small />
          </div>
          <h1 className="headline mb-1 text-3xl text-paper">{title}</h1>
          <div aria-hidden className="mb-5 flex gap-1.5">
            <span className="h-[3px] w-10 rounded-full bg-lamp" />
            <span className="h-[3px] w-3 rounded-full bg-gold-deep" />
          </div>
          {!firebaseEnabled && (
            <Notice tone="warn" className="mb-4 text-xs">
              {t('common.devMode')}
            </Notice>
          )}
          {children}
          <AltSignIn />
        </Panel>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
      <path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2-1.9 3.2-4.7 3.2-8z" />
      <path fill="#34A853" d="M12 23c3 0 5.5-1 7.3-2.7l-3.6-2.8c-1 .7-2.2 1.1-3.7 1.1-2.9 0-5.3-1.9-6.2-4.5H2.1v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.8 14.1a6.6 6.6 0 0 1 0-4.2V7.1H2.1a11 11 0 0 0 0 9.8l3.7-2.8z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2.1 7.1l3.7 2.8C6.7 7.3 9.1 5.4 12 5.4z" />
    </svg>
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
          <div className="my-4 flex items-center gap-3 font-display text-xs font-bold uppercase tracking-wider text-rain">
            <span className="h-px flex-1 bg-line" />
            {t('auth.or')}
            <span className="h-px flex-1 bg-line" />
          </div>
          <Button variant="secondary" full icon={<GoogleMark />} loading={busy === 'google'} disabled={!!busy} onClick={() => void run('google', signInGoogle)}>
            {t('auth.google')}
          </Button>
        </>
      )}
      <Button
        variant={firebaseEnabled ? 'ghost' : 'gold'}
        size={firebaseEnabled ? 'md' : 'lg'}
        full
        className="mt-2"
        loading={busy === 'guest'}
        disabled={!!busy}
        onClick={() => void run('guest', signInGuest)}
      >
        {t('auth.guest')}
      </Button>
      {error && (
        <Notice tone="danger" className="mt-2">
          {t(error)}
        </Notice>
      )}
    </div>
  );
}

export function AuthSwitch({ prompt, action, href }: { prompt: string; action: string; href: string }) {
  const router = useRouter();
  return (
    <p className="mt-3 text-center text-sm text-rain">
      {prompt}{' '}
      <button type="button" onClick={() => router.push(href)} className="h-10 font-display font-bold text-lamp underline-offset-4 hover:underline">
        {action}
      </button>
    </p>
  );
}
