# Setup

## Requirements

- Node.js 20+ (tested on Node 24) and npm 10+
- For mobile builds: Android Studio (Android SDK + its bundled JDK 21) and/or Xcode 16 on macOS

```bash
npm install          # installs shared, server and web workspaces
```

## 1. Local development without Firebase (fastest)

```bash
cp server/.env.example server/.env    # contains ALLOW_DEV_AUTH=true
npm run dev
```

- Web: <http://localhost:3000> · Server: <http://localhost:4000/health>
- The web app detects that no Firebase keys are set and offers **Continue as guest** with a
  per-tab dev identity (`dev_…`). The server accepts these only when `ALLOW_DEV_AUTH=true` and
  `NODE_ENV` is not `production`.
- Open 5+ tabs (or several browsers / devices on your LAN) to play a full match.

## 2. Firebase project

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method**: enable *Email/Password*, *Anonymous* and (optionally) *Google*.
   Add your web domains (e.g. `localhost`, your Vercel domain) under *Authorized domains*.
3. **Firestore Database**: create in production mode.
4. **Realtime Database**: create (any region) — used only for online presence.
5. **Storage**: enable if you plan to use avatar uploads (rules are included).
6. **Project settings → Your apps → Web app**: register a web app and copy the config.
7. **Project settings → Service accounts → Generate new private key** for the game server.

### Deploy rules and indexes

```bash
npm i -g firebase-tools
firebase login
firebase use --add            # pick your project
firebase deploy --only firestore:rules,firestore:indexes,database,storage
```

(`firebase.json` points at the files in `firebase/`.)

### Web environment — `web/.env.local`

```bash
cp web/.env.example web/.env.local
```

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SERVER_URL` | Game server URL, e.g. `http://localhost:4000` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` … `APP_ID` | From the web app config |
| `NEXT_PUBLIC_FIREBASE_DATABASE_URL` | Realtime Database URL (presence) |
| `NEXT_PUBLIC_AUTH_PERSISTENCE` | `local` (default) or `session` — `session` gives each tab its own sign-in, handy for testing several players in one browser |

### Server environment — `server/.env`

| Variable | Value |
| --- | --- |
| `PORT` | default `4000` |
| `CORS_ORIGINS` | comma-separated web origins; include `https://localhost` (Android) and `capacitor://localhost` (iOS) for the apps |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | path to the service-account JSON **or** |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | the JSON base64-encoded (for hosted environments) |
| `FIREBASE_PROJECT_ID` | project id (optional when using a service account) |
| `ALLOW_DEV_AUTH` | `false` once Firebase is configured; always ignored in production |
| `MAINTENANCE_MODE` | `true` rejects new rooms with a maintenance message |

Never commit `.env`, `.env.local` or service-account files (they are git-ignored).

With Firebase configured the client signs in with Firebase Auth, sends its ID token in the socket
handshake, and the server verifies it with the Admin SDK (`verifyIdToken(token, checkRevoked)`).
At match end the server writes `matches`, `matchPlayers`, `users/{uid}.stats` and `leaderboard`.

### Security of credentials

- The browser only ever receives the **public** web config (`NEXT_PUBLIC_*`). Access is enforced by
  the security rules in `firebase/`, not by hiding these values.
- The **Admin** service account is read only by the game server (`server/.env`), never bundled
  into the web app. `firebase-admin` is a server-only dependency.
- Clients may write only their own `username`, `appearance` and profile metadata. `xp`, `coins`,
  `stats`, `leaderboard` and `matches` are written exclusively by the server.

## 2b. Firebase Emulator Suite (real Auth/Firestore locally, no cloud project)

Requires `npm i -g firebase-tools` and Java 11+.

```bash
npm run emulators      # Auth :9099 · Firestore :8080 · Realtime DB :9000, using the rules in firebase/
```

`web/.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=demo-nizhalpoocha.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-nizhalpoocha
NEXT_PUBLIC_FIREBASE_APP_ID=demo-app
NEXT_PUBLIC_FIREBASE_DATABASE_URL=http://127.0.0.1:9000?ns=demo-nizhalpoocha-default-rtdb
NEXT_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1
```

`server/.env`:

```
FIREBASE_PROJECT_ID=demo-nizhalpoocha
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
ALLOW_DEV_AUTH=false
```

The `demo-` prefix keeps everything offline. Emulator data is discarded when it stops.

## 3. Running pieces separately

```bash
npm run dev:server     # tsx watch server/src/index.ts
npm run dev:web        # next dev -p 3000
```

## 4. Testing on phones over your LAN

1. Find your computer's LAN IP (e.g. `192.168.1.20`).
2. `web/.env.local`: `NEXT_PUBLIC_SERVER_URL=http://192.168.1.20:4000`
3. `server/.env`: add `http://192.168.1.20:3000` to `CORS_ORIGINS`.
4. Open `http://192.168.1.20:3000` on the phone.

Firebase Auth needs the host in *Authorized domains*; in dev mode (no Firebase) this is not required.

## Story narration voice clips

Narration (story intro, recap, tutorial) plays recorded clips from `web/public/voice/`, listed in
`web/public/voice/manifest.json`. Lines without a clip fall back to the device's text-to-speech. Most
desktop browsers have no Malayalam voice, so ship clips for Malayalam (the default narration language).

```bash
# Neural voices (free tiers cover the whole script, ~53 lines per language)
AZURE_SPEECH_KEY=… AZURE_SPEECH_REGION=centralindia npm run voice:generate -w web   # ml-IN-MidhunNeural
GOOGLE_TTS_API_KEY=… npm run voice:generate -w web                                   # ml-IN-Wavenet-B

# Human recordings: save them as web/public/voice/<ml|en>/<line key>.mp3, then
npm run voice:generate -w web -- --manifest-only
```

The spoken lines and their keys live in `web/utils/i18n/narration.ts` (`SPOKEN_KEYS`). Options:
`--lang=ml`, `--force` to re-create existing clips.
