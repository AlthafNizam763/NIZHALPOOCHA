'use client';
import { HomeBackdrop } from '@/components/home/HomeBackdrop';
import { TitleLogo } from '@/components/home/TitleLogo';

/**
 * Shared backdrop for every menu screen: the same animated monsoon night as the
 * title screen (calm variant), with a soft scrim so panels stay readable.
 */
export function MonsoonBackdrop() {
  return (
    <>
      <HomeBackdrop calm />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_50%_35%,rgba(9,19,15,0.15)_0%,rgba(9,19,15,0.6)_70%)]" />
    </>
  );
}

/** The game logo — same art everywhere (Splash, Login, Loading, Home). */
export function Logo({ small }: { small?: boolean }) {
  return <TitleLogo compact={small} />;
}
