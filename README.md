# Bàn Bài

A lightweight online card table for 1–10 friends. Players join with a room link—no accounts required.

## Features

- Selectable Classic 52-card and Tam Quốc Sát 108-card decks
- Shared table with private player hands
- Create and join rooms by link or six-character code
- Deal, shuffle, draw, play, take back, and reset actions
- A shared, shuffled Tướng pile whose cards draw into private hands in Tam Quốc Sát rooms
- Live rooms over websockets, one PartyKit Durable Object per table
- Responsive desktop and mobile interface
- WebMCP actions for reading the table, drawing, and playing cards

## Local development

**You need nothing but Node.js 22+.** No database, no PartyKit account, no token, no access to anyone's dashboard. Clone it and it runs.

```bash
npm install
cp .env.example .env.local
npm run dev:all
```

`dev:all` starts two things: the party server on port 1999 and Next on port 3000. Open [http://localhost:3000](http://localhost:3000).

The party server is the same code that runs in production, just running on your machine, and your tables live in its memory. That means you can change anything under `party/` and see it immediately, and it also means your tables disappear when you stop it. Nothing you do locally can touch the deployed server.

To play against yourself, open the room link in a second browser profile or a private window. Each window gets its own seat.

| Script | What it does |
| --- | --- |
| `npm run dev:all` | party server and app together, the normal way to work |
| `npm run dev` | app only, useful if you already have the party server running |
| `npm run dev:party` | party server only, on port 1999 |
| `npm run check` | architecture fences, types and lint, the same gate CI runs |
| `npm run build` | production build |

Run `npm run check` before pushing. CI runs the same command, so a green local run means a green pipeline.

### Where things live

```
lib/domain/    the rules of the table, pure functions, no clock or network
lib/ports/     the interfaces an adapter has to satisfy
lib/adapters/  clock and randomness
party/         the server: one Durable Object per table
app/ components/ hooks/   the UI
```

`CONTEXT.md` explains the layering and why the fences exist. `npm run arch` fails the build if an import points the wrong way, so you will hear about it early rather than in review.

## Deployment

Two targets. The party server holds the tables, Vercel serves the app. Both deploy from `main`, so nobody needs credentials on their own machine.

The repository owner does this once:

```bash
npx partykit login
npx partykit token generate
```

`token generate` prints a `PARTYKIT_LOGIN` and a `PARTYKIT_TOKEN`, and the token is shown only once. Add both as GitHub Actions secrets. From then on `.github/workflows/deploy-party.yml` deploys the party server on every push to `main` that touches `party/`, `lib/` or `partykit.json`.

The app itself needs one environment variable in Vercel:

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_PARTY_HOST` | the host the first deploy prints, `ban-bai.<owner>.partykit.dev` |

It is read at build time, not run time, so Vercel has to rebuild after it is set.

### Who needs what

| | Clone and develop | Deploy |
| --- | --- | --- |
| Node.js 22+ | yes | CI does it |
| PartyKit account | **no** | owner only, once |
| Vercel access | **no** | owner only |
| Database | none exists | none exists |

Everything deploys from `main`. Nobody has to hold a credential to contribute, and the owner keeps both deploy targets.

## Game modes

- **Classic cards:** a general-purpose 52-card sandbox.
- **Tam Quốc Sát:** the 108-card standard deck with Vietnamese card names, suits, ranks, and licensed LangKhach artwork. It currently uses the same free-table actions as Classic cards; rule enforcement can be added as a separate engine later.

Artwork attribution and redistribution context are retained in `public/tam-quoc-sat/NOTICE.md`.
