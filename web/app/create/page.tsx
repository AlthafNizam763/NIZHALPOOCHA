'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_SETTINGS, applySettingsPatch, catLimitsFor, type ErrorCode, type RoomSettings } from '@nizhal/shared';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth, useRoomRedirect } from '@/hooks/useRoute';
import { rooms, errorKey } from '@/services/net';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/Feedback';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { RoomSetupForm } from '@/components/lobby/SettingsForm';

/** Applies a patch locally the same way the server does, keeping the cat count legal for the table size. */
function patchSettings(current: RoomSettings, patch: Partial<RoomSettings>): RoomSettings {
  const next = applySettingsPatch(current, patch) ?? current;
  const l = catLimitsFor(next.mode, next.maxPlayers);
  return { ...next, catCount: Math.min(l.max, Math.max(l.min, next.catCount)) };
}

function CreateRoom() {
  const ready = useRequireAuth();
  useRoomRedirect('menu');
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const profile = useAuth((s) => s.profile);
  const [settings, setSettings] = useState<RoomSettings>(() => ({ ...DEFAULT_SETTINGS, isPublic: params.get('public') === '1' }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorCode | 'TIMEOUT' | null>(null);

  // The settings chosen here are the room's match configuration; the lobby only shows them.
  async function create() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    const r = await rooms.create({ name: profile.username, appearance: profile.appearance, settings });
    setBusy(false);
    if (r.ok) router.replace('/lobby');
    else setError(r.error);
  }

  if (!ready) return <LoadingScreen messageKey="loading.session" />;
  return (
    <Screen
      title={t('create.title')}
      back="/home"
      footer={
        !error && (
          <Button variant="gold" full size="lg" loading={busy} onClick={() => void create()}>
            {settings.isPublic ? t('create.submitPublic') : t('create.submit')}
          </Button>
        )
      }
    >
      {error ? (
        <ErrorState messageKey={errorKey(error)} onRetry={() => void create()} />
      ) : (
        <RoomSetupForm value={settings} onChange={(p) => setSettings(patchSettings(settings, p))} />
      )}
    </Screen>
  );
}

export default function CreateRoomPage() {
  return (
    <Suspense>
      <CreateRoom />
    </Suspense>
  );
}
