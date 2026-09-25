'use client';
import { useRouter } from 'next/navigation';
import { useConnection } from '@/state/connectionStore';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { reconnectNow } from '@/services/net';
import { logout } from '@/services/auth';
import { Button } from './ui/Button';
import { Spinner } from './ui/Controls';

/** Lantern with its flame gone out — the "no connection" mark. */
function DarkLantern() {
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M24 12h16M32 6v6" stroke="var(--color-line-strong)" strokeWidth="3" />
      <path d="M22 14h20l3 8H19z" fill="var(--color-panel-2)" stroke="var(--color-line-strong)" strokeWidth="2.5" />
      <rect x="21" y="22" width="22" height="26" rx="4" fill="var(--color-ink)" stroke="var(--color-lamp)" strokeOpacity="0.55" strokeWidth="2.5" />
      <path d="M32 40c-3 0-4-2.5-4-4.5 0-3 4-7 4-7s4 4 4 7c0 2-1 4.5-4 4.5z" stroke="var(--color-rain)" strokeWidth="2" strokeDasharray="2.5 3" />
      <path d="M19 48h26l-2 6H21z" fill="var(--color-panel-2)" stroke="var(--color-line-strong)" strokeWidth="2.5" />
      <path d="M48 20l8-8M56 20l-8-8" stroke="var(--color-laterite)" strokeWidth="3" />
    </svg>
  );
}

/** Reconnecting / connection lost / session replaced / auth failure. */
export function ConnectionOverlay() {
  const status = useConnection((s) => s.status);
  const signedIn = useAuth((s) => s.status === 'signedIn');
  const t = useT();
  const router = useRouter();
  if (!signedIn) return null;

  if (status === 'reconnecting') {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[65] flex justify-center pb-safe px-3">
        <div className="surface animate-rise mb-1 flex items-center gap-3 rounded-full border-lamp/50 py-2 pl-3 pr-5 text-sm font-semibold leading-tight text-paper" role="status">
          <Spinner className="h-6 w-8 shrink-0" />
          {t('conn.reconnecting')}
        </div>
      </div>
    );
  }

  if (status === 'disconnected' || status === 'replaced' || status === 'unauthorized') {
    const msg = status === 'replaced' ? 'conn.replaced' : status === 'unauthorized' ? 'err.UNAUTHORIZED' : 'conn.lostHint';
    return (
      <div className="fixed inset-0 z-[66] flex items-center justify-center bg-ink/85 p-4" role="alertdialog" aria-modal="true" aria-label={t('conn.lost')}>
        <div className="surface kasavu animate-screen-in w-full max-w-sm rounded-[var(--radius-card)] p-6 pt-7 text-center">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-line bg-ink/70">
            <DarkLantern />
          </div>
          <div className="headline mb-2 text-2xl leading-tight text-paper">{t('conn.lost')}</div>
          <p className="mb-5 leading-snug text-mist">{t(msg)}</p>
          <div className="grid gap-2">
            {status === 'unauthorized' ? (
              <Button variant="gold" size="lg" full onClick={() => void logout().then(() => router.push('/login'))}>
                {t('auth.login')}
              </Button>
            ) : (
              <Button variant="gold" size="lg" full onClick={reconnectNow}>
                {t('common.retry')}
              </Button>
            )}
            <Button variant="secondary" full onClick={() => router.push('/home')}>
              {t('common.home')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
