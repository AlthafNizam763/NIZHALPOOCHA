'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DEFAULT_SETTINGS, applySettingsPatch, type ErrorCode, type RoomSettings } from '@nizhal/shared';
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

function VisibilityChoice({ isPublic, onChange }: { isPublic: boolean; onChange: (v: boolean) => void }) {
  const t = useT();
  const option = (value: boolean, title: string, hint: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={isPublic === value}
      onClick={() => onChange(value)}
      className={`flex-1 rounded-xl border p-3 text-left transition-colors ${isPublic === value ? 'border-moss bg-moss/20' : 'border-line bg-night hover:bg-panel-2'}`}
    >
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-rain">{hint}</div>
    </button>
  );
  return (
    <div role="radiogroup" aria-label={t('create.visibility')} className="flex gap-2">
      {option(false, t('create.private'), t('create.privateHint'))}
      {option(true, t('create.public'), t('create.publicHint'))}
    </div>
  );
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
          <VisibilityChoice isPublic={settings.isPublic} onChange={(isPublic) => setSettings({ ...settings, isPublic })} />
          <Panel className="px-4 py-2">
            <SettingsForm value={settings} onChange={(p) => setSettings(applySettingsPatch(settings, p) ?? settings)} playerCount={settings.maxPlayers} />
          </Panel>
          <Button full size="lg" loading={busy} onClick={() => void create()}>
            {settings.isPublic ? t('create.submitPublic') : t('create.submit')}
          </Button>
        </div>
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
