'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useUi } from '@/state/uiStore';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/utils/i18n';
import { Button } from './Button';
import { CatForm } from './CatForm';

const TONES = {
  info: { bar: 'bg-canal', icon: 'i', iconBg: 'bg-canal text-paper' },
  good: { bar: 'bg-moss', icon: '✓', iconBg: 'bg-moss text-paper' },
  warn: { bar: 'bg-lamp', icon: '!', iconBg: 'bg-lamp text-ink' },
  danger: { bar: 'bg-laterite', icon: '!', iconBg: 'bg-laterite text-paper' },
};

/** Notifications: compact cards with a tone bar and icon, tap to dismiss. */
export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  const t = useT();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 pt-safe px-3" aria-live="polite">
      {toasts.map((x) => {
        const tone = TONES[x.tone];
        return (
          <button
            key={x.id}
            onClick={() => dismiss(x.id)}
            className="surface animate-screen-in pointer-events-auto relative flex max-w-md items-center gap-3 overflow-hidden rounded-2xl py-2.5 pl-4 pr-4 text-left text-sm font-semibold text-paper"
          >
            <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${tone.bar}`} />
            <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${tone.iconBg}`}>
              {tone.icon}
            </span>
            {t(x.key, x.vars)}
          </button>
        );
      })}
    </div>
  );
}

/** Full error state with retry and go-home (room full, not found, server error…). */
export function ErrorState({ messageKey, vars, onRetry, title }: { messageKey: I18nKey; vars?: Record<string, string | number>; onRetry?: () => void; title?: I18nKey }) {
  const t = useT();
  const router = useRouter();
  return (
    <div className="surface kasavu animate-screen-in mx-auto max-w-md rounded-[var(--radius-card)] p-6 pt-7 text-center">
      <div className="mx-auto mb-2 w-fit opacity-90">
        <CatForm size={84} />
      </div>
      <div className="headline mb-2 text-2xl text-paper">{t(title ?? 'err.title')}</div>
      <p className="mb-5 text-mist">{t(messageKey, vars)}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {onRetry && <Button onClick={onRetry}>{t('common.retry')}</Button>}
        <Button variant="secondary" onClick={() => router.push('/home')}>
          {t('common.home')}
        </Button>
      </div>
    </div>
  );
}

/** Friendly empty state: an illustration, one line of context and the next step. */
export function EmptyState({ title, hint, art, action }: { title: string; hint?: string; art?: ReactNode; action?: ReactNode }) {
  return (
    <div className="surface animate-screen-in flex flex-col items-center gap-2 rounded-[var(--radius-card)] px-6 py-8 text-center">
      {art && <div className="mb-1">{art}</div>}
      <div className="font-display text-xl font-bold text-paper">{title}</div>
      {hint && <p className="max-w-sm text-sm text-rain">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Inline message inside a form or panel (errors, confirmations, dev notes). */
export function Notice({ tone = 'info', children, className = '' }: { tone?: keyof typeof TONES; children: ReactNode; className?: string }) {
  const s = TONES[tone];
  const text = { info: 'text-mist', good: 'text-leaf', warn: 'text-lamp', danger: 'text-[#f08a6e]' }[tone];
  return (
    <p role={tone === 'danger' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-xl bg-ink/60 px-3 py-2 text-sm ${text} ${className}`}>
      <span aria-hidden className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${s.iconBg}`}>
        {s.icon}
      </span>
      <span className="min-w-0">{children}</span>
    </p>
  );
}
