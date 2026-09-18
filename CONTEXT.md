# Bàn Bài architecture

A shared online card table. The app is furniture, not a referee: it moves cards and shows facts, players enforce the rules themselves.

## Hexagonal layers

Dependencies point inward only. `npm run arch` enforces this and fails the build if a fence breaks.

```
lib/domain/       pure. No clock, no randomness, no network, no env, no React.
lib/ports/        the interfaces the application depends on.
lib/application/  use cases. Depends on domain and ports, never on an adapter.
lib/adapters/     concrete implementations of ports.
lib/composition.ts  the only file that knows which adapter is real.
app/ components/ hooks/   driving adapters (HTTP routes and UI).
```

| Layer | May import |
| --- | --- |
| domain | domain |
| ports | domain, ports |
| application | domain, ports, application |
| adapters | domain, ports, adapters |
| composition | everything in lib |
| ui | domain, application, composition, ui |

Domain purity is checked by pattern: `Date.now`, `Math.random`, `crypto`, `fetch`, `process.env` and node builtins are rejected inside `lib/domain`. Time, randomness and ids enter the domain through `CommandContext`, which the application layer fills from the `Clock` and `Randomness` ports.

## Ports and their adapters

| Port | Adapters |
| --- | --- |
| `RoomRepository`, `HandRepository` | `neonRoomRepository` (Postgres), `inMemoryRoomRepository` (dev and tests) |
| `Clock` | `systemClock` |
| `Randomness` | `webCryptoRandomness` |

Without `DATABASE_URL` the composition root falls back to the in-memory repository so the app runs locally with no database. It refuses to do that in production.

## The table model

One object type. A card is a stack of one, so placing a card on a card, a card on a stack and a stack on a stack are all `merge`.

- `TableState` holds seats, pieces, private hands, counters, a revision and a log.
- `applyCommand(state, command, ctx)` is the only way state changes, and it is pure.
- `viewFor(state, seatId)` redacts: you receive your own hand plus everyone else's hand counts.
- Writes use compare and swap on `revision`, retried up to five times.

Three pieces exist at the start and are tagged so they are never destroyed when emptied: `generals`, `deck`, `discard`. Everything else players build by hand.

## Seats

Seat index is permanent for as long as a player is seated, and `ringSize` never shrinks while people are playing. Leaving does not move anyone. This matters because clockwise order and `seatDistance` drive attack range, which players count by eye. The host can `compactRing` deliberately between games. The UI rotates the ring for display so you always sit at the bottom of your own screen, without changing anyone's real seat number.

Spectators join with `role: "spectator"`, take no ring position, hold no cards, and every table command is refused for them.

## Presence

Hands are sent as anchors, not coordinates. A message says "my hand is at piece X", "at seat Y", "at point x,y" or "home", and each client animates between anchors. Anchors are only sent once the pointer settles, so sweeping across the table costs nothing and stopping costs one message. Silence means rest: a hand fades after 15 seconds and returns to its own seat after 45, so a closed laptop needs no special handling and there is no heartbeat.
