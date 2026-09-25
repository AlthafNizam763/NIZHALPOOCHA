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
import { ChoiceCard, Panel, SectionTitle } from '@/components/ui/Controls';
import { ErrorState } from '@/components/ui/Feedback';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { SettingsForm } from '@/components/lobby/SettingsForm';

const IconLock = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 text-lamp" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
    <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    <circle cx="12" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
  </svg>
);

const IconGlobe = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 text-leaf" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.4 2.3 3.6 5.1 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.1-3.6-8.5S9.6 5.8 12 3.5z" />
  </svg>
);

function VisibilityChoice({ isPublic, onChange }: { isPublic: boolean; onChange: (v: boolean) => void }) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t('create.visibility')} className="grid gap-2 sm:grid-cols-2">
      <ChoiceCard selected={!isPublic} onClick={() => onChange(false)} title={t('create.private')} description={t('create.privateHint')} icon={<IconLock />} />
      <ChoiceCard selected={isPublic} onClick={() => onChange(true)} title={t('create.public')} description={t('create.publicHint')} icon={<IconGlobe />} />
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
          <section>
            <SectionTitle>{t('create.visibility')}</SectionTitle>
            <VisibilityChoice isPublic={settings.isPublic} onChange={(isPublic) => setSettings({ ...settings, isPublic })} />
          </section>
          <Panel className="px-4 pb-2 pt-4">
            <SectionTitle>{t('lobby.settings')}</SectionTitle>
            <SettingsForm value={settings} onChange={(p) => setSettings(applySettingsPatch(settings, p) ?? settings)} playerCount={settings.maxPlayers} />
          </Panel>
          <div className="sticky bottom-0 bg-gradient-to-t from-ink via-ink/85 to-transparent pb-safe pt-6">
            <Button variant="gold" full size="lg" loading={busy} onClick={() => void create()}>
              {settings.isPublic ? t('create.submitPublic') : t('create.submit')}
            </Button>
          </div>
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
