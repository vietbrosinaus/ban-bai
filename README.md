# Bàn Bài

A lightweight online card table for 1–10 friends. Players join with a room link—no accounts required.

## Features

- Selectable Classic 52-card and Tam Quốc Sát 108-card decks
- Shared table with private player hands
- Create and join rooms by link or six-character code
- Deal, shuffle, draw, play, take back, and reset actions
- Persistent rooms backed by Neon Postgres
- Responsive desktop and mobile interface
- WebMCP actions for reading the table, drawing, and playing cards

## Local development

Requires Node.js 22+ and a Postgres connection string in `.env.local` as `DATABASE_URL`.

```bash
npm install
npm run db:init
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

The app is configured for Vercel. Connect a Neon database to the Vercel project, initialize it with `npm run db:init`, and deploy with:

```bash
vercel --prod
```

## Game modes

- **Classic cards:** a general-purpose 52-card sandbox.
- **Tam Quốc Sát:** the 108-card standard deck with Vietnamese card names, suits, ranks, and licensed LangKhach artwork. It currently uses the same free-table actions as Classic cards; rule enforcement can be added as a separate engine later.

Artwork attribution and redistribution context are retained in `public/tam-quoc-sat/NOTICE.md`.
