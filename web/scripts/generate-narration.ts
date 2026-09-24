/**
 * Builds the recorded narration in web/public/voice/:
 *   voice/<lang>/<line key>.mp3   one clip per spoken line (SPOKEN_KEYS)
 *   voice/manifest.json           { "<lang>": { "<line key>": "<lang>/<file>" } }
 *
 * Synthesise with a cloud neural voice (both have free tiers far larger than this script):
 *   Azure:  AZURE_SPEECH_KEY=… AZURE_SPEECH_REGION=centralindia npm run voice:generate -w web
 *   Google: GOOGLE_TTS_API_KEY=… npm run voice:generate -w web
 * Or drop human recordings into voice/<lang>/ (named <line key>.mp3|.m4a|.ogg|.wav) and run
 *   npm run voice:generate -w web -- --manifest-only
 *
 * Options: --lang=ml|en (default both) · --force (re-create existing clips) · --manifest-only
 * Voice overrides: AZURE_VOICE_ML / AZURE_VOICE_EN, GOOGLE_VOICE_ML / GOOGLE_VOICE_EN.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPOKEN_KEYS, spokenText } from '../utils/i18n/narration';
import type { Lang } from '../utils/i18n';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'voice');
const args = new Set(process.argv.slice(2));
const argLang = [...args].find((a) => a.startsWith('--lang='))?.slice(7) as Lang | undefined;
const LANGS: Lang[] = argLang ? [argLang] : ['ml', 'en'];
const force = args.has('--force');
const AUDIO_EXT = /\.(mp3|m4a|ogg|wav)$/;

// A slower, lower storyteller delivery for the mysterious mood.
const AZURE_VOICES: Record<Lang, string> = {
  ml: process.env.AZURE_VOICE_ML ?? 'ml-IN-MidhunNeural',
  en: process.env.AZURE_VOICE_EN ?? 'en-IN-PrabhatNeural',
};
const GOOGLE_VOICES: Record<Lang, string> = {
  ml: process.env.GOOGLE_VOICE_ML ?? 'ml-IN-Wavenet-B',
  en: process.env.GOOGLE_VOICE_EN ?? 'en-IN-Wavenet-B',
};

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function azure(lang: Lang, text: string): Promise<Buffer> {
  const key = process.env.AZURE_SPEECH_KEY!;
  const region = process.env.AZURE_SPEECH_REGION ?? 'centralindia';
  const locale = lang === 'ml' ? 'ml-IN' : 'en-IN';
  const ssml =
    `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">` +
    `<voice name="${AZURE_VOICES[lang]}"><prosody rate="-10%" pitch="-4%">${xml(text)}</prosody></voice></speak>`;
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
      'User-Agent': 'nizhalpoocha-narration',
    },
    body: ssml,
  });
  if (!res.ok) throw new Error(`Azure ${res.status}: ${await res.text()}`);
  return Buffer.from(await res.arrayBuffer());
}

async function google(lang: Lang, text: string): Promise<Buffer> {
  const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: lang === 'ml' ? 'ml-IN' : 'en-IN', name: GOOGLE_VOICES[lang] },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.9, pitch: -2 },
    }),
  });
  if (!res.ok) throw new Error(`Google ${res.status}: ${await res.text()}`);
  const { audioContent } = (await res.json()) as { audioContent: string };
  return Buffer.from(audioContent, 'base64');
}

function writeManifest(): void {
  const manifest: Partial<Record<Lang, Record<string, string>>> = {};
  for (const lang of ['ml', 'en'] as Lang[]) {
    const dir = join(OUT, lang);
    if (!existsSync(dir)) continue;
    const files = readdirSync(dir).filter((f) => AUDIO_EXT.test(f));
    const entries = Object.fromEntries(files.map((f) => [f.replace(AUDIO_EXT, ''), `${lang}/${f}`]).filter(([key]) => SPOKEN_KEYS.includes(key as never)));
    if (Object.keys(entries).length) manifest[lang] = entries;
    const missing = SPOKEN_KEYS.filter((k) => !(k in entries));
    console.log(`${lang}: ${Object.keys(entries).length}/${SPOKEN_KEYS.length} clips${missing.length ? ` — missing: ${missing.join(', ')}` : ''}`);
  }
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`wrote ${join(OUT, 'manifest.json')}`);
}

async function main(): Promise<void> {
  if (!args.has('--manifest-only')) {
    const synth = process.env.AZURE_SPEECH_KEY ? azure : process.env.GOOGLE_TTS_API_KEY ? google : null;
    if (!synth) {
      console.error('Set AZURE_SPEECH_KEY (+ AZURE_SPEECH_REGION) or GOOGLE_TTS_API_KEY, or pass --manifest-only for recorded files.');
      process.exit(1);
    }
    for (const lang of LANGS) {
      mkdirSync(join(OUT, lang), { recursive: true });
      for (const key of SPOKEN_KEYS) {
        const file = join(OUT, lang, `${key}.mp3`);
        if (existsSync(file) && !force) continue;
        writeFileSync(file, await synth(lang, spokenText(lang, key)));
        console.log(`✓ ${lang}/${key}.mp3`);
      }
    }
  }
  writeManifest();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
