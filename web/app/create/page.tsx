'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DEFAULT_SETTINGS, type ErrorCode, type RoomSettings } from '@nizhal/shared';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth, useRoomRedirect } from '@/hooks/useRoute';
import { rooms, errorKey } from '@/services/net';
import { Screen } from '@/components/ui/Screen';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Controls';
import { ErrorState } from '@/components/ui/Feedback';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SettingsForm } from '@/components/lobby/SettingsForm';

export default function CreateRoomPage() {
  const ready = useRequireAuth();
  useRoomRedirect('menu');
  const t = useT();
  const router = useRouter();
  const profile = useAuth((s) => s.profile);
  const [settings, setSettings] = useState<RoomSettings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorCode | 'TIMEOUT' | null>(null);

  async function create() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    const r = await rooms.create({ name: profile.username, appearance: profile.appearance, settings });
    setBusy(false);
    if (r.ok) router.push('/lobby');
    else setError(r.error);
  }

  if (!ready) return <LoadingScreen messageKey="loading.session" />;
  return (
    <Screen title={t('create.title')} back="/home">
      {error ? (
        <ErrorState messageKey={errorKey(error)} onRetry={() => void create()} />
      ) : (
        <div className="space-y-4">
          <Panel className="px-4 py-2">
            <div className="flex min-h-11 items-center justify-between border-b border-line text-sm">
              <span className="text-mist">{t('settings.room.map')}</span>
              <span>{t('map.kadalimukku_night')}</span>
            </div>
            <SettingsForm value={settings} onChange={(p) => setSettings({ ...settings, ...p })} playerCount={settings.maxPlayers} />
          </Panel>
          <Button full size="lg" loading={busy} onClick={() => void create()}>
            {t('create.submit')}
          </Button>
        </div>
      )}
    </Screen>
  );
}
