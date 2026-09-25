import type { CapacitorConfig } from '@capacitor/cli';
import type { KeyboardResize } from '@capacitor/keyboard';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Native Google sign-in (@capacitor-firebase/authentication) needs Firebase's native config
 * file. Without it the plugin throws on app start, so it is only synced into a platform once
 * that platform's file is in place:
 *   Android: android/app/google-services.json   iOS: ios/App/App/GoogleService-Info.plist
 */
const FIREBASE_AUTH_PLUGIN = '@capacitor-firebase/authentication';
const allPlugins = Object.keys(JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8')).dependencies as Record<string, string>).filter(
  (d) => (d.startsWith('@capacitor/') || d.startsWith('@capacitor-firebase/')) && !['@capacitor/core', '@capacitor/android', '@capacitor/ios'].includes(d),
);
const pluginsFor = (nativeConfig: string) => (existsSync(join(__dirname, nativeConfig)) ? allPlugins : allPlugins.filter((p) => p !== FIREBASE_AUTH_PLUGIN));

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
    includePlugins: pluginsFor('android/app/google-services.json'),
    allowMixedContent: localHttp,
  },
  ios: {
    includePlugins: pluginsFor('ios/App/App/GoogleService-Info.plist'),
    contentInset: 'never',
  },
  plugins: {
    // Native Google sign-in; the resulting ID token signs in the Firebase JS SDK (services/auth.ts).
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
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
