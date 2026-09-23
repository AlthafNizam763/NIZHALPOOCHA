import type { CapacitorConfig } from '@capacitor/cli';
import type { KeyboardResize } from '@capacitor/keyboard';

/**
 * CAP_LOCAL_HTTP=true npx cap sync android
 *   → lets a debug APK talk to a plain-HTTP game server on your LAN
 *     (e.g. NEXT_PUBLIC_SERVER_URL=http://192.168.1.20:4000). Never ship this.
 */
const localHttp = process.env.CAP_LOCAL_HTTP === 'true';

const config: CapacitorConfig = {
  appId: 'com.nizhalpoocha.game',
  appName: 'Nizhalpoocha',
  webDir: 'out',
  backgroundColor: '#0e1512',
  server: localHttp ? { androidScheme: 'http', cleartext: true } : { androidScheme: 'https' },
  android: {
    allowMixedContent: localHttp,
  },
  ios: {
    contentInset: 'never',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: '#0e1512',
      showSpinner: false,
    },
    Keyboard: {
      resize: 'none' as KeyboardResize,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0e1512',
      overlaysWebView: true,
    },
  },
};

export default config;
