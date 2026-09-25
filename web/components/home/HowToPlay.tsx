'use client';
import type { ReactNode } from 'react';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/utils/i18n';
import { CAST } from '@/game/cast';
import { Badge, Modal } from '@/components/ui/Controls';
import { CatForm } from '@/components/ui/CatForm';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { IconGear, IconTrophy } from './icons';

/** Generic illustrations only (story townsfolk) — never tied to a real player's role. */
const STEPS: { title: I18nKey; body: I18nKey; art: () => ReactNode }[] = [
  {
    title: 'howto.humansTitle',
    body: 'howto.humans',
    art: () => (
      <div className="flex items-end gap-1">
        <CharacterAvatar appearance={CAST.joseph.appearance} size={64} mood="happy" />
        <IconGear className="mb-3 h-7 w-7 text-lamp" />
      </div>
    ),
  },
  {
    title: 'howto.catsTitle',
    body: 'howto.cats',
    art: () => (
      <div className="relative flex items-end">
        <CatForm size={62} className="-mr-5 mb-1 opacity-90" />
        <CharacterAvatar appearance={CAST.rahul.appearance} size={64} mood="sly" className="relative" />
      </div>
    ),
  },
  {
    title: 'howto.meetingsTitle',
    body: 'howto.meetings',
    art: () => (
      <div className="flex items-end gap-1">
        <CharacterAvatar appearance={CAST.fathima.appearance} size={60} mood="suspicious" />
        <span className="mb-8 flex h-7 min-w-7 items-center justify-center rounded-full border-b-2 border-canal-deep bg-canal px-1.5 font-display text-sm font-extrabold text-paper" aria-hidden>
          ?
        </span>
        <CharacterAvatar appearance={CAST.ammu.appearance} size={60} mood="scared" />
      </div>
    ),
  },
  {
    title: 'howto.winTitle',
    body: 'howto.win',
    art: () => (
      <div className="flex items-end gap-1">
        <CharacterAvatar appearance={CAST.meera.appearance} size={64} mood="happy" />
        <IconTrophy className="mb-3 h-8 w-8 text-lamp" />
      </div>
    ),
  },
];

export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t('home.howToPlay')} wide>
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="hidden shrink-0 sm:block">
            <CatForm size={96} />
          </div>
          <p className="leading-snug text-mist">{t('howto.intro')}</p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="surface flex flex-col overflow-hidden rounded-[var(--radius-card)]">
              <div aria-hidden className="relative flex min-h-24 items-end justify-center border-b-[1.5px] border-line bg-ink/70 pt-2">
                <span className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_50%_100%,color-mix(in_srgb,var(--color-lamp)_22%,transparent),transparent_70%)]" />
                <div className="relative">{s.art()}</div>
              </div>
              <div className="flex gap-3 p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-b-[3px] border-gold-deep bg-lamp font-display text-base font-extrabold text-ink">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-display text-base font-bold leading-tight text-paper">{t(s.title)}</div>
                  <div className="mt-0.5 text-sm leading-snug text-mist">{t(s.body)}</div>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <div className="rounded-2xl border-2 border-line bg-ink/70 p-3 text-xs leading-snug text-rain">
          <div className="mb-1.5">
            <Badge tone="info">{t('howto.controls')}</Badge>
          </div>
          <p>{t('set.keys')}</p>
          <p className="mt-1">{t('howto.touch')}</p>
        </div>
      </div>
    </Modal>
  );
}
