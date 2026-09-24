'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { useT } from '@/hooks/useT';
import { narrator } from '@/services/narrator';
import type { I18nKey } from '@/utils/i18n';
import { CAST, CAST_IDS } from '@/game/cast';
import { MonsoonBackdrop } from '@/components/ui/Backdrop';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { CatForm } from '@/components/ui/CatForm';
import { Button } from '@/components/ui/Button';

const SLIDE_MS = 3200;

function OutageIcons() {
  const icon = 'h-12 w-12 text-mist';
  const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
        <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.8.8 1 1.5 1 2.5h6c0-1 .2-1.7 1-2.5A6 6 0 0 0 12 3zM4 4l16 16" />
      </svg>
      <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
        <path d="M3 7h13l4-2v8l-4-2H3zM7 11v8M4 19h6M4 4l16 16" />
      </svg>
      <svg viewBox="0 0 24 24" className={icon} {...stroke} aria-hidden>
        <path d="M4 10h10v4H4zM14 12h3v6M12 21c0-2 2-3 2-5M17 20v1M4 4l16 16" />
      </svg>
    </div>
  );
}

const SLIDES: { key: I18nKey; art: () => ReactNode }[] = [
  {
    key: 'recap.1',
    art: () => (
      <div className="flex items-end gap-1">
        {CAST_IDS.slice(0, 3).map((id) => (
          <CharacterAvatar key={id} appearance={CAST[id].appearance} size={90} animate />
        ))}
      </div>
    ),
  },
  { key: 'recap.2', art: () => <OutageIcons /> },
  {
    key: 'recap.3',
    art: () => (
      <div className="flex flex-col items-center">
        <CatForm size={64} className="-mb-2 opacity-90" />
        <div className="flex items-end gap-2">
          {CAST_IDS.map((id) => (
            <CharacterAvatar key={id} appearance={CAST[id].appearance} size={78} />
          ))}
        </div>
      </div>
    ),
  },
  {
    key: 'recap.4',
    art: () => (
      <div className="flex flex-wrap justify-center gap-2">
        {(['intro.obj.tasks', 'intro.obj.investigate', 'intro.obj.report', 'intro.obj.vote'] as const).map((k, i) => (
          <RecapChip key={k} n={i + 1} labelKey={k} />
        ))}
      </div>
    ),
  },
];

function RecapChip({ n, labelKey }: { n: number; labelKey: I18nKey }) {
  const t = useT();
  return (
    <span className="flex items-center gap-2 rounded-full border border-lamp/60 bg-black/50 px-3 py-1.5 font-display text-lg text-lamp">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-lamp text-sm text-ink">{n}</span>
      {t(labelKey)}
    </span>
  );
}

/** ~13 s recap shown when a first-time player skips the intro. */
export function IntroRecap({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [i, setI] = useState(0);

  useEffect(() => {
    narrator.say(t(SLIDES[i]!.key));
    const id = setTimeout(() => (i < SLIDES.length - 1 ? setI(i + 1) : onDone()), SLIDE_MS + (i === SLIDES.length - 1 ? 800 : 0));
    return () => clearTimeout(id);
  }, [i, onDone, t]);

  useEffect(() => () => narrator.stop(), []);

  const slide = SLIDES[i]!;
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-6 p-6 pt-safe pb-safe text-center">
      <MonsoonBackdrop />
      <h1 className="font-display text-sm uppercase tracking-[0.3em] text-lamp">{t('recap.title')}</h1>
      <div key={i} className="animate-rise flex min-h-40 flex-col items-center justify-end gap-5 [@media(max-height:480px)]:min-h-0">
        <div className="[@media(max-height:480px)]:hidden">{slide.art()}</div>
        <p className="max-w-xl font-display text-2xl leading-snug text-paper sm:text-3xl" aria-live="polite">
          {t(slide.key)}
        </p>
      </div>
      <div className="flex gap-2" aria-hidden>
        {SLIDES.map((s, k) => (
          <span key={s.key} className="h-1.5 w-10 overflow-hidden rounded-full bg-white/15">
            <span
              className={`block h-full bg-lamp ${k < i ? 'w-full' : k === i ? 'recap-fill' : 'w-0'}`}
              style={k === i ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
            />
          </span>
        ))}
      </div>
      <Button variant="lamp" size="lg" onClick={onDone}>
        {t('recap.continue')}
      </Button>
    </main>
  );
}
