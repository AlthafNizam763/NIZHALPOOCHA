# Mobile builds (Capacitor)

The same static Next.js export (`web/out`) runs inside Capacitor. Native projects live in
`web/android` and `web/ios`. App id: `com.nizhalpoocha.game`.

Built in: landscape lock during gameplay (`@capacitor/screen-orientation`), portrait for menus,
safe-area insets, dark status bar overlay, splash screen, hardware back button, keyboard without
resize, reconnect on network changes, touch joystick + contextual buttons.

## Server URL for the apps

`NEXT_PUBLIC_SERVER_URL` is baked in at build time. The app's origin is `https://localhost`
(Android) / `capacitor://localhost` (iOS) — add both to the server's `CORS_ORIGINS`.

- **Production:** use an `https://` game server.
- **Local testing against a LAN dev server over plain HTTP:**
  ```bash
  # web/.env.local → NEXT_PUBLIC_SERVER_URL=http://192.168.1.20:4000
  cd web
  npx next build
  CAP_LOCAL_HTTP=true npx cap sync android     # switches the WebView to http + cleartext (debug only)
  ```
  and add `http://localhost` to `CORS_ORIGINS`.

## Android

Requirements: Android Studio (SDK 35+). Use Android Studio's bundled JDK 21 for Gradle
(Gradle 8.14 does not run on JDK 25).

```bash
cd web
npx next build && npx cap sync android

# Debug APK for local testing
cd android
# Windows (PowerShell): $env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
./gradlew assembleDebug
# → android/app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Release AAB (Play Store):

1. Create a keystore: `keytool -genkey -v -keystore nizhal-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias nizhal`
2. Open `web/android` in Android Studio → *Build → Generate Signed App Bundle*, **or** configure
   `signingConfigs` in `android/app/build.gradle` and run `./gradlew bundleRelease`
   (→ `app/build/outputs/bundle/release/app-release.aab`).
3. Never commit the keystore or its passwords.

`npm run cap:android -w web` builds, syncs and opens Android Studio.

## iOS

Requirements: macOS with Xcode 16+.

```bash
cd web
npx next build && npx cap sync ios
npx cap open ios
```

In Xcode: set your Team and bundle id under *Signing & Capabilities*, choose a device and Run.
For TestFlight/App Store: *Product → Archive* → *Distribute App*.
Orientation: in *General → Deployment Info* keep Portrait + Landscape enabled (the app locks
landscape itself during matches).

## Google sign-in on native

Firebase's popup sign-in only works in browsers. The native apps currently offer email/password
and guest sign-in and show a clear message for Google. Adding native Google sign-in needs a native
plugin (e.g. `@capacitor-firebase/authentication`) plus SHA-1/SHA-256 fingerprints (Android) and the
reversed client id URL scheme (iOS).

## App icon & splash

Uses Capacitor defaults. To generate branded assets from `web/public/icon.svg`:
`npx @capacitor/assets generate --iconBackgroundColor '#0e1512' --splashBackgroundColor '#0e1512'`
(after exporting a 1024×1024 PNG to `web/assets/icon.png`).
