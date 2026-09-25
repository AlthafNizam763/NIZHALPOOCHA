'use client';
import { useEffect, useState } from 'react';
import { useT } from '@/hooks/useT';
import { useIsPortrait, useIsTouch } from '@/hooks/useDevice';

/** True on phones (short side under 600 CSS px), false on tablets and desktops. */
function useIsPhone(): boolean {
  const [phone, setPhone] = useState(false);
  useEffect(() => setPhone(Math.min(window.screen.width, window.screen.height) < 600), []);
  return phone;
}

/**
 * Full-screen "rotate your device" prompt shown while a touch device is held in portrait.
 * Native apps are locked to landscape; this covers phone browsers, which cannot lock.
 * `phonesOnly` leaves tablets usable in portrait (e.g. on the sign-in screens).
 */
export function RotateDevice({ phonesOnly = false }: { phonesOnly?: boolean }) {
  const t = useT();
  const portrait = useIsPortrait();
  const touch = useIsTouch();
  const phone = useIsPhone();
  if (!portrait || !touch || (phonesOnly && !phone)) return null;
  return (
    <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 bg-ink p-8 text-center" role="alertdialog" aria-label={t('rotate.title')}>
      <div className="animate-rotate-phone h-24 w-14 rounded-2xl border-4 border-lamp bg-night shadow-[0_0_24px_-6px_var(--color-lamp)]">
        <div className="mx-auto mt-1.5 h-1 w-4 rounded-full bg-lamp/70" />
      </div>
      <div className="headline text-3xl leading-tight text-paper">{t('rotate.title')}</div>
      <p className="max-w-xs text-sm leading-snug text-mist">{t('rotate.hint')}</p>
    </div>
  );
}
