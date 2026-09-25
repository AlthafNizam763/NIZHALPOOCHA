'use client';
import { useSettings } from '@/state/settingsStore';
import { useT } from '@/hooks/useT';
import { narrator, useNarration, useNarrationSource } from '@/services/narrator';
import type { Lang } from '@/utils/i18n';
import { Segmented } from '@/components/ui/Controls';

export const NARRATION_LANGS: { value: Lang; label: string }[] = [
  { value: 'ml', label: 'മലയാളം' },
  { value: 'en', label: 'English' },
];

const langLabel = (lang: Lang) => NARRATION_LANGS.find((l) => l.value === lang)!.label;

/** Switches the narration language and re-speaks the current line in it at once. */
export function setNarrationLanguage(lang: Lang): void {
  useSettings.getState().set({ narrationLanguage: lang });
  narrator.replay();
}

/** Shown when this device has neither recorded clips nor a voice for the narration language. */
export function NoVoiceHint({ className = '' }: { className?: string }) {
  const t = useT();
  const on = useSettings((s) => s.narration);
  const lang = useSettings((s) => s.narrationLanguage);
  const source = useNarrationSource(lang);
  if (!on || source !== 'none') return null;
  return <p className={`max-w-xs text-xs leading-snug text-rain ${className}`}>{t('narration.noVoice', { lang: langLabel(lang) })}</p>;
}

/** Live narration problems, so it never fails silently: blocked by the browser, or unable to play. */
export function NarrationStatus({ className = '' }: { className?: string }) {
  const t = useT();
  const status = useNarration((s) => s.status);
  const lang = useSettings((s) => s.narrationLanguage);
  if (status === 'blocked') {
    return (
      <button
        type="button"
        onClick={() => narrator.replay()}
        className={`tactile animate-rise flex min-h-10 items-center gap-2 rounded-full border-2 border-gold-deep bg-lamp px-4 py-1 text-left font-display text-sm font-bold leading-tight text-ink ${className}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden>
          <path d="M4 9v6h4l5 4V5L8 9H4zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" />
        </svg>
        {t('narration.blocked')}
      </button>
    );
  }
  if (status === 'error' || status === 'unavailable') {
    return (
      <p role="status" className={`surface flex max-w-xs items-start gap-2 rounded-xl px-3 py-2 text-xs leading-snug text-mist ${className}`}>
        <span aria-hidden className="mt-px flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-canal text-[10px] font-black text-paper">
          i
        </span>
        <span className="min-w-0">{t(status === 'error' ? 'narration.error' : 'narration.noVoice', { lang: langLabel(lang) })}</span>
      </p>
    );
  }
  return null;
}

/** Narration on/off plus its language (Malayalam / English), saved in settings. */
export function NarrationControls({ hint = true, className = '' }: { hint?: boolean; className?: string }) {
  const t = useT();
  const on = useSettings((s) => s.narration);
  const lang = useSettings((s) => s.narrationLanguage);
  const set = useSettings((s) => s.set);
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={on}
          onClick={() => {
            set({ narration: !on });
            if (!on) narrator.replay();
          }}
          className={`tactile flex min-h-10 items-center gap-2 rounded-full border-2 px-3.5 py-1 font-display text-sm font-bold leading-tight ${
            on ? 'border-lamp/70 border-b-gold-deep bg-panel-2 text-lamp' : 'border-line border-b-ink bg-panel-2 text-rain hover:text-paper'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />
            {!on && <path d="M4 4l16 16" />}
          </svg>
          {t('intro.narration')}
          <span aria-hidden className={`h-2 w-2 rounded-full ${on ? 'bg-leaf shadow-[0_0_6px_var(--color-leaf)]' : 'bg-line-strong'}`} />
        </button>
        <div role="group" aria-label={t('narration.language')} className={`transition-opacity ${on ? '' : 'opacity-50'}`}>
          <Segmented value={lang} options={NARRATION_LANGS} onChange={setNarrationLanguage} />
        </div>
      </div>
      {hint && <NoVoiceHint />}
    </div>
  );
}
