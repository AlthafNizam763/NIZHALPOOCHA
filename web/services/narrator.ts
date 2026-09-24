'use client';
import { useSettings } from '@/state/settingsStore';
import type { Lang } from '@/utils/i18n';

/**
 * Optional voice-over for the story intro and tutorial, spoken with the device's
 * text-to-speech. Subtitles always show, so a device without a matching voice
 * (Malayalam voices are often missing) simply stays silent.
 */
class Narrator {
  supported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  private voiceFor(lang: Lang): SpeechSynthesisVoice | null {
    const voices = window.speechSynthesis.getVoices();
    if (lang === 'ml') return voices.find((v) => v.lang.toLowerCase().startsWith('ml')) ?? null;
    return (
      voices.find((v) => v.lang === 'en-IN') ??
      voices.find((v) => v.lang === 'en-GB') ??
      voices.find((v) => v.lang.toLowerCase().startsWith('en')) ??
      null
    );
  }

  /** Speaks a line (replacing any line in progress) when narration is on. */
  say(text: string): void {
    if (!this.supported()) return;
    const { narration, language, masterVolume } = useSettings.getState();
    window.speechSynthesis.cancel();
    if (!narration || !text) return;
    const voice = this.voiceFor(language);
    if (!voice) return;
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.94;
    u.pitch = 0.92;
    u.volume = Math.min(1, masterVolume * 1.1);
    window.speechSynthesis.speak(u);
  }

  stop(): void {
    if (this.supported()) window.speechSynthesis.cancel();
  }
}

export const narrator = new Narrator();
