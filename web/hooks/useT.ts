'use client';
import { useCallback } from 'react';
import { useSettings } from '@/state/settingsStore';
import { translate, type I18nKey } from '@/utils/i18n';

export function useT() {
  const lang = useSettings((s) => s.language);
  return useCallback((key: I18nKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
}

/** Non-React access (Phaser, services). */
export function t(key: I18nKey, vars?: Record<string, string | number>) {
  return translate(useSettings.getState().language, key, vars);
}
