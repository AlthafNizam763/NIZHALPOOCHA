'use client';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/state/settingsStore';
import { useT } from '@/hooks/useT';
import { audio } from '@/services/audio';
import { narrator } from '@/services/narrator';
import type { I18nKey } from '@/utils/i18n';
import { camAt, clamp01, Stage } from './stage';
import { NarrationControls, NarrationStatus } from './NarrationControls';
import { FILM_LENGTH, SHOTS } from './shots';

/**
 * Plays the story intro: 16 painted shots with camera moves, rain, lightning,
 * sound cues, subtitles and optional narration. Calls `onDone` at the end and
 * `onSkip` if the player skips.
 */
export function Cinematic({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [subtitle, setSubtitle] = useState<I18nKey | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const tRef = useRef(t);
  tRef.current = t;
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    void narrator.preload(SHOTS.flatMap((s) => s.subs.map((x) => x.key)));
    const settings = useSettings.getState();
    const low = settings.quality === 'low';
    const stage = new Stage(ctx, { lowQuality: low, reduceFlashes: settings.reduceFlashes });
    const dpr = low ? 1 : Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      stage.resize(canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let shotIdx = 0;
    let shotT = 0;
    let elapsed = 0;
    let fired = new Set<number>();
    let sub: I18nKey | null = null;
    let last = performance.now();
    let raf = 0;
    let finished = false;

    const frame = (now: number) => {
      // Clamp so a backgrounded tab resumes where it paused instead of jumping.
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      stage.step(dt);
      shotT += dt;
      elapsed += dt;
      while (shotT >= SHOTS[shotIdx]!.dur) {
        shotT -= SHOTS[shotIdx]!.dur;
        shotIdx++;
        fired = new Set();
        if (shotIdx >= SHOTS.length) {
          finished = true;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          narrator.stop();
          doneRef.current();
          return;
        }
      }
      const shot = SHOTS[shotIdx]!;
      const next = SHOTS[shotIdx + 1];

      shot.cues?.forEach((cue, i) => {
        if (!fired.has(i) && shotT >= cue.at) {
          fired.add(i);
          cue.run(stage);
        }
      });

      let current: I18nKey | null = null;
      for (const s of shot.subs) if (shotT >= s.at) current = s.key;
      if (current !== sub) {
        sub = current;
        setSubtitle(current);
        if (current) void narrator.say(current);
      }

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      stage.beginWorld(camAt(shot.cam, shotT / shot.dur));
      shot.draw(stage, shotT, tRef.current);
      stage.endWorld();
      stage.drawRain(dt, typeof shot.rain === 'function' ? shot.rain(shotT) : shot.rain, shot.wind);
      stage.drawFlash();
      stage.drawVignette();

      // Fade up from black at the head of a shot, down into the next one's fade.
      let black = shot.fadeIn > 0 ? 1 - clamp01(shotT / shot.fadeIn) : 0;
      const out = next ? (next.fadeIn > 0 ? Math.min(0.6, next.fadeIn) : 0) : 1.2;
      if (out > 0) black = Math.max(black, clamp01((shotT - (shot.dur - out)) / out));
      stage.fill('#000', black);
      stage.drawLetterbox(clamp01(elapsed / 2));

      if (barRef.current) barRef.current.style.width = `${Math.min(100, (elapsed / FILM_LENGTH) * 100)}%`;
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      narrator.stop();
      if (!finished) audio.stopDrone();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onSkip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip]);

  return (
    <div className="fixed inset-0 z-40 bg-ink select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 pt-safe pl-safe pr-safe">
        <div className="pointer-events-auto mt-2 min-w-0">
          <NarrationControls hint={false} />
          <NarrationStatus className="mt-2" />
        </div>
        <button
          type="button"
          onClick={onSkip}
          aria-label={t('intro.skip')}
          className="tactile pointer-events-auto mt-2 flex h-11 shrink-0 items-center gap-2 rounded-full border-2 border-line border-b-ink bg-ink/75 px-4 font-display text-sm font-bold uppercase leading-tight tracking-wide text-paper hover:border-lamp/60 hover:text-lamp max-[380px]:w-11 max-[380px]:justify-center max-[380px]:px-0"
        >
          <span className="max-[380px]:sr-only">{t('intro.skip')}</span>
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden>
            <path d="M5 5l9 7-9 7V5zm10 0h3v14h-3V5z" />
          </svg>
        </button>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-[10.5vh] flex justify-center px-4 [@media(max-height:480px)]:bottom-[8vh]" aria-live="polite">
        {subtitle && (
          <p
            key={subtitle}
            className="animate-rise max-w-3xl rounded-2xl border border-line/60 bg-ink/80 px-4 py-2 text-center font-display text-lg font-semibold leading-snug text-paper shadow-[0_10px_28px_-12px_rgba(0,0,0,.8)] sm:px-6 sm:py-2.5 sm:text-2xl [@media(max-height:480px)]:px-3 [@media(max-height:480px)]:py-1.5 [@media(max-height:480px)]:text-base"
          >
            {t(subtitle)}
          </p>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-ink/70" aria-hidden>
        <div ref={barRef} className="h-full w-0 rounded-r-full bg-lamp shadow-[0_0_8px_var(--color-lamp)]" />
      </div>
    </div>
  );
}
