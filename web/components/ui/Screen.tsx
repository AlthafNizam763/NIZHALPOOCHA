'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { MonsoonBackdrop } from './Backdrop';
import { IconButton } from './Button';
import { useT } from '@/hooks/useT';

/**
 * Standard layout for every non-gameplay screen: animated monsoon backdrop, a
 * header with a round back button and a chunky title (gold kasavu underline),
 * and content that eases in. Back always goes to a known parent screen.
 */
export function Screen({
  title,
  subtitle,
  back,
  onBack,
  actions,
  footer,
  children,
  wide,
}: {
  title?: string;
  subtitle?: string;
  back?: string;
  onBack?: () => void;
  actions?: ReactNode;
  /** Pinned bottom action bar (e.g. the screen's main button). Rendered outside the
   *  animated content: an animated transform would otherwise capture 'position: fixed'. */
  footer?: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const router = useRouter();
  const t = useT();
  return (
    <div className="relative min-h-dvh">
      <MonsoonBackdrop />
      <div className={`pt-safe pb-safe pl-safe pr-safe mx-auto w-full ${wide ? 'max-w-5xl' : 'max-w-xl'} px-4 pb-8`}>
        {(title || back || onBack) && (
          <header className="mb-5 mt-2 flex min-h-14 items-center gap-3">
            {(back || onBack) && (
              <IconButton label={t('common.back')} onClick={() => (onBack ? onBack() : router.push(back!))}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </IconButton>
            )}
            {title && (
              <div className="min-w-0 flex-1">
                <h1 className="headline truncate text-3xl leading-tight text-paper">{title}</h1>
                <div className="mt-1 flex items-center gap-2">
                  <span aria-hidden className="block h-[3px] w-10 rounded-full bg-lamp" />
                  <span aria-hidden className="block h-[3px] w-3 rounded-full bg-gold-deep" />
                  {subtitle && <span className="truncate text-xs text-rain">{subtitle}</span>}
                </div>
              </div>
            )}
            {actions}
          </header>
        )}
        <div className={`animate-screen-in ${footer ? 'pb-24' : ''}`}>{children}</div>
      </div>
      {footer && (
        <div className="fixed inset-x-0 bottom-0 z-30 bg-gradient-to-t from-ink via-ink/90 to-transparent px-4 pt-8 pb-safe">
          <div className={`mx-auto w-full ${wide ? 'max-w-5xl' : 'max-w-xl'} pb-3`}>{footer}</div>
        </div>
      )}
    </div>
  );
}
