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

Requires Node.js 22+. No database.

```bash
npm install
cp .env.example .env.local
npm run dev:all
```

`dev:all` runs the party server on port 1999 and Next on port 3000. Open [http://localhost:3000](http://localhost:3000).

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

## Game modes

- **Classic cards:** a general-purpose 52-card sandbox.
- **Tam Quốc Sát:** the 108-card standard deck with Vietnamese card names, suits, ranks, and licensed LangKhach artwork. It currently uses the same free-table actions as Classic cards; rule enforcement can be added as a separate engine later.

Artwork attribution and redistribution context are retained in `public/tam-quoc-sat/NOTICE.md`.
