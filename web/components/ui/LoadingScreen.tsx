'use client';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/utils/i18n';
import { MonsoonBackdrop, Logo } from './Backdrop';
import { Spinner } from './Controls';

/** Full-screen loading state (session restore, profile, connecting, room). */
export function LoadingScreen({ messageKey = 'common.loading' }: { messageKey?: I18nKey }) {
  const t = useT();
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-8 p-6 pt-safe pb-safe" aria-busy="true">
      <MonsoonBackdrop />
      <div className="animate-screen-in">
        <Logo />
      </div>
      <div className="surface flex items-center gap-3 rounded-full px-5 py-2.5 text-sm font-semibold text-mist" role="status">
        <Spinner className="h-7 w-9" />
        {t(messageKey)}
      </div>
    </main>
  );
}
