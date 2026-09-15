import { neon } from "@neondatabase/serverless";

import { cleanName, createDeck, playerColors, publicRoom, RoomState, shuffle } from "@/lib/game";

type RoomRow = { state: RoomState | string; version: number };

export class RoomError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

function database() {
  const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!connectionString) throw new RoomError("The shared table is temporarily unavailable.", 503);
  return neon(connectionString);
}

function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

function newPlayer(id: string, name: string, index: number) {
  return { id, name, color: playerColors[index % playerColors.length], joinedAt: Date.now() };
}

async function readRow(code: string): Promise<RoomRow | null> {
  const rows = await database().query("SELECT state, version FROM rooms WHERE code = $1 LIMIT 1", [code]);
  return (rows[0] as RoomRow | undefined) ?? null;
}

function decodeState(value: RoomRow["state"]): RoomState {
  return typeof value === "string" ? JSON.parse(value) as RoomState : value;
}

export async function getRoom(code: string, viewerId: string, sinceRevision?: number) {
  const row = await readRow(code);
  if (!row) throw new RoomError("That room does not exist.", 404);
  const state = decodeState(row.state);
  if (typeof sinceRevision === "number" && state.revision <= sinceRevision) return null;
  return publicRoom(state, viewerId);
}

export async function createRoom(nameValue: unknown) {
  const name = cleanName(nameValue);
  if (!name) throw new RoomError("Please enter your name.");
  const playerId = crypto.randomUUID();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = roomCode();
    const now = Date.now();
    const state: RoomState = {
      code,
      hostId: playerId,
      game: "sandbox-52",
      players: [newPlayer(playerId, name, 0)],
      hands: { [playerId]: [] },
      deck: shuffle(createDeck()),
      table: [],
      revision: 1,
      updatedAt: now,
      lastAction: `${name} opened the table`,
    };
    try {
      await database().query("INSERT INTO rooms (code, state, version, created_at, updated_at) VALUES ($1, $2::jsonb, $3, $4, $5)", [code, JSON.stringify(state), 1, now, now]);
      return { code, playerId, room: publicRoom(state, playerId) };
    } catch (error) {
      if (attempt === 4) throw error;
    }
  }
  throw new RoomError("Could not create a room. Please try again.", 503);
}

async function mutateRoom(code: string, update: (state: RoomState) => RoomState) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const row = await readRow(code);
    if (!row) throw new RoomError("That room does not exist.", 404);
    const current = decodeState(row.state);
    const next = update(structuredClone(current));
    next.revision = current.revision + 1;
    next.updatedAt = Date.now();
    const changed = await database().query("UPDATE rooms SET state = $1::jsonb, version = $2, updated_at = $3 WHERE code = $4 AND version = $5 RETURNING code", [JSON.stringify(next), row.version + 1, next.updatedAt, code, row.version]);
    if (changed.length === 1) return next;
  }
  throw new RoomError("The table changed at the same time. Please try again.", 409);
}

function requirePlayer(state: RoomState, playerId: string) {
  const player = state.players.find((item) => item.id === playerId);
  if (!player) throw new RoomError("Join the room before playing.", 403);
  return player;
}

function requireHost(state: RoomState, playerId: string) {
  const player = requirePlayer(state, playerId);
  if (state.hostId !== playerId) throw new RoomError("Only the host can do that.", 403);
  return player;
}

export async function joinRoom(code: string, nameValue: unknown, suppliedId?: unknown) {
  const name = cleanName(nameValue);
  if (!name) throw new RoomError("Please enter your name.");
  const playerId = typeof suppliedId === "string" && suppliedId.length > 20 ? suppliedId : crypto.randomUUID();
  const state = await mutateRoom(code, (room) => {
    const returning = room.players.find((player) => player.id === playerId);
    if (returning) {
      returning.name = name;
      room.lastAction = `${name} returned to the table`;
      return room;
    }
    if (room.players.length >= 10) throw new RoomError("This room is full.", 409);
    room.players.push(newPlayer(playerId, name, room.players.length));
    room.hands[playerId] = [];
    room.lastAction = `${name} joined the table`;
    return room;
  });
  return { playerId, room: publicRoom(state, playerId) };
}

export async function performAction(code: string, playerId: string, action: string, data: Record<string, unknown>) {
  const state = await mutateRoom(code, (room) => {
    const player = requirePlayer(room, playerId);
    if (action === "draw") {
      const card = room.deck.pop();
      if (!card) throw new RoomError("The deck is empty.", 409);
      room.hands[playerId].push(card);
      room.lastAction = `${player.name} drew a card`;
      return room;
    }
    if (action === "play") {
      const cardId = String(data.cardId ?? "");
      const hand = room.hands[playerId];
      const index = hand.findIndex((card) => card.id === cardId);
      if (index < 0) throw new RoomError("That card is not in your hand.", 409);
      const [card] = hand.splice(index, 1);
      room.table.push({ ...card, playedBy: playerId, playedAt: Date.now() });
      room.lastAction = `${player.name} played ${card.rank}`;
      return room;
    }
    if (action === "take-back") {
      const card = room.table.at(-1);
      if (!card || card.playedBy !== playerId) throw new RoomError("You can only take back your latest card.", 409);
      room.table.pop();
      room.hands[playerId].push({ id: card.id, rank: card.rank, suit: card.suit });
      room.lastAction = `${player.name} took back a card`;
      return room;
    }
    if (action === "shuffle") {
      requireHost(room, playerId);
      room.deck = shuffle(room.deck);
      room.lastAction = `${player.name} shuffled the deck`;
      return room;
    }
    if (action === "deal") {
      requireHost(room, playerId);
      const count = Math.max(1, Math.min(13, Number(data.count) || 5));
      room.deck = shuffle(createDeck());
      room.table = [];
      for (const seated of room.players) room.hands[seated.id] = [];
      for (let round = 0; round < count; round += 1) {
        for (const seated of room.players) {
          const card = room.deck.pop();
          if (card) room.hands[seated.id].push(card);
        }
      }
      room.lastAction = `${player.name} dealt ${count} cards each`;
      return room;
    }
    if (action === "reset") {
      requireHost(room, playerId);
      room.deck = shuffle(createDeck());
      room.table = [];
      for (const seated of room.players) room.hands[seated.id] = [];
      room.lastAction = `${player.name} reset the table`;
      return room;
    }
    throw new RoomError("Unknown table action.");
  });
  return publicRoom(state, playerId);
}
