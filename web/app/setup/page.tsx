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
      <div className="animate-rise w-full max-w-3xl rounded-2xl border border-line bg-panel/95 p-5 sm:p-6">
        <h1 className="font-display text-3xl">{t('setup.title')}</h1>
        <p className="mb-5 text-sm text-mist">{t('setup.hint')}</p>
        <CustomizePanel initialName={profile.username} initial={profile.appearance} onSave={(n, a) => void done(n, a)} saving={saving} saveLabel="setup.done" />
      </div>
    </main>
  );
}
