'use client';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/utils/i18n';
import { MonsoonBackdrop, Logo } from './Backdrop';
import { Spinner } from './Controls';

/** Full-screen loading state (session restore, profile, connecting, room). */
export function LoadingScreen({ messageKey = 'common.loading' }: { messageKey?: I18nKey }) {
  const t = useT();
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 p-6 pt-safe pb-safe" aria-busy="true">
      <MonsoonBackdrop />
      <Logo small />
      <div className="flex items-center gap-3 text-sm text-mist" role="status">
        <Spinner className="h-5 w-5" />
        {t(messageKey)}
      </div>
    </main>
  );
}
