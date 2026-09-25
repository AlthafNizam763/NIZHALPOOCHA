'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Appearance } from '@nizhal/shared';
import { useAuth } from '@/state/authStore';
import { useUi } from '@/state/uiStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth } from '@/hooks/useRoute';
import { saveProfile } from '@/services/profile';
import { MonsoonBackdrop } from '@/components/ui/Backdrop';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { Badge } from '@/components/ui/Controls';
import { CustomizePanel } from '@/components/lobby/CustomizePanel';

/** Character setup: the last step of the first-run flow, before Home. */
export default function SetupPage() {
  const ready = useRequireAuth();
  const t = useT();
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const profile = useAuth((s) => s.profile);
  const setProfile = useAuth((s) => s.setProfile);
  const toast = useUi((s) => s.toast);
  const [saving, setSaving] = useState(false);

  if (!ready || !user || !profile) return <LoadingScreen messageKey="loading.profile" />;

  async function done(name: string, appearance: Appearance) {
    setSaving(true);
    try {
      await saveProfile(user!, { username: name, appearance });
      setProfile({ ...useAuth.getState().profile!, username: name, appearance });
      router.replace('/home');
    } catch {
      toast('err.SERVER_ERROR', undefined, 'danger');
      setSaving(false);
    }
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center p-4 pt-safe pb-safe">
      <MonsoonBackdrop />
      <div className="surface kasavu animate-screen-in w-full max-w-3xl rounded-[var(--radius-card)] p-4 pt-6 sm:p-6 sm:pt-7">
        <div className="mb-5 flex flex-col gap-1">
          <div>
            <Badge tone="gold">{t('app.town')}</Badge>
          </div>
          <h1 className="headline text-3xl leading-tight text-paper max-[380px]:text-2xl">{t('setup.title')}</h1>
          <div aria-hidden className="flex gap-1.5">
            <span className="h-[3px] w-10 rounded-full bg-lamp" />
            <span className="h-[3px] w-3 rounded-full bg-gold-deep" />
          </div>
          <p className="mt-1 text-sm leading-snug text-mist">{t('setup.hint')}</p>
        </div>
        <CustomizePanel initialName={profile.username} initial={profile.appearance} onSave={(n, a) => void done(n, a)} saving={saving} saveLabel="setup.done" />
      </div>
    </main>
  );
}
