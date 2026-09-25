'use client';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/state/authStore';
import { useT } from '@/hooks/useT';
import { useRequireAuth } from '@/hooks/useRoute';
import { audio } from '@/services/audio';
import type { I18nKey } from '@/utils/i18n';
import { CAST, CAST_IDS } from '@/game/cast';
import { Screen } from '@/components/ui/Screen';
import { Badge } from '@/components/ui/Controls';
import { CatForm } from '@/components/ui/CatForm';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';

const LORE: { title: I18nKey; body: I18nKey }[] = [
  { title: 'story.lore.town', body: 'story.lore.town.body' },
  { title: 'story.lore.incidents', body: 'story.lore.incidents.body' },
  { title: 'story.lore.legend', body: 'story.lore.legend.body' },
  { title: 'story.lore.why', body: 'story.lore.why.body' },
];

function ReplayCard({ title, hint, done, onClick, art }: { title: string; hint: string; done: boolean; onClick: () => void; art: ReactNode }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={() => {
        audio.play('click');
        onClick();
      }}
      className="tactile surface group flex items-center gap-4 rounded-[var(--radius-card)] border-b-ink p-3 text-left hover:border-lamp/60 sm:p-4"
    >
      <div className="relative flex h-20 w-20 shrink-0 items-end justify-center overflow-hidden rounded-2xl border-2 border-line bg-ink">
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(ellipse_at_50%_100%,color-mix(in_srgb,var(--color-lamp)_26%,transparent),transparent_70%)]" />
        <span className="relative">{art}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-display text-xl font-bold leading-tight text-paper group-hover:text-lamp">{title}</span>
          <Badge tone={done ? 'good' : 'gold'}>{done ? `✓ ${t('story.completed')}` : t('story.new')}</Badge>
        </div>
        <p className="mt-0.5 text-sm leading-snug text-mist">{hint}</p>
      </div>
      <span
        aria-hidden
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-gold-deep bg-lamp text-ink transition-transform group-hover:scale-105"
      >
        <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4" fill="currentColor">
          <path d="M7 4.5v15l12-7.5z" />
        </svg>
      </span>
    </button>
  );
}

/** Home → Story: replay the intro or tutorial, and read the lore. */
export default function StoryPage() {
  const ready = useRequireAuth();
  const t = useT();
  const router = useRouter();
  const onboarding = useAuth((s) => s.profile?.onboarding);
  if (!ready) return null;

  return (
    <Screen title={t('story.title')} back="/home">
      <div className="grid gap-3 pb-6">
        <ReplayCard
          title={t('story.intro')}
          hint={t('story.introHint')}
          done={!!onboarding?.hasSeenIntro}
          onClick={() => router.push('/intro')}
          art={<CatForm size={76} />}
        />
        <ReplayCard
          title={t('story.tutorial')}
          hint={t('story.tutorialHint')}
          done={!!onboarding?.hasCompletedTutorial}
          onClick={() => router.push('/tutorial')}
          art={<CharacterAvatar appearance={CAST.meera.appearance} size={72} />}
        />

        <div className="mt-4 flex items-center gap-3">
          <h2 className="headline text-xl uppercase leading-tight tracking-wider text-lamp">{t('story.lore')}</h2>
          <span aria-hidden className="h-[2px] flex-1 rounded-full bg-line" />
        </div>
        <div className="surface kasavu relative flex flex-wrap items-end justify-center gap-x-2 overflow-hidden rounded-[var(--radius-card)] px-3 pt-5">
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(ellipse_at_50%_100%,color-mix(in_srgb,var(--color-lamp)_18%,transparent),transparent_70%)]" />
          {CAST_IDS.map((id) => (
            <div key={id} className="relative flex flex-col items-center">
              <CharacterAvatar appearance={CAST[id].appearance} size={64} blink />
              <span className="pb-2 pt-0.5 text-center font-display text-xs font-bold leading-tight text-mist">{t(CAST[id].nameKey)}</span>
            </div>
          ))}
        </div>
        {LORE.map((entry) => (
          <article key={entry.title} className="surface rounded-[var(--radius-card)] p-4">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold leading-tight text-paper">
              <span aria-hidden className="h-2 w-2 shrink-0 rotate-45 rounded-[2px] bg-lamp" />
              {t(entry.title)}
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-mist">{t(entry.body)}</p>
          </article>
        ))}
      </div>
    </Screen>
  );
}
