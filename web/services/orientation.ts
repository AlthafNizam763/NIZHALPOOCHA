import { Capacitor } from '@capacitor/core';

/** Locks native apps to landscape while the town is on screen. No-op on the web. */
export async function lockLandscape(lock: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const { ScreenOrientation } = await import('@capacitor/screen-orientation');
  if (lock) await ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => {});
  else await ScreenOrientation.unlock().catch(() => {});
}
