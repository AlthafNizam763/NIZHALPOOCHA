'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/state/gameStore';
import { useT } from '@/hooks/useT';
import { audio } from '@/services/audio';
import type { I18nKey } from '@/utils/i18n';
import { Button } from '@/components/ui/Button';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { CatForm } from '@/components/ui/CatForm';

/** HUMANS WIN / CATS WIN screen with the Cats' true forms revealed. */
export function GameOver() {
  const t = useT();
  const router = useRouter();
  const end = useGame((s) => s.end);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!end) return;
    const id = setTimeout(() => {
      setRevealed(true);
      audio.play('reveal');
    }, 1400);
    return () => clearTimeout(id);
  }, [end]);

  if (!end) return null;
  const cats = end.players.filter((p) => p.role === 'CAT');
  const humansWon = end.winner === 'HUMANS';

  return (
    <div className="pointer-events-auto fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-y-auto bg-ink p-6 text-center pt-safe pb-safe">
      <div className={`animate-rise font-display text-6xl sm:text-7xl ${humansWon ? 'text-leaf' : 'text-lamp'}`}>{t(`end.${end.winner}`)}</div>
      <div className="mt-1 text-xl text-mist">{t(end.you.won ? 'end.victory' : 'end.defeat')}</div>
      <p className="mt-1 text-sm text-rain">{t(`end.reason.${end.reason}` as I18nKey)}</p>

      <div className="mt-6 text-sm uppercase tracking-widest text-rain">{t('end.revealTitle')}</div>
      <div className="mt-3 flex flex-wrap justify-center gap-6">
        {cats.map((c) => (
          <div key={c.id} className="flex flex-col items-center">
            <div className="relative h-32 w-32">
              <div className={`absolute inset-0 flex items-center justify-center ${revealed ? 'animate-human-fade' : ''}`}>
                <CharacterAvatar appearance={c.appearance} size={120} />
              </div>
              {revealed && (
                <div className="animate-cat-emerge absolute inset-0 flex items-center justify-center">
                  <CatForm size={128} />
                </div>
              )}
            </div>
            <span className="font-semibold text-lamp">{c.name}</span>
            {c.infected && <span className="text-xs text-rain">{t('end.infected')}</span>}
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {end.players
          .filter((p) => p.role !== 'CAT')
          .map((p) => (
            <div key={p.id} className="flex flex-col items-center rounded-xl border border-line bg-panel p-1.5">
              <CharacterAvatar appearance={p.appearance} size={44} dim={p.status !== 'alive'} />
              <span className="max-w-16 truncate text-[11px] text-mist">{p.name}</span>
            </div>
          ))}
      </div>

      <Button size="lg" variant="lamp" className="mt-8" onClick={() => router.push('/summary')}>
        {t('end.summary')}
      </Button>
    </div>
  );
}
