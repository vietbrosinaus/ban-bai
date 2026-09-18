# Bàn Bài architecture

A shared online card table. The app is furniture, not a referee: it moves cards and shows facts, players enforce the rules themselves.

## Hexagonal layers

Dependencies point inward only. `npm run arch` enforces this and fails the build if a fence breaks.

```
lib/domain/    pure. No clock, no randomness, no network, no env, no React.
lib/ports/     the interfaces an adapter must satisfy.
lib/adapters/  concrete implementations of ports.
party/         the driving adapter that owns the table: one Cloudflare Durable Object per room.
app/ components/ hooks/   the driving adapter that renders it.
```

| Layer | May import |
| --- | --- |
| domain | domain |
| ports | domain, ports |
| adapters | domain, ports, adapters |
| party | domain, ports, adapters, party |
| ui | domain, ui, shared |

Domain purity is checked by pattern: `Date.now`, `Math.random`, `crypto`, `fetch`, `process.env` and node builtins are rejected inside `lib/domain`. Time, randomness and ids enter the domain through `CommandContext`, which the application layer fills from the `Clock` and `Randomness` ports.

## Ports and their adapters

| Port | Adapter |
| --- | --- |
| `Clock` | `systemClock` |
| `Randomness` | `webCryptoRandomness` |

The room itself needs no repository port. A Durable Object *is* the single authoritative holder of one table, so `party/table.ts` keeps `TableState` in memory and mirrors it to the object's own SQLite storage. There is no database. The class extends `Server` from `partyserver`, and `wrangler.jsonc` binds it as `Main`, which is why room URLs read `/parties/main/<code>`. The binding name is the URL; the class name is where the data lives, so renaming the binding never loses a table.

## Transport

One websocket per player, one Durable Object per room, and the object is the only writer.

```
browser ──ws──> party/table.ts ──> applyCommand (pure) ──> viewFor(state, seatId) ──ws──> every browser
```

Commands arrive one at a time because the object is single threaded, so there is no lock, no retry loop and no compare and swap. A command that breaks a rule is answered with `reject` plus a fresh snapshot for that player alone; nobody else sees anything.

Joining and creating go over plain HTTP to the same object (`POST /parties/main/<code>`), because they hand out the seat id that the socket then connects with. The socket carries only live traffic.

`lib/domain/protocol.ts` holds the message types, so the server and the client cannot drift apart.

## The table model

One object type. A card is a stack of one, so placing a card on a card, a card on a stack and a stack on a stack are all `merge`.

- `TableState` holds seats, pieces, private hands, counters, a revision and a log.
- `applyCommand(state, command, ctx)` is the only way state changes, and it is pure.
- `viewFor(state, seatId)` redacts: you receive your own hand plus everyone else's hand counts.
- Every player gets their own redacted snapshot, so a hand never crosses the wire to someone who should not see it.

Three pieces exist at the start and are tagged so they are never destroyed when emptied: `generals`, `deck`, `discard`. Everything else players build by hand.

## Seats

Seat index is permanent for as long as a player is seated, and `ringSize` never shrinks while people are playing. Leaving does not move anyone. This matters because clockwise order and `seatDistance` drive attack range, which players count by eye. The host can `compactRing` deliberately between games. The UI rotates the ring for display so you always sit at the bottom of your own screen, without changing anyone's real seat number.

Spectators join with `role: "spectator"`, take no ring position, hold no cards, and every table command is refused for them.

## Presence

Hands are sent as anchors, not coordinates. A message says "my hand is at piece X", "at seat Y", "at point x,y" or "home", and each client animates between anchors. Anchors are only sent once the pointer settles, so sweeping across the table costs nothing and stopping costs one message. Silence means rest: a hand fades after 15 seconds and returns to its own seat after 45, so a closed laptop needs no special handling and there is no heartbeat.
