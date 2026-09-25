# Architecture

## Responsibilities

| Piece | Owns |
| --- | --- |
| `shared/` | The contract: typed Socket.IO events (`C2S`/`S2C` constants + interfaces), zod payload schemas, `GAME` constants, room settings & bounds, role limits, phase state machine, task & sabotage definitions, map data, collision. Used by both server and web, so validation and prediction can't drift. |
| `server/` | The authority: auth, rooms, role assignment, movement validation, tasks, kills, sabotage, meetings, votes, win conditions, timers, reconnection, persistence at match end. |
| `web/` (Next.js) | All non-gameplay UI + overlays (HUD, meeting, results), Firebase Auth/Firestore/RTDB client, Zustand stores, socket service. |
| `web/game/` (Phaser) | World rendering, local movement prediction, remote interpolation, vision/darkness, weather, proximity detection. Created once per play screen (`GameCanvas`), never re-created on React renders. |
| Firebase | Accounts (Auth), persistent profile/stats/matches/leaderboard (Firestore), presence (RTDB). **Never** live match state. |

## Match state machine (`shared/src/game-rules/phases.ts`)

```
WAITING ⇄ LOBBY → STARTING → ROLE_REVEAL → PLAYING ⇄ (REPORT → MEETING → VOTING → RESULT) → FINISHED → LOBBY
```

Every transition goes through `canTransition()`; illegal ones are logged and refused.
`SABOTAGE` and `SPECTATOR` from the design are sub-states: a sabotage runs *during* `PLAYING`
(`GameStateView.sabotage`), and spectating is a per-player status (dead players).

## Hidden-information policy

The server never broadcasts. Every message goes through `Outbox.toPlayer(id, …)`, and every
state view is built **per viewer** (`Match.stateFor`, `selfFor`, `roleInfoFor`, `tick`):

- `game:role` is sent only to its owner. Cats additionally get `fellowCats`; Humans get `[]`.
- `killReadyAt` / `sabotageReadyAt` are `null` for Humans (a non-null value would leak the role).
- Deaths are **not** public until revealed: a living viewer sees an unrevealed dead player as
  `alive` until a report/meeting. `player:killed` goes only to the victim and the Cats, and the
  post-kill state push goes only to spectators (so bystanders can't infer a kill from traffic timing).
- Position snapshots use interest management: living players only receive players and bodies
  within their vision radius (+ margin); ghosts are never sent to the living.
- Dead-player chat goes only to other dead players.
- Cats get fake task lists of the same shape, so their HUD is indistinguishable.
- Roles appear publicly only after a confirmed ejection (if `confirmEjects`) or at `game:ended`.

Both the unit tests and `npm run sim` assert that nothing a Human receives before the first
legitimate reveal contains Cat information.

## Movement

- Client: predicts locally at 60 fps with `moveWithCollision` (shared AABB resolver with sub-steps)
  and sends its position at most every 66 ms, only when it changed.
- Server: token-bucket speed check (`PLAYER_SPEED × dt × 1.4`, capped), bounds, collision at the new
  position **and** along the segment (no wall skipping), locked doors. Invalid moves are dropped and
  the client is corrected via `game:self.teleportSeq` (rate-limited).
- Remote players are rendered 110 ms in the past with linear interpolation; big jumps snap.
- Snapshots are broadcast at ~15 Hz as compact arrays.

## Validation summary

| Action | Server checks |
| --- | --- |
| Kill | phase PLAYING · killer exists, alive, connected, Cat · target exists, alive, not a Cat · range ≤ 90 · line of sight (walls, locked doors) · cooldown |
| Task | phase · alive Human · task belongs to player & not done · start within range · complete after `minDurationMs` and still near |
| Report | phase · alive · body exists · range ≤ 120 |
| Emergency | phase · alive · meetings left · global cooldown · near the alarm bell · no critical sabotage |
| Sabotage | phase · Cat (dead Cats may sabotage) · shared cooldown · one major sabotage at a time · valid door target |
| Repair | phase · alive · station belongs to the active sabotage · range · minimum duration |
| Vote | phase VOTING · alive · one vote · target alive or `skip` |
| Chat | phase MEETING/VOTING · rate limit · sanitized text or known quick-message id |
| Room | zod-validated payloads · host-only settings/start/kick · bounded settings · valid cat count for player count · everyone ready & connected |

All client payloads are parsed with zod (`shared/src/events`); every socket also has a per-event
token-bucket rate limit, and `maxHttpBufferSize` is 16 KB.

## Maps and game modes

Maps and modes are configured independently and combined per room (`RoomSettings.mapId` + `mode`).

- **Maps** (`shared/src/maps/`, registry in `maps/index.ts`): Kadalimukku Old Town, Kadalimukku New Town,
  Backwater Village, Neo Kerala, Nizhalam. A `GameMapDef` holds geometry (zones = rooms, colliders, walls,
  doors, water, bridges, hazards), spawns, task / sabotage / meeting locations, mode objectives (antidote
  parts), surveillance (CCTV cameras, patrol drones, security consoles), a visual theme, map rules (e.g.
  vision multiplier) and `supportedModes`. Every map is built with `createMapBuilder`, so collision rules are
  identical everywhere. Sabotages available on a map are derived from its stations.
- **Modes** (`shared/src/game-modes/`): `ClassicMode`, `HuntMode`, `InfectionMode`, `FutureMode`. A
  `GameModeDefinition` is data + pure rules: Cat limits, what a Cat's attack does (kill / infect), emergency
  meetings, vision and cooldown multipliers, survival clock, antidote objective, surveillance alerts, required
  map features and `evaluateWin`. `Match` reads these values — it never branches on map or mode ids.
- `applySettingsPatch` keeps map and mode compatible (changing only the map falls back to its default mode).

## Win conditions (per mode, `evaluateWin`)

- Classic / Future — Humans: all Cats eliminated or all tasks complete. Cats: Cats ≥ Humans, or a critical
  sabotage expires.
- Hunt — as Classic, plus Humans win when the survival clock (paused during meetings) runs out.
- Infection — Cats infect instead of killing (HUMAN → INFECTED, frozen for a few seconds → CAT, delivered
  privately). Humans win by ejecting every Cat, completing the escape systems (tasks), collecting every
  antidote part, or surviving the clock. Cats win when no Humans remain (no parity rule).
A Human who is gone or converted only counts the tasks they finished. Evaluated after kills / infections,
ejections (after the result screen), task and objective completion, the survival clock and departures.

## Socket events

Defined once in `shared/src/events/index.ts` (`C2S`, `S2C`, `ClientToServerEvents`, `ServerToClientEvents`).
Requests use acknowledgements: `{ ok: true, data } | { ok: false, error: ErrorCode }`.

Client → server: `room:create`, `room:join`, `room:quickPlay`, `room:list`, `room:leave`, `room:ready`, `room:settings`,
`room:profile`, `room:kick`, `room:start`, `player:move`, `task:start`, `task:complete`, `player:report`,
`cat:kill`, `cat:sabotage`, `sabotage:repairStart`, `sabotage:repair`, `meeting:start`, `meeting:chat`,
`vote:cast`, `game:reconnect`, `net:ping`, `voice:join`, `voice:leave`, `voice:mute`, `voice:signal`.

Server → client: `room:updated`, `player:joined`, `player:left`, `room:hostChanged`, `room:kicked`,
`game:starting`, `game:role`, `game:state`, `game:self`, `game:snapshot`, `task:updated`,
`sabotage:started`, `sabotage:ended`, `player:killed`, `meeting:started`, `meeting:chat`,
`voting:started`, `voting:updated`, `vote:result`, `game:ended`, `player:reconnected`, `server:error`, `voice:roster`, `voice:signal`.

## Voice chat

Audio is peer-to-peer WebRTC (a full mesh; fine for ≤ 15 players at ~30 kbps per peer). The game
server never carries audio — it decides **who may talk to whom** and relays only signalling
(`voice:signal`: offer / answer / ICE) between players who share a channel right now.

| Channel | Who | When |
| --- | --- | --- |
| `lobby` | everyone in the room who joined voice | no match running |
| `meeting` | living players | MEETING, VOTING, RESULT |
| `dead` | eliminated players only | any time during a match |
| none | living players | while the town is in play (ROLE_REVEAL, PLAYING, REPORT) |

- `server/src/voice/VoiceManager.ts` recomputes channels after every room/match broadcast and sends
  each opted-in player a `voice:roster` (their channel + peers + mute states) only when it changes.
  A living player never receives a roster change caused by a death during play.
- The client (`web/services/voice.ts`) connects to exactly the roster's peers and closes every
  connection that leaves it; the lower player id always makes the offer. Signals that arrive while
  the player's own join is in flight are buffered and replayed.
- The host can disable voice per room (`settings.voiceChat`). Players opt in (mic permission is
  only requested on *Join voice*), can mute, or use push-to-talk (hold **V** / the mic button).
- ICE servers come from `VOICE_ICE_SERVERS` (public STUN by default). Production should add a TURN
  server: without it, some players behind symmetric NATs or mobile carriers cannot connect.
- Limitation: because audio is peer-to-peer, a modified client can't be *forced* off the air; the
  rules hold because honest clients drop connections the server removes and the server refuses to
  broker new ones across channels.

## Reconnection

Identity is the Firebase uid (or dev uid). A new socket for the same uid replaces the old one.
In a match a disconnected player has 60 s to return (`game:reconnect` returns room, state, role,
self and visible chat); after that they are treated as having left (public, win check). In the lobby
the grace is 30 s; a disconnected host hands over immediately.

## Firestore data model

| Path | Written by | Contents |
| --- | --- | --- |
| `users/{uid}` | client (profile fields only) + server (stats) | `username`, `appearance`, `isGuest`, `onboarding{hasSeenIntro,hasCompletedTutorial}` (mirrored in localStorage), `xp`, `coins`, `stats{gamesPlayed,wins,losses,tasksCompleted,catsIdentified,catGames,catWins,kills,sabotages,reports,investigations}` |
| `leaderboard/{uid}` | server | `name`, `xp`, `games`, `wins`, `tasks`, `investigations` (no roles) |
| `matches/{matchId}` | server | map, mode, winner, reason, duration, `playerIds`, per-player role/status/stats |
| `matchPlayers/{matchId}_{uid}` | server | per-player result for history queries |
| `friends`, `friendRequests`, `notifications`, `achievements`, `settings` | reserved (rules in place) for Milestone 14 |

Realtime Database: `status/{uid} = { state: online|in_lobby|in_game|offline, lastChanged }` with
`onDisconnect` → offline.

## Extending

- **New map:** build a `GameMapDef` with `createMapBuilder` in `shared/src/maps/`, register it in
  `maps/index.ts` and `MAP_IDS`, and add its zone names / signs to the i18n files. Rendering, minimap,
  collision, stations and the per-map reachability and consistency tests all derive from the definition.
- **New task:** add to `TASK_TYPES`/`TASK_DEFS`, place a station on a map, reuse a mini-game template
  or add one in `web/components/game/minigames`.
- **New sabotage:** add to `SABOTAGE_TYPES`/`SABOTAGE_DEFS`, place stations for it on maps, and handle its
  effect in `Match`.
- **New mode:** add a `GameModeDefinition` in `shared/src/game-modes/`, register it in `GAME_MODES` and the
  mode registry, and list it in the `supportedModes` of the maps it suits.
