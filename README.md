# Nizhalpoocha · നിഴൽപ്പൂച്ച

> *Everyone looks human. Not everyone is.*

A hidden-role multiplayer mystery set in **Kadalimukku**, a small Kerala town on a rainy monsoon night.
5–15 players explore the town, repair it and investigate. One or more of them is secretly the
**Nizhalpoocha** (the Cat): it looks exactly like everyone else, sabotages the town and eliminates
Humans in secret.

| Layer | Tech |
| --- | --- |
| App UI (menus, lobby, meeting, results) | Next.js 15 (static export) · React 19 · Tailwind CSS 4 · Zustand |
| Gameplay rendering | Phaser 3.90 (procedural original art, no external assets) |
| Multiplayer (authoritative) | Node.js · Socket.IO 4 · TypeScript |
| Accounts & persistence | Firebase Auth · Firestore · Realtime Database (presence) · Storage rules |
| Mobile | Capacitor 8 (Android + iOS projects included) |

## Quick start (local, no Firebase needed)

```bash
npm install
cp server/.env.example server/.env        # ALLOW_DEV_AUTH=true is already set for local dev
npm run dev                               # server :4000 + web :3000
```

Open <http://localhost:3000>, choose **Continue as guest**. Without Firebase keys the app runs in
**local dev mode**: each browser tab gets its own dev identity, so you can open 5 tabs and play a full
match on one machine. Stats are not saved in this mode.

To use real accounts and saved stats, configure Firebase → [docs/SETUP.md](docs/SETUP.md).

## What is implemented (first playable MVP)

The whole MVP flow from the spec works end to end and has been exercised with automated tests and a
real-browser run (desktop + mobile-landscape page + bots):

Login/guest → Home → Quick Play / Create / Join → Lobby (ready, host, settings, customization,
kick, host migration) → countdown → private role reveal → Kerala map → real-time movement
(prediction + server validation + interpolation) → tasks (6 mini-game templates, 10 tasks) → Cat kill
(cooldown, range, line of sight) → body → report / emergency bell → meeting with chat & quick
messages → voting (skip, ties, anonymous option, role reveal option) → vote result → continue or
win/loss → Cat true-form reveal → match summary (XP, coins) → back to lobby.

Also implemented: sabotage (power failure, communications failure, critical pump failure, door lock)
with repairs; spectator mode for eliminated players (follow/free roam, dead-only chat);
reconnection with a 60 s grace period; minimap + full map; monsoon weather (rain, ripples,
lightning, thunder); procedural audio; English + Malayalam; settings; profile with guest→account
upgrade; world leaderboard; portrait "rotate your device" guard; Capacitor Android/iOS projects.

See [docs/MILESTONES.md](docs/MILESTONES.md) for the milestone-by-milestone status, including what is
**not** built yet (friends, notifications/FCM, achievements, investigation clues).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Game server (tsx watch) + Next.js dev server |
| `npm run typecheck` | Strict TypeScript for shared, server and web |
| `npm test` | Server unit tests (rules, match engine, rooms, map reachability) |
| `npm run sim` | 5 real Socket.IO bots play a full match against a running server and audit for hidden-info leaks |
| `npm run build` | Server bundle (`server/dist`) + static web export (`web/out`) |

## Repository layout

```
shared/   types, typed socket events + zod schemas, constants, game rules, map data & collision
server/   Socket.IO game server: auth, rooms, match engine, voting, persistence, tests, simulation
web/      Next.js app (app/, components/, game/ [Phaser], services/, state/, hooks/, utils/)
          android/ & ios/ — Capacitor native projects
firebase/ Firestore / Realtime Database / Storage security rules and indexes
docs/     setup, architecture, mobile, deployment, testing
```

## Documentation

- [docs/SETUP.md](docs/SETUP.md) — Firebase configuration, environment variables, local development
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — responsibilities, state machine, events, security model, data model
- [docs/MOBILE.md](docs/MOBILE.md) — Android APK/AAB and iOS builds with Capacitor
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) — Vercel, Render/Railway/VPS, Firebase production checklist
- [docs/TESTING.md](docs/TESTING.md) — automated tests, simulation, manual multi-device test plan
- [docs/MILESTONES.md](docs/MILESTONES.md) — progress against the 16 milestones

All characters, map, art, audio and UI are original. The game is inspired by the social deduction
genre only.
