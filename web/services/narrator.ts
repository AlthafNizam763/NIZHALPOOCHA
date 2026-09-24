'use client';
import { useEffect, useState } from 'react';
import { useSettings } from '@/state/settingsStore';
import { translate, type I18nKey, type Lang } from '@/utils/i18n';
import { NARRATION } from '@/utils/i18n/narration';
import { audio } from './audio';

/** Pace and pitch for a hushed, storyteller delivery. */
const DELIVERY: Record<Lang, { rate: number; pitch: number }> = {
  ml: { rate: 0.88, pitch: 0.92 },
  en: { rate: 0.9, pitch: 0.88 },
};

/**
 * Voice-over for the story intro, recap and tutorial, spoken with the device's
 * text-to-speech in the player's narration language (Malayalam by default).
 * Subtitles always show, so a device without a matching voice stays silent.
 */
class Narrator {
  supported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  /** Best installed voice for a language; neural / online voices sound most natural. */
  voiceFor(lang: Lang): SpeechSynthesisVoice | null {
    if (!this.supported()) return null;
    const score = (v: SpeechSynthesisVoice) => {
      const l = v.lang.toLowerCase().replace('_', '-');
      if (!l.startsWith(lang)) return -1;
      let s = 1;
      if (l === `${lang}-in`) s += 2;
      if (/natural|neural|online|google|wavenet/i.test(v.name)) s += 3;
      if (!v.localService) s += 1;
      return s;
    };
    let best: SpeechSynthesisVoice | null = null;
    let bestScore = 0;
    for (const v of window.speechSynthesis.getVoices()) {
      const s = score(v);
      if (s > bestScore) {
        best = v;
        bestScore = s;
      }
    }
    return best;
  }

  /** Speaks a line (replacing any line in progress) when narration is on. */
  say(key: I18nKey): void {
    if (!this.supported()) return;
    const { narration, narrationLanguage: lang, masterVolume, voiceVolume } = useSettings.getState();
    window.speechSynthesis.cancel();
    if (!narration) return audio.duckRain(false);
    const voice = this.voiceFor(lang);
    if (!voice) return audio.duckRain(false);
    const u = new SpeechSynthesisUtterance(NARRATION[lang][key] ?? translate(lang, key));
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = DELIVERY[lang].rate;
    u.pitch = DELIVERY[lang].pitch;
    u.volume = Math.min(1, masterVolume * Math.max(0.5, voiceVolume) * 1.2);
    u.onstart = () => audio.duckRain(true);
    u.onend = u.onerror = () => {
      if (!window.speechSynthesis.speaking) audio.duckRain(false);
    };
    window.speechSynthesis.speak(u);
  }

  stop(): void {
    if (!this.supported()) return;
    window.speechSynthesis.cancel();
    audio.duckRain(false);
  }
}

export const narrator = new Narrator();

/** Whether this device can speak `lang` (voices load asynchronously). */
export function useHasVoice(lang: Lang): boolean {
  const [has, setHas] = useState(true);
  useEffect(() => {
    if (!narrator.supported()) return setHas(false);
    const check = () => setHas(!!narrator.voiceFor(lang));
    check();
    window.speechSynthesis.addEventListener('voiceschanged', check);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', check);
  }, [lang]);
  return has;
}
