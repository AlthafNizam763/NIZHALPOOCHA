'use client';
import { create } from 'zustand';
import type { I18nKey } from '@/utils/i18n';

export interface Toast {
  id: number;
  key: I18nKey;
  vars?: Record<string, string | number>;
  tone: 'info' | 'warn' | 'danger' | 'good';
}

interface UiState {
  toasts: Toast[];
  toast: (key: I18nKey, vars?: Toast['vars'], tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useUi = create<UiState>()((set, get) => ({
  toasts: [],
  toast: (key, vars, tone = 'info') => {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-3), { id, key, vars, tone }] });
    setTimeout(() => get().dismiss(id), 3800);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));
