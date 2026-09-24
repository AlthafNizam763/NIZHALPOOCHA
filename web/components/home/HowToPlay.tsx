'use client';
import { useT } from '@/hooks/useT';
import type { I18nKey } from '@/utils/i18n';
import { Modal } from '@/components/ui/Controls';
import { CatForm } from '@/components/ui/CatForm';

const STEPS: { title: I18nKey; body: I18nKey }[] = [
  { title: 'howto.humansTitle', body: 'howto.humans' },
  { title: 'howto.catsTitle', body: 'howto.cats' },
  { title: 'howto.meetingsTitle', body: 'howto.meetings' },
  { title: 'howto.winTitle', body: 'howto.win' },
];

export function HowToPlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  return (
    <Modal open={open} onClose={onClose} title={t('home.howToPlay')} wide>
      <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
        <div className="hidden justify-center sm:flex">
          <CatForm size={120} />
        </div>
        <div className="space-y-4">
          <p className="text-mist">{t('howto.intro')}</p>
          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="font-display flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss text-paper">{i + 1}</span>
                <div>
                  <div className="font-semibold">{t(s.title)}</div>
                  <div className="text-sm text-mist">{t(s.body)}</div>
                </div>
              </li>
            ))}
          </ol>
          <div className="rounded-xl border border-line bg-night p-3 text-xs text-rain">
            <div className="mb-1 font-semibold text-mist">{t('howto.controls')}</div>
            <p>{t('set.keys')}</p>
            <p className="mt-1">{t('howto.touch')}</p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
