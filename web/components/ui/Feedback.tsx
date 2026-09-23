'use client';
import { useRouter } from 'next/navigation';
import { useUi } from '@/state/uiStore';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/utils/i18n';
import { Button } from './Button';

const TONES = {
  info: 'border-line bg-panel-2',
  good: 'border-moss bg-moss-deep/90',
  warn: 'border-lamp/60 bg-panel-2',
  danger: 'border-laterite bg-laterite/90',
};

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  const dismiss = useUi((s) => s.dismiss);
  const t = useT();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] flex flex-col items-center gap-2 pt-safe px-3">
      {toasts.map((x) => (
        <button
          key={x.id}
          onClick={() => dismiss(x.id)}
          className={`animate-rise pointer-events-auto max-w-md rounded-xl border px-4 py-2.5 text-sm text-paper shadow-lg ${TONES[x.tone]}`}
        >
          {t(x.key, x.vars)}
        </button>
      ))}
    </div>
  );
}

/** Full error state with retry and go-home (room full, not found, server error…). */
export function ErrorState({ messageKey, vars, onRetry, title }: { messageKey: I18nKey; vars?: Record<string, string | number>; onRetry?: () => void; title?: I18nKey }) {
  const t = useT();
  const router = useRouter();
  return (
    <div className="animate-rise mx-auto max-w-md rounded-2xl border border-line bg-panel p-6 text-center">
      <div className="font-display mb-2 text-2xl">{t(title ?? 'err.title')}</div>
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
