'use client';
import { useSettings } from '@/state/settingsStore';
import { useT } from '@/hooks/useT';
import { narrator, useHasVoice } from '@/services/narrator';
import type { Lang } from '@/utils/i18n';

export const NARRATION_LANGS: { value: Lang; label: string }[] = [
  { value: 'ml', label: 'മലയാളം' },
  { value: 'en', label: 'English' },
];

/** Shown when the chosen narration language has no voice on this device. */
export function NoVoiceHint({ className = '' }: { className?: string }) {
  const t = useT();
  const on = useSettings((s) => s.narration);
  const lang = useSettings((s) => s.narrationLanguage);
  const hasVoice = useHasVoice(lang);
  if (!on || hasVoice || !narrator.supported()) return null;
  return <p className={`max-w-xs text-xs text-rain ${className}`}>{t('narration.noVoice', { lang: NARRATION_LANGS.find((l) => l.value === lang)!.label })}</p>;
}

/** Narration on/off plus its language (Malayalam / English), saved in settings. */
export function NarrationControls({ hint = true, className = '' }: { hint?: boolean; className?: string }) {
  const t = useT();
  const on = useSettings((s) => s.narration);
  const lang = useSettings((s) => s.narrationLanguage);
  const set = useSettings((s) => s.set);
  if (!narrator.supported()) return null;
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={on}
          onClick={() => {
            set({ narration: !on });
            if (on) narrator.stop();
          }}
          className={`flex h-10 items-center gap-2 rounded-full border px-3 text-sm backdrop-blur-sm ${on ? 'border-lamp/70 bg-lamp/15 text-lamp' : 'border-white/20 bg-black/40 text-mist'}`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />
            {!on && <path d="M4 4l16 16" />}
          </svg>
          {t('intro.narration')}
        </button>
        <div role="radiogroup" aria-label={t('narration.language')} className={`flex h-10 rounded-full border border-white/20 bg-black/40 p-0.5 backdrop-blur-sm ${on ? '' : 'opacity-50'}`}>
          {NARRATION_LANGS.map((l) => (
            <button
              key={l.value}
              type="button"
              role="radio"
              aria-checked={lang === l.value}
              onClick={() => {
                set({ narrationLanguage: l.value });
                narrator.stop();
              }}
              className={`rounded-full px-3 text-sm ${lang === l.value ? 'bg-lamp font-semibold text-ink' : 'text-mist hover:text-paper'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      {hint && <NoVoiceHint />}
    </div>
  );
}
