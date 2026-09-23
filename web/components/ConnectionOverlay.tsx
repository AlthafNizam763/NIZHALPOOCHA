'use client';
import { useRouter } from 'next/navigation';
import { useConnection } from '@/state/connectionStore';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { reconnectNow } from '@/services/net';
import { logout } from '@/services/auth';
import { Button } from './ui/Button';
import { Spinner } from './ui/Controls';

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
        <div className="animate-rise flex items-center gap-3 rounded-xl border border-lamp/50 bg-panel px-4 py-2.5 text-sm">
          <Spinner className="h-4 w-4" />
          {t('conn.reconnecting')}
        </div>
      </div>
    );
  }

  if (status === 'disconnected' || status === 'replaced' || status === 'unauthorized') {
    const msg = status === 'replaced' ? 'conn.replaced' : status === 'unauthorized' ? 'err.UNAUTHORIZED' : 'conn.lostHint';
    return (
      <div className="fixed inset-0 z-[66] flex items-center justify-center bg-black/75 p-4">
        <div className="animate-rise w-full max-w-sm rounded-2xl border border-line bg-panel p-6 text-center">
          <div className="font-display mb-2 text-2xl">{t('conn.lost')}</div>
          <p className="mb-5 text-mist">{t(msg)}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {status === 'unauthorized' ? (
              <Button onClick={() => void logout().then(() => router.push('/login'))}>{t('auth.login')}</Button>
            ) : (
              <Button onClick={reconnectNow}>{t('common.retry')}</Button>
            )}
            <Button variant="secondary" onClick={() => router.push('/home')}>
              {t('common.home')}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return null;
}
