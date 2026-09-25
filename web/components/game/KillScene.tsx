'use client';
import { useEffect } from 'react';
import { useGame } from '@/state/gameStore';
import { useT } from '@/hooks/useT';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { CatForm } from '@/components/ui/CatForm';

const DURATION = 2300;

/**
 * Private murder cutscene, shown only to the two people the server already told:
 *  - the killer sees their own human mask slip into the shadow-cat as the victim falls;
 *  - the victim sees an anonymous cat pounce (the server never tells them who it was).
 * Purely visual: it never blocks input and never reveals anything new.
 */
export function KillScene({ selfId }: { selfId: string }) {
  const t = useT();
  const scene = useGame((s) => s.killScene);
  const players = useGame((s) => s.state?.players);
  const set = useGame((s) => s.set);

  useEffect(() => {
    if (!scene) return;
    const id = setTimeout(() => set({ killScene: null }), DURATION);
    return () => clearTimeout(id);
  }, [scene, set]);

  if (!scene) return null;
  const victim = players?.find((p) => p.id === scene.victimId);
  const me = players?.find((p) => p.id === selfId);

  return (
    <div key={scene.at} aria-live="assertive" className="pointer-events-none fixed inset-0 z-[55] flex flex-col items-center justify-center overflow-hidden">
      <div className="kill-vignette absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(9,19,15,.55)_0%,rgba(9,19,15,.92)_55%,rgba(60,14,8,.95)_100%)]" />
      <div className="kill-vignette absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 bg-[linear-gradient(90deg,transparent,rgba(204,90,60,.22),transparent)]" />

      <div className="relative flex items-end justify-center gap-10">
        {scene.asKiller ? (
          <>
            {me && (
              <div className="relative h-[150px] w-[120px]">
                <div className="kill-mask-off absolute inset-0 flex items-end justify-center">
                  <CharacterAvatar appearance={me.appearance} size={140} mood="sly" />
                </div>
                <div className="kill-cat-on absolute inset-0 flex items-end justify-center">
                  <CatForm size={150} className="drop-shadow-[0_0_24px_rgba(241,180,62,.35)]" />
                </div>
              </div>
            )}
            {victim && (
              <div className="kill-fall">
                <CharacterAvatar appearance={victim.appearance} size={130} mood="scared" />
              </div>
            )}
          </>
        ) : (
          <>
            {me && (
              <div className="kill-fall">
                <CharacterAvatar appearance={me.appearance} size={130} mood="scared" />
              </div>
            )}
            <div className="kill-pounce">
              <CatForm size={190} className="drop-shadow-[0_0_30px_rgba(241,180,62,.4)]" />
            </div>
          </>
        )}
      </div>

      <div className="kill-vignette relative mt-8 px-6 text-center">
        <div className="headline text-4xl text-laterite sm:text-5xl">{t(scene.asKiller ? 'kill.struck' : 'kill.caught')}</div>
        <p className="mt-2 font-display text-lg font-bold text-mist">{t(scene.asKiller ? 'kill.strike' : 'kill.ghost')}</p>
      </div>
    </div>
  );
}
