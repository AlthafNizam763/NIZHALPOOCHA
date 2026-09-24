'use client';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { useSettings } from '@/state/settingsStore';
import type { I18nKey, Lang } from '@/utils/i18n';
import { spokenText } from '@/utils/i18n/narration';
import { audio } from './audio';

/**
 * Voice-over for the story intro, recap and tutorial, in the player's
 * narration language (Malayalam by default).
 *
 * Source order for each line:
 *   1. a recorded clip listed in /voice/manifest.json (see scripts/generate-narration.ts)
 *   2. the device's text-to-speech voice for that language
 * If neither can play, the status says so instead of failing silently.
 */

export type NarrationStatus = 'idle' | 'loading' | 'playing' | 'blocked' | 'unavailable' | 'error';

interface NarrationState {
  status: NarrationStatus;
  source: 'clip' | 'tts' | null;
}

export const useNarration = create<NarrationState>()(() => ({ status: 'idle', source: null }));
const setStatus = (status: NarrationStatus, source: NarrationState['source'] = null) => useNarration.setState({ status, source });

/** Clip paths relative to /voice/, per language and line key. */
type Manifest = Partial<Record<Lang, Partial<Record<string, string>>>>;

const VOICE_BASE = '/voice/';

/** Pace and pitch for a hushed, storyteller delivery (device speech only). */
const DELIVERY: Record<Lang, { rate: number; pitch: number }> = {
  ml: { rate: 0.88, pitch: 0.92 },
  en: { rate: 0.9, pitch: 0.88 },
};

const clipVolume = () => {
  const s = useSettings.getState();
  return Math.max(0, Math.min(1, s.masterVolume * s.narrationVolume));
};

class Narrator {
  private manifest: Promise<Manifest> | null = null;
  private clips = new Map<string, HTMLAudioElement>();
  private current: HTMLAudioElement | null = null;
  private lastKey: I18nKey | null = null;
  /** Bumped on every say/stop so late callbacks from an older line are ignored. */
  private token = 0;
  private cancelGestureWait: (() => void) | null = null;

  constructor() {
    if (typeof window === 'undefined') return;
    useSettings.subscribe((s, prev) => {
      if (this.current) this.current.volume = clipVolume();
      if (!s.narration && prev.narration) this.stop();
    });
  }

  ttsSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  loadManifest(): Promise<Manifest> {
    this.manifest ??= fetch(`${VOICE_BASE}manifest.json`, { cache: 'no-cache' })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<Manifest>;
      })
      .catch((err) => {
        console.warn('[narrator] No recorded narration found (/voice/manifest.json); using device speech.', err);
        return {};
      });
    return this.manifest;
  }

  /** Best installed device voice for a language; neural / online voices sound most natural. */
  voiceFor(lang: Lang): SpeechSynthesisVoice | null {
    if (!this.ttsSupported()) return null;
    let best: SpeechSynthesisVoice | null = null;
    let bestScore = 0;
    for (const v of window.speechSynthesis.getVoices()) {
      const l = v.lang.toLowerCase().replace('_', '-');
      if (!l.startsWith(lang)) continue;
      let score = 1;
      if (l === `${lang}-in`) score += 2;
      if (/natural|neural|online|google|wavenet/i.test(v.name)) score += 3;
      if (!v.localService) score += 1;
      if (score > bestScore) {
        best = v;
        bestScore = score;
      }
    }
    return best;
  }

  private clip(url: string): HTMLAudioElement {
    let a = this.clips.get(url);
    if (!a) {
      a = new Audio(url);
      a.preload = 'auto';
      this.clips.set(url, a);
    }
    return a;
  }

  /** Starts downloading the clips for these lines in the current narration language. */
  async preload(keys: readonly I18nKey[]): Promise<void> {
    const m = await this.loadManifest();
    const lang = useSettings.getState().narrationLanguage;
    for (const key of keys) {
      const path = m[lang]?.[key];
      if (path) this.clip(VOICE_BASE + path);
    }
  }

  /** Speaks a line (replacing any line in progress) when narration is on. */
  async say(key: I18nKey): Promise<void> {
    const token = ++this.token;
    this.lastKey = key;
    this.halt();
    const { narration, narrationLanguage: lang } = useSettings.getState();
    if (!narration) return setStatus('idle');
    setStatus('loading');
    const m = await this.loadManifest();
    if (token !== this.token) return;
    const path = m[lang]?.[key];
    if (path) this.playClip(VOICE_BASE + path, lang, key, token);
    else this.speakDevice(lang, key, token);
  }

  /** Says the last line again, e.g. right after the narration language changes. */
  replay(): void {
    if (this.lastKey) void this.say(this.lastKey);
  }

  private playClip(url: string, lang: Lang, key: I18nKey, token: number): void {
    const a = this.clip(url);
    this.current = a;
    a.volume = clipVolume();
    const fail = (why: unknown) => {
      if (token !== this.token) return;
      console.error(`[narrator] Could not play ${url}; falling back to device speech.`, why);
      this.current = null;
      audio.duckRain(false);
      this.speakDevice(lang, key, token, true);
    };
    a.onplaying = () => {
      if (token !== this.token) return;
      setStatus('playing', 'clip');
      audio.duckRain(true);
    };
    a.onended = () => {
      if (token !== this.token) return;
      setStatus('idle');
      audio.duckRain(false);
    };
    a.onerror = () => fail(a.error);
    try {
      a.currentTime = 0;
    } catch {
      /* not loaded yet */
    }
    a.play().catch((err: DOMException) => {
      if (token !== this.token || err.name === 'AbortError') return;
      if (err.name === 'NotAllowedError') this.waitForGesture(key);
      else fail(err);
    });
  }

  private speakDevice(lang: Lang, key: I18nKey, token: number, afterClipError = false): void {
    const voice = this.voiceFor(lang);
    if (!voice) {
      console.warn(`[narrator] No recorded clip and no device voice for "${lang}" — "${key}" is subtitles only.`);
      return setStatus(afterClipError ? 'error' : 'unavailable');
    }
    const { masterVolume, narrationVolume } = useSettings.getState();
    const u = new SpeechSynthesisUtterance(spokenText(lang, key));
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = DELIVERY[lang].rate;
    u.pitch = DELIVERY[lang].pitch;
    u.volume = Math.min(1, masterVolume * narrationVolume);
    u.onstart = () => {
      if (token !== this.token) return;
      setStatus('playing', 'tts');
      audio.duckRain(true);
    };
    u.onend = () => {
      if (token !== this.token) return;
      setStatus('idle');
      audio.duckRain(false);
    };
    u.onerror = (e) => {
      if (token !== this.token || e.error === 'interrupted' || e.error === 'canceled') return;
      console.error(`[narrator] Device speech failed for "${key}".`, e.error);
      setStatus('error');
      audio.duckRain(false);
    };
    window.speechSynthesis.speak(u);
  }

  /** The browser blocks sound until the player interacts: retry on the first tap / key. */
  private waitForGesture(key: I18nKey): void {
    setStatus('blocked');
    this.cancelGestureWait?.();
    const resume = () => {
      this.cancelGestureWait?.();
      audio.unlock();
      if (this.lastKey === key) void this.say(key);
    };
    window.addEventListener('pointerdown', resume, { once: true });
    window.addEventListener('keydown', resume, { once: true });
    this.cancelGestureWait = () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
      this.cancelGestureWait = null;
    };
  }

  /** Silences the current line without forgetting it. */
  private halt(): void {
    this.cancelGestureWait?.();
    if (this.current) {
      this.current.onended = this.current.onerror = this.current.onplaying = null;
      this.current.pause();
      this.current = null;
    }
    if (this.ttsSupported()) window.speechSynthesis.cancel();
    audio.duckRain(false);
  }

  stop(): void {
    this.token++;
    this.lastKey = null;
    this.halt();
    setStatus('idle');
  }
}

export const narrator = new Narrator();

/** How this device can narrate `lang`: recorded clips, a device voice, or not at all. */
export function useNarrationSource(lang: Lang): 'clips' | 'device' | 'none' | 'checking' {
  const [source, setSource] = useState<'clips' | 'device' | 'none' | 'checking'>('checking');
  useEffect(() => {
    let alive = true;
    const check = () =>
      void narrator.loadManifest().then((m) => {
        if (!alive) return;
        if (Object.keys(m[lang] ?? {}).length) setSource('clips');
        else setSource(narrator.voiceFor(lang) ? 'device' : 'none');
      });
    check();
    if (!narrator.ttsSupported()) return () => void (alive = false);
    window.speechSynthesis.addEventListener('voiceschanged', check);
    return () => {
      alive = false;
      window.speechSynthesis.removeEventListener('voiceschanged', check);
    };
  }, [lang]);
  return source;
}
