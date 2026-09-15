# Bàn Bài

A lightweight online card table for 1–10 friends. Players join with a room link—no accounts required.

## Features

- Shared 52-card table with private player hands
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

The current release is a general-purpose 52-card sandbox. Tiến Lên, Tá Lả, and Tam Quốc Sát can be added as separate rule modules on top of the room and card engine.
