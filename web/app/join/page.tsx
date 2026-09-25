'use client';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ErrorCode } from '@nizhal/shared';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth, useRoomRedirect } from '@/hooks/useRoute';
import { rooms, errorKey } from '@/services/net';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Controls';
import { ErrorState } from '@/components/ui/Feedback';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { IconKey } from '@/components/home/icons';

const CODE_LENGTH = 6;

function JoinForm() {
  const ready = useRequireAuth();
  useRoomRedirect('menu');
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const profile = useAuth((s) => s.profile);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorCode | 'TIMEOUT' | null>(null);

  useEffect(() => {
    const c = params.get('code');
    if (c) setCode(c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
  }, [params]);

  async function join(e?: FormEvent) {
    e?.preventDefault();
    if (!profile || code.length !== 6) return;
    setBusy(true);
    setError(null);
    const r = await rooms.join({ code, name: profile.username, appearance: profile.appearance });
    setBusy(false);
    if (r.ok) router.push('/lobby');
    else setError(r.error);
  }

  if (!ready) return <LoadingScreen messageKey="loading.session" />;
  return (
    <Screen title={t('join.title')} back="/home">
      {error ? (
        <ErrorState
          title={error === 'ROOM_FULL' || error === 'ROOM_NOT_FOUND' ? undefined : 'err.title'}
          messageKey={errorKey(error)}
          onRetry={() => setError(null)}
        />
      ) : (
        <Panel kasavu className="p-5 pt-7 sm:p-7">
          <div aria-hidden className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border-2 border-lamp/50 bg-ink shadow-[0_0_24px_-6px_var(--color-lamp)]">
            <IconKey className="h-9 w-9" />
          </div>
          <p className="mx-auto mb-5 max-w-xs text-center text-sm leading-snug text-mist">{t('home.privateHint')}</p>
          <form onSubmit={(e) => void join(e)} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-center font-display text-xs font-bold uppercase leading-tight tracking-wider text-rain">{t('join.code')}</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder={t('join.placeholder')}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                autoFocus
                className="min-h-20 w-full rounded-2xl border-2 border-line bg-ink py-2 pl-[0.4em] text-center font-display text-4xl font-extrabold uppercase keep-tracking tracking-[0.4em] text-lamp outline-none transition-colors placeholder:text-line-strong focus:border-lamp sm:text-5xl"
              />
              <span aria-hidden className="mt-3 flex justify-center gap-2">
                {Array.from({ length: CODE_LENGTH }, (_, i) => (
                  <span key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i < code.length ? 'bg-lamp' : 'bg-line'}`} />
                ))}
              </span>
            </label>
            <Button variant="gold" type="submit" full size="lg" loading={busy} disabled={code.length !== 6}>
              {t('join.submit')}
            </Button>
          </form>
        </Panel>
      )}
    </Screen>
  );
}

export default function JoinRoomPage() {
  return (
    <Suspense>
      <JoinForm />
    </Suspense>
  );
}
