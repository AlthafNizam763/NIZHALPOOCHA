# Testing

## Automated

```bash
npm run typecheck      # strict TS across shared, server, web
npm test               # server unit tests (node:test, deterministic manual clock)
```

`server/test/` covers:

- vote resolution (majority, tie, skip, no votes) and win conditions
- cat-count limits per player count
- map sanity: every spawn is free and every task/sabotage station, the alarm bell and every zone is
  reachable from spawn (grid flood-fill against the real colliders)
- roles: exact Cat count, private delivery, Cats know each other, Humans receive no Cat info
- kill validation: role, cooldown, range, invalid/self/dead targets, no kills through walls
- hidden deaths: bystanders get no kill event, no state push and no body outside vision
- meeting → voting → ejection → Humans win; tie → nobody ejected → play resumes with teleport
- parity → Cats win; all tasks → Humans win; critical sabotage timeout → Cats win
- task validation (range, minimum duration, ownership, Cats can't do tasks)
- movement anti-cheat (speed/teleport and wall clipping rejected)
- sabotage cooldown/role/repair; dead chat isolation; chat rate limit
- disconnect grace → leave → win check; reconnect within grace
- rooms: create/join/invalid/full, start validation (players, ready, cat count), countdown cancel on
  leave, host migration, host-only bounded settings, empty room cleanup

## End-to-end simulation (real sockets)

```bash
# terminal 1
ALLOW_DEV_AUTH=true npm run dev:server
# terminal 2
npm run sim            # SIM_URL=http://host:port to target another server
```

Five bots: invalid room, room full, not-ready start, role check, malicious kill by a Human,
malformed payload, kill cooldown, disconnect + `game:reconnect`, legal walking with shared collision,
kill, body report, meeting, quick chat, dead vote rejected, duplicate vote rejected, ejection, same
result on every client, **leak audit** of every Human's traffic, room back to lobby.

## Manual test plan

| Scenario | How |
| --- | --- |
| 5 players, one machine | 5 tabs in dev mode (or `NEXT_PUBLIC_AUTH_PERSISTENCE=session` with Firebase) |
| Desktop + Android | LAN setup from SETUP.md §4, or the debug APK |
| Disconnect / reconnect | toggle Wi-Fi or close a tab and reopen within 60 s → you return to the match |
| Host disconnect | close the host's tab in the lobby → "host left" toast, next player becomes host |
| Invalid room / full room | join `ZZZZZZ`; join a room at max players |
| Kill & cooldown | as Cat, try to eliminate right after start (cooldown), from far away, through a wall |
| Voting tie / skip | split votes evenly / everyone skips → nobody is sent away |
| Sabotage | Power (vision shrinks for Humans only), Comms (progress hidden), Pump (timer, two valves), Door lock |
| Spectator | get eliminated → free roam / follow, dead-only chat, cannot vote |
| Orientation | phone in portrait during a match → rotate prompt |
| Malayalam | Settings → Language → മലയാളം |
