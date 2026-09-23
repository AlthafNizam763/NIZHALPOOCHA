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
        <Panel className="p-5">
          <form onSubmit={(e) => void join(e)} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm text-mist">{t('join.code')}</span>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                placeholder={t('join.placeholder')}
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                autoFocus
                className="h-16 w-full rounded-xl border border-line bg-night text-center font-display text-4xl tracking-[0.35em] text-paper outline-none placeholder:text-line focus:border-moss"
              />
            </label>
            <Button type="submit" full size="lg" loading={busy} disabled={code.length !== 6}>
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
