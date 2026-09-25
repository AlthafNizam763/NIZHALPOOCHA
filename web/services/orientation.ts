import { Capacitor } from '@capacitor/core';

/**
 * The native apps are landscape-only, from the sign-in screen through the match
 * (AndroidManifest `sensorLandscape`, iPhone Info.plist). This re-asserts the lock at
 * start-up and around the game screens in case the OS or a plugin reset it. It never
 * unlocks: releasing it would let the phone flip back to portrait. No-op on the web,
 * where phones get a "rotate your device" prompt instead.
 */
export async function lockLandscape(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { ScreenOrientation } = await import('@capacitor/screen-orientation');
  await ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
}
