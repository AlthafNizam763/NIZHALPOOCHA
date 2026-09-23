import { en, type I18nKey } from './en';
import { ml } from './ml';

export type Lang = 'en' | 'ml';
export type { I18nKey };

const DICTS: Record<Lang, Partial<Record<I18nKey, string>>> = { en, ml };

export function translate(lang: Lang, key: I18nKey, vars?: Record<string, string | number>): string {
  const raw = DICTS[lang][key] ?? en[key] ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
}
