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
## Orientation

The apps are landscape-only, from the sign-in screen onwards: Android's activity uses
`android:screenOrientation="sensorLandscape"`, the iPhone `Info.plist` lists only the two landscape
orientations, and `services/orientation.ts` re-locks landscape at start-up. Phone browsers cannot
lock orientation, so the sign-in screens and the match show a "rotate your device" prompt in
portrait (tablets can still sign in in portrait).

## Google sign-in

**Everywhere (one-time, Firebase console):** *Authentication → Sign-in method → Add new provider →
Google → Enable*, and pick a support email. Until this is done every Google attempt fails with
`auth/operation-not-allowed`. For web testing from another device (e.g. `http://192.168.x.x:3000`)
also add that host under *Authentication → Settings → Authorized domains*.

**Browsers** use Firebase's popup (falling back to a redirect when popups are blocked).

**Native apps** use `@capacitor-firebase/authentication` (system Google account picker) with
`skipNativeAuth: true`; the returned ID token signs in the Firebase JS SDK, so sessions, profiles and
the game server work exactly as on the web. The plugin needs Firebase's native config file and is
only synced into a platform once that file exists (see `capacitor.config.ts`) — without it the app
shows "Google sign-in isn't set up in this version" instead of crashing.

Android:
1. Firebase console → *Project settings → Your apps → Add app → Android*, package name
   **`com.nizhalpoocha.game`** (a `google-services.json` from another package will not work).
2. Add the SHA-1 and SHA-256 of every key that signs the APK. Debug key:
   `keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android`
   Release/Play: add your upload key's fingerprints and Play Console's *App signing key* fingerprints.
3. Download `google-services.json` into `web/android/app/`, then `npx cap sync android` and rebuild.
   (`rgcfaIncludeGoogle = true` in `android/variables.gradle` already pulls in the Google SDK.)

A `DEVELOPER_ERROR` / "10:" in logcat means the signing fingerprint is not registered.

iOS: add an iOS app in Firebase with the bundle id, put `GoogleService-Info.plist` in
`web/ios/App/App/`, add its `REVERSED_CLIENT_ID` as a URL scheme (Xcode → *Info → URL Types*), then
`npx cap sync ios`.

## App icon & splash

Uses Capacitor defaults. To generate branded assets from `web/public/icon.svg`:
`npx @capacitor/assets generate --iconBackgroundColor '#0e1512' --splashBackgroundColor '#0e1512'`
(after exporting a 1024×1024 PNG to `web/assets/icon.png`).
