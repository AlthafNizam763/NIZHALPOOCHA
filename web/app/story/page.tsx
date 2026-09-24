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
      className="group flex items-center gap-4 rounded-2xl border border-line bg-panel/95 p-4 text-left transition-colors hover:border-lamp/70"
    >
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-night">{art}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-xl group-hover:text-lamp">{title}</span>
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${done ? 'bg-leaf/15 text-leaf' : 'bg-lamp/15 text-lamp'}`}>
            {done ? `✓ ${t('story.completed')}` : t('story.new')}
          </span>
        </div>
        <p className="text-sm text-mist">{hint}</p>
      </div>
      <span className="text-2xl text-rain group-hover:text-lamp" aria-hidden>
        ▶
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

        <h2 className="mt-3 font-display text-lg uppercase tracking-widest text-lamp">{t('story.lore')}</h2>
        <div className="flex items-end justify-center gap-1 rounded-2xl border border-line bg-panel/80 px-3 pt-3">
          {CAST_IDS.map((id) => (
            <div key={id} className="flex flex-col items-center">
              <CharacterAvatar appearance={CAST[id].appearance} size={64} />
              <span className="pb-2 text-[11px] text-mist">{t(CAST[id].nameKey)}</span>
            </div>
          ))}
        </div>
        {LORE.map((entry) => (
          <article key={entry.title} className="rounded-2xl border border-line bg-panel/95 p-4">
            <h3 className="font-display text-lg">{t(entry.title)}</h3>
            <p className="text-sm leading-relaxed text-mist">{t(entry.body)}</p>
          </article>
        ))}
      </div>
    </Screen>
  );
}
