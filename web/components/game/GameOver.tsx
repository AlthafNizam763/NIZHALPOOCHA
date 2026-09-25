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
    <div
      className="pointer-events-auto fixed inset-0 z-[60] flex flex-col items-center overflow-y-auto p-6 text-center pt-safe pb-safe"
      style={{
        background: `radial-gradient(ellipse at 50% 18%, color-mix(in srgb, ${humansWon ? 'var(--color-leaf)' : 'var(--color-lamp)'} 16%, transparent) 0%, transparent 55%), var(--color-ink)`,
      }}
    >
      <div className="my-auto flex w-full max-w-3xl flex-col items-center py-4">
        <div className={`headline animate-screen-in text-6xl leading-tight sm:text-7xl ${humansWon ? 'text-leaf' : 'text-lamp'}`}>{t(`end.${end.winner}`)}</div>
        <div className="mt-1 flex items-center gap-2" aria-hidden>
          <span className="block h-[3px] w-12 rounded-full bg-lamp" />
          <span className="block h-[3px] w-3 rounded-full bg-gold-deep" />
        </div>
        <div
          className={`animate-rise mt-3 rounded-full border-2 px-5 py-1 font-display text-xl font-extrabold uppercase leading-tight tracking-wide ${
            end.you.won ? 'border-gold-deep bg-lamp text-ink' : 'border-line bg-panel-2 text-mist'
          }`}
        >
          {t(end.you.won ? 'end.victory' : 'end.defeat')}
        </div>
        <p className="mt-2 max-w-md text-sm leading-snug text-mist">{t(`end.reason.${end.reason}` as I18nKey)}</p>

        <div className="surface kasavu animate-rise mt-6 w-full max-w-xl rounded-[var(--radius-card)] px-4 pb-4 pt-5">
          <div className="font-display text-sm font-bold uppercase leading-tight tracking-widest text-lamp">{t('end.revealTitle')}</div>
          <div className="mt-3 flex flex-wrap justify-center gap-6">
            {cats.map((c) => (
              <div key={c.id} className="flex flex-col items-center">
                <div className="relative h-32 w-32">
                  <span aria-hidden className="absolute inset-x-3 bottom-1 h-4 rounded-[50%] bg-[radial-gradient(ellipse,color-mix(in_srgb,var(--color-lamp)_30%,transparent),transparent_70%)]" />
                  <div className={`absolute inset-0 flex items-center justify-center ${revealed ? 'animate-human-fade' : ''}`}>
                    <CharacterAvatar appearance={c.appearance} size={120} mood={humansWon ? 'neutral' : 'happy'} />
                  </div>
                  {revealed && (
                    <div className="animate-cat-emerge absolute inset-0 flex items-center justify-center">
                      <CatForm size={128} />
                    </div>
                  )}
                </div>
                <span className="font-display font-bold leading-tight text-lamp">{c.name}</span>
                {c.infected && <span className="text-xs leading-tight text-rain">{t('end.infected')}</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="animate-rise mt-4 flex flex-wrap justify-center gap-2">
          {end.players
            .filter((p) => p.role !== 'CAT')
            .map((p) => (
              <div
                key={p.id}
                className={`flex flex-col items-center rounded-2xl border-2 p-1.5 ${humansWon ? 'border-leaf/50 bg-panel' : 'border-line bg-panel'} ${p.status !== 'alive' ? 'opacity-70' : ''}`}
              >
                <span className="overflow-hidden rounded-xl bg-night">
                  <CharacterAvatar appearance={p.appearance} size={44} dim={p.status !== 'alive'} mood={humansWon ? 'happy' : 'neutral'} />
                </span>
                <span className="mt-0.5 max-w-16 truncate text-[11px] font-semibold leading-tight text-mist">{p.name}</span>
              </div>
            ))}
        </div>

        <Button size="lg" variant="gold" className="mt-8" onClick={() => router.push('/summary')}>
          {t('end.summary')}
        </Button>
      </div>
    </div>
  );
}
