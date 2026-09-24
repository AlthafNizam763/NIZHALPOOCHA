'use client';
import { useEffect, useRef, useState } from 'react';
import { useSettings } from '@/state/settingsStore';
import { useT } from '@/hooks/useT';
import { audio } from '@/services/audio';
import { narrator } from '@/services/narrator';
import type { I18nKey } from '@/utils/i18n';
import { camAt, clamp01, Stage } from './stage';
import { FILM_LENGTH, SHOTS } from './shots';

/** Toggle for the optional text-to-speech voice-over. */
export function NarrationToggle({ className = '' }: { className?: string }) {
  const t = useT();
  const on = useSettings((s) => s.narration);
  const set = useSettings((s) => s.set);
  if (!narrator.supported()) return null;
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => {
        set({ narration: !on });
        if (on) narrator.stop();
      }}
      className={`flex h-10 items-center gap-2 rounded-full border px-3 text-sm backdrop-blur-sm ${on ? 'border-lamp/70 bg-lamp/15 text-lamp' : 'border-white/20 bg-black/40 text-mist'} ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
        <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3" />
        {!on && <path d="M4 4l16 16" />}
      </svg>
      {t('intro.narration')}
    </button>
  );
}

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
        if (current) narrator.say(tRef.current(current));
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
    <div className="fixed inset-0 z-40 bg-black select-none">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 px-4 pt-safe pl-safe pr-safe">
        <div className="pointer-events-auto mt-2">
          <NarrationToggle />
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="pointer-events-auto mt-2 flex h-10 items-center gap-2 rounded-full border border-white/25 bg-black/45 px-4 text-sm font-semibold uppercase tracking-wide text-paper backdrop-blur-sm hover:border-lamp hover:text-lamp"
        >
          {t('intro.skip')}
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M5 5l9 7-9 7V5zm10 0h3v14h-3V5z" />
          </svg>
        </button>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-[10.5vh] flex justify-center px-6" aria-live="polite">
        {subtitle && (
          <p
            key={subtitle}
            className="animate-rise max-w-3xl text-center text-lg font-semibold leading-snug text-paper sm:text-2xl [@media(max-height:480px)]:text-base"
            style={{ textShadow: '0 2px 4px #000, 0 0 12px rgba(0,0,0,.9)' }}
          >
            {t(subtitle)}
          </p>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10" aria-hidden>
        <div ref={barRef} className="h-full w-0 bg-lamp/70" />
      </div>
    </div>
  );
}
