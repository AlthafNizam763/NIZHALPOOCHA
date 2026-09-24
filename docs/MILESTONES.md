# Milestones

Status of the 16 planned milestones. ✅ = implemented and exercised by tests or a real-browser run;
🟡 = partially implemented; ⬜ = not started.

| # | Milestone | Status | Notes |
| --- | --- | --- | --- |
| 1 | Project setup | ✅ | npm workspaces (shared/server/web), strict TS, Next.js, Tailwind 4, Phaser, Socket.IO, Firebase SDKs, Capacitor |
| 2 | Design system & core screens | ✅ | Splash, Login/Register/Forgot, Home, Create, Join, Lobby, error states |
| 3 | Firebase Auth & profile | ✅ | Email/password, anonymous guest, Google (web), guest → email upgrade, session restore, Firestore profile; local dev mode when Firebase isn't configured |
| 4 | Socket.IO rooms | ✅ | create/join/quick play/leave/ready/host/kick, room codes, full/invalid/in-progress errors, presence, host migration, reconnect |
| 5 | Phaser scene, Kerala map, camera, character, collision | ✅ | 12 areas, procedural original art baked into textures, bounded smooth camera, optional wheel zoom |
| 6 | Real-time movement | ✅ | prediction + server validation + interpolation, ~15 Hz snapshots, interest management |
| 7 | Server-authoritative roles | ✅ | crypto shuffle, private delivery, Cats know each other |
| 8 | Human tasks | ✅ | 10 tasks, 6 mini-game templates (wires, numbers, timing, memory, arrange, clear), server timing checks |
| 9 | Cat kill | ✅ | cooldown, range, line of sight, bodies, private notifications, no gore |
| 10 | Cat sabotage | 🟡 | Power, Communications, Pump (critical), Door lock + repairs. CCTV/Water/Road block/Alarm are listed in `FUTURE_SABOTAGES`, not built |
| 11 | Body report | ✅ | report range, emergency alarm bell with limits and cooldown |
| 12 | Meeting, discussion, voting | ✅ | chat + quick messages, dead-only chat, skip, ties, anonymous votes, eject role reveal |
| 13 | Win conditions, results, spectator | ✅ | all four win paths, Cat true-form reveal, summary with XP/coins, spectator follow/free roam |
| 14 | Friends, leaderboard, achievements, notifications | 🟡 | World leaderboard (Firestore) + presence (RTDB) done. Friends, Local/Friends leaderboards, achievements and FCM notifications are **not built** (rules and data model reserved) |
| 15 | Capacitor packaging | 🟡 | Android + iOS projects generated, landscape lock, safe areas, status bar, splash, back button. Branded icons and native Google sign-in not done; see MOBILE.md |
| 16 | Performance, security, reconnect, deployment | 🟡 | Rate limits, payload validation, leak tests, reconnect, baked map textures, quality setting, Dockerfile + deployment docs. No load test at scale; single-instance server |

## Added beyond the plan

- **Voice chat** (WebRTC, peer-to-peer): lobby voice, meeting voice for the living, a ghost channel
  for the eliminated, silence during play; host toggle, mute, push-to-talk, speaking indicators,
  Android/iOS microphone permissions. Tested with real browsers (audio flow, mute, host switch-off,
  silence in play, meeting voice).

- **Public online play**: rooms are Private (join by code) or Public; a Public rooms browser lists open games live (host, players, status, voice) with one-tap join, plus Quick Play and a players-online count. Private rooms are never listed and the listing exposes no player ids.

## Not yet built (next steps, in suggested order)

1. **Investigation clues** (spec §25) — suggestive evidence spawned near incidents; `investigations` stat is wired but always 0.
2. **Friends system** — requests, block, invite-to-room, online status from RTDB presence.
3. **Notifications (FCM)** — friend requests, invitations, match results.
4. **Achievements** — server-evaluated at match end, stored in `achievements`.
5. Remaining sabotages (CCTV, water, road block, alarm) and native Google sign-in.
6. Horizontal scaling (Socket.IO Redis adapter + room directory) if player counts demand it.
