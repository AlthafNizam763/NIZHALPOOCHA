'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MonsoonBackdrop } from './Backdrop';
import { useT } from '@/hooks/useT';

/** Standard layout for non-gameplay screens (portrait and landscape friendly). */
export function Screen({
  title,
  back,
  onBack,
  actions,
  children,
  wide,
}: {
  title?: string;
  back?: string;
  onBack?: () => void;
  actions?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const router = useRouter();
  const t = useT();
  return (
    <div className="relative min-h-dvh">
      <MonsoonBackdrop />
      <div className={`pt-safe pb-safe pl-safe pr-safe mx-auto w-full ${wide ? 'max-w-5xl' : 'max-w-xl'} px-4`}>
        {(title || back || onBack) && (
          <header className="mb-4 flex min-h-12 items-center gap-2">
            {(back || onBack) && (
              <button
                onClick={() => (onBack ? onBack() : router.push(back!))}
                className="-ml-2 flex h-11 items-center gap-1 rounded-lg px-2 text-mist hover:bg-panel-2 hover:text-paper"
              >
                <span className="text-xl">‹</span>
                <span className="text-sm">{t('common.back')}</span>
              </button>
            )}
            {title && <h1 className="font-display flex-1 truncate text-2xl">{title}</h1>}
            {actions}
          </header>
        )}
        {children}
      </div>
    </div>
  );
}
