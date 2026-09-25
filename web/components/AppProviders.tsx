'use client';
import { useEffect, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '@/state/authStore';
import { useSettings } from '@/state/settingsStore';
import { useRoom } from '@/state/roomStore';
import { useGame } from '@/state/gameStore';
import { initAuth } from '@/services/auth';
import { connect, disconnect } from '@/services/net';
import { audio } from '@/services/audio';
import { setPresence } from '@/services/presence';
import { isInMatch } from '@nizhal/shared';
import { Toasts } from './ui/Feedback';
import { ConnectionOverlay } from './ConnectionOverlay';
import { lockLandscape } from '@/services/orientation';

async function setupNative() {
  if (!Capacitor.isNativePlatform()) return;
  const [{ StatusBar, Style }, { SplashScreen }, { App }, { Keyboard }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/app'),
    import('@capacitor/keyboard'),
  ]);
  // Landscape-only app, starting with the sign-in screen.
  await lockLandscape();
  await StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
  await StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
  await Keyboard.setAccessoryBarVisible({ isVisible: false }).catch(() => {});
  void App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
  });
  await SplashScreen.hide().catch(() => {});
}

export function AppProviders({ children }: { children: ReactNode }) {
  const status = useAuth((s) => s.status);
  const largeText = useSettings((s) => s.largeText);
  const lang = useSettings((s) => s.language);
  const room = useRoom((s) => s.room);
  const phase = useGame((s) => s.state?.phase);

  useEffect(() => {
    const unsub = initAuth();
    void setupNative();
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('keydown', unlock);
    return () => {
      unsub();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    if (status === 'signedIn') connect();
    else if (status === 'signedOut') disconnect();
  }, [status]);

  useEffect(() => {
    document.documentElement.classList.toggle('large-text', largeText);
    document.documentElement.lang = lang;
  }, [largeText, lang]);

  useEffect(() => {
    if (status !== 'signedIn') return;
    setPresence(room ? (phase && isInMatch(phase) ? 'in_game' : 'in_lobby') : 'online');
  }, [status, room, phase]);

  return (
    <>
      {children}
      <ConnectionOverlay />
      <Toasts />
    </>
  );
}
