# Production deployment

## 1. Firebase

1. Follow [SETUP.md](SETUP.md) §2 for a dedicated **production** project.
2. `firebase deploy --only firestore:rules,firestore:indexes,database,storage`
3. Auth → Authorized domains: add your web domain(s).

## 2. Game server (Render / Railway / VPS)

The server is a single long-lived Node process (WebSockets, in-memory rooms). Run **one instance**
per region; horizontal scaling would need sticky sessions plus a shared room directory (Redis adapter)
— not required for the MVP.

**Docker (any host):**

```bash
docker build -f server/Dockerfile -t nizhalpoocha-server .
docker run -p 4000:4000 --env-file server/.env nizhalpoocha-server
```

**Render / Railway without Docker:**

- Root directory: repository root
- Build: `npm ci && npm run build -w server`
- Start: `npm start -w server`
- Health check path: `/health`

**Environment (production):**

```
NODE_ENV=production
PORT=4000                                   # or the platform's $PORT
CORS_ORIGINS=https://your-app.vercel.app,https://localhost,capacitor://localhost
FIREBASE_PROJECT_ID=<your project id>       # required: without it every sign-in is rejected
FIREBASE_SERVICE_ACCOUNT_BASE64=<base64 of the service-account JSON>   # needed to save match results
ALLOW_DEV_AUTH=false                        # ignored in production anyway
VOICE_ICE_SERVERS=[{"urls":"stun:stun.l.google.com:19302"},{"urls":"turn:turn.example.com:3478","username":"…","credential":"…"}]
```

Serve it over TLS (`https://` / `wss://`). Render/Railway do this automatically; on a VPS put Caddy
or Nginx in front with WebSocket upgrade enabled.

## 3. Web (Vercel)

The web app is a static export, so any static host works.

- Import the repo in Vercel, **Root Directory: `web`**, framework preset: Next.js.
- Install command: `cd .. && npm ci` (so the `@nizhal/shared` workspace is available).
- Build command: `next build` (output directory `out`).
- Environment variables: every `NEXT_PUBLIC_*` value from `web/.env.example`, with
  `NEXT_PUBLIC_SERVER_URL=https://<your game server>`.

## 4. Mobile

See [MOBILE.md](MOBILE.md). Build the apps against the production server URL.

## Production checklist

- [ ] `NODE_ENV=production` on the server (dev identities are refused regardless of `ALLOW_DEV_AUTH`)
- [ ] Service-account credentials only in the host's secret store
- [ ] `CORS_ORIGINS` limited to your domains + Capacitor origins
- [ ] Firestore/RTDB/Storage rules deployed; `matchPlayers` index built
- [ ] TLS on the game server
- [ ] A TURN server in `VOICE_ICE_SERVERS` so voice chat works behind strict NATs / mobile networks
- [ ] Web app served over HTTPS (browsers only allow microphone access on secure origins)
- [ ] `MAINTENANCE_MODE=true` available for planned downtime
- [ ] Logs (`LOG_LEVEL=info`) collected by the host
