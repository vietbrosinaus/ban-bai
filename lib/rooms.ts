import { neon } from "@neondatabase/serverless";

import { cleanName, createDeck, createPlayerBoard, GameMode, normalizeRoomState, playerColors, PlayingCard, publicRoom, RoomState, shuffle, TableCard } from "@/lib/game";
import { tamQuocSatGeneralById } from "@/lib/tam-quoc-sat-generals";

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

function toPlayingCard(card: TableCard): PlayingCard {
  return { id: card.id, rank: card.rank, suit: card.suit, cardType: card.cardType, name: card.name, asset: card.asset };
}

async function readRow(code: string): Promise<RoomRow | null> {
  const rows = await database().query("SELECT state, version FROM rooms WHERE code = $1 LIMIT 1", [code]);
  return (rows[0] as RoomRow | undefined) ?? null;
}

function decodeState(value: RoomRow["state"]): RoomState {
  return normalizeRoomState(typeof value === "string" ? JSON.parse(value) as RoomState : value);
}

export async function getRoom(code: string, viewerId: string, sinceRevision?: number) {
  const row = await readRow(code);
  if (!row) throw new RoomError("That room does not exist.", 404);
  const state = decodeState(row.state);
  if (typeof sinceRevision === "number" && state.revision <= sinceRevision) return null;
  return publicRoom(state, viewerId);
}

export async function createRoom(nameValue: unknown, gameValue?: unknown) {
  const name = cleanName(nameValue);
  if (!name) throw new RoomError("Please enter your name.");
  const game: GameMode = gameValue === "tam-quoc-sat" ? "tam-quoc-sat" : "sandbox-52";
  const playerId = crypto.randomUUID();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = roomCode();
    const now = Date.now();
    const state: RoomState = {
      code,
      hostId: playerId,
      game,
      players: [newPlayer(playerId, name, 0)],
      hands: { [playerId]: [] },
      deck: shuffle(createDeck(game)),
      table: [],
      discard: [],
      boards: { [playerId]: createPlayerBoard() },
      activePlayerId: playerId,
      targets: { [playerId]: [] },
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
    room.boards[playerId] = createPlayerBoard();
    room.targets[playerId] = [];
    room.lastAction = `${name} joined the table`;
    return room;
  });
  return { playerId, room: publicRoom(state, playerId) };
}

export async function performAction(code: string, playerId: string, action: string, data: Record<string, unknown>) {
  const state = await mutateRoom(code, (room) => {
    const player = requirePlayer(room, playerId);
    if (action === "draw") {
      const count = Math.max(1, Math.min(5, Number(data.count) || 1));
      let drawn = 0;
      while (drawn < count) {
        const card = room.deck.pop();
        if (!card) break;
        room.hands[playerId].push(card);
        drawn += 1;
      }
      if (!drawn) throw new RoomError("The deck is empty.", 409);
      room.lastAction = `${player.name} drew ${drawn === 1 ? "a card" : `${drawn} cards`}`;
      return room;
    }
    if (action === "play" || action === "move-card") {
      const cardId = String(data.cardId ?? "");
      const hand = room.hands[playerId];
      const index = hand.findIndex((card) => card.id === cardId);
      if (index < 0) throw new RoomError("That card is not in your hand.", 409);
      const [card] = hand.splice(index, 1);
      const destination = action === "play" ? "table" : String(data.destination ?? "table");
      if (destination === "equipment") {
        room.boards[playerId].equipment.push(card);
        room.lastAction = `${player.name} equipped ${card.name ?? card.rank}`;
      } else if (destination === "judging") {
        room.boards[playerId].judging.push(card);
        room.lastAction = `${player.name} placed ${card.name ?? card.rank} in the delayed-trick zone`;
      } else if (destination === "discard") {
        room.discard.push(card);
        room.lastAction = `${player.name} discarded ${card.name ?? card.rank}`;
      } else if (destination === "player") {
        const targetId = String(data.targetPlayerId ?? "");
        const target = requirePlayer(room, targetId);
        if (targetId === playerId) throw new RoomError("Choose another player.");
        room.hands[targetId].push(card);
        room.lastAction = `${player.name} gave a card to ${target.name}`;
      } else {
        room.table.push({ ...card, playedBy: playerId, playedAt: Date.now() });
        room.lastAction = `${player.name} played ${card.name ?? card.rank}`;
      }
      return room;
    }
    if (action === "take-back") {
      const card = room.table.at(-1);
      if (!card || card.playedBy !== playerId) throw new RoomError("You can only take back your latest card.", 409);
      room.table.pop();
      room.hands[playerId].push(toPlayingCard(card));
      room.lastAction = `${player.name} took back a card`;
      return room;
    }
    if (action === "move-zone-card") {
      const source = String(data.source ?? "");
      if (source !== "equipment" && source !== "judging") throw new RoomError("Unknown card zone.");
      const zone = room.boards[playerId][source];
      const index = zone.findIndex((card) => card.id === String(data.cardId ?? ""));
      if (index < 0) throw new RoomError("That card is not in your zone.", 409);
      const [card] = zone.splice(index, 1);
      const destination = String(data.destination ?? "discard");
      if (destination === "hand") room.hands[playerId].push(card);
      else if (destination === "table") room.table.push({ ...card, playedBy: playerId, playedAt: Date.now() });
      else room.discard.push(card);
      room.lastAction = `${player.name} moved ${card.name ?? card.rank} from ${source}`;
      return room;
    }
    if (action === "take-discard") {
      const index = room.discard.findIndex((card) => card.id === String(data.cardId ?? ""));
      if (index < 0) throw new RoomError("That card is no longer in the discard pile.", 409);
      const [card] = room.discard.splice(index, 1);
      room.hands[playerId].push(card);
      room.lastAction = `${player.name} retrieved ${card.name ?? card.rank} from discard`;
      return room;
    }
    if (action === "clear-table") {
      if (!room.table.length) throw new RoomError("The play area is already empty.", 409);
      room.discard.push(...room.table.map(toPlayingCard));
      room.table = [];
      room.lastAction = `${player.name} cleared the play area`;
      return room;
    }
    if (action === "set-generals") {
      if (room.game !== "tam-quoc-sat") throw new RoomError("Generals are only available in Tam Quốc Sát.");
      const ids = Array.isArray(data.generalIds) ? data.generalIds.map(String).slice(0, 2) : [];
      if (ids.length !== 2 || new Set(ids).size !== 2) throw new RoomError("Choose two different generals.");
      const selected = ids.map((id) => tamQuocSatGeneralById.get(id));
      if (selected.some((general) => !general)) throw new RoomError("Unknown general.");
      room.boards[playerId].generals = selected.map((general) => ({ ...general!, revealed: false }));
      room.lastAction = `${player.name} chose two hidden generals`;
      return room;
    }
    if (action === "toggle-general") {
      const slot = Number(data.slot);
      const general = room.boards[playerId].generals[slot];
      if (!general || (slot !== 0 && slot !== 1)) throw new RoomError("Choose a general card first.");
      general.revealed = !general.revealed;
      room.lastAction = `${player.name} ${general.revealed ? "revealed" : "hid"} ${general.name}`;
      return room;
    }
    if (action === "adjust-hp" || action === "adjust-max-hp") {
      const board = room.boards[playerId];
      const delta = Math.sign(Number(data.delta) || 0);
      if (!delta) throw new RoomError("Health did not change.");
      if (action === "adjust-max-hp") {
        board.maxHp = Math.max(1, Math.min(10, board.maxHp + delta));
        board.hp = Math.min(board.hp, board.maxHp);
        room.lastAction = `${player.name} set max health to ${board.maxHp}`;
      } else {
        board.hp = Math.max(0, Math.min(board.maxHp, board.hp + delta));
        room.lastAction = `${player.name} set health to ${board.hp}`;
      }
      return room;
    }
    if (action === "toggle-status") {
      const status = String(data.status ?? "");
      if (status !== "chained" && status !== "faceDown") throw new RoomError("Unknown status.");
      room.boards[playerId][status] = !room.boards[playerId][status];
      room.lastAction = `${player.name} is ${room.boards[playerId][status] ? (status === "chained" ? "chained" : "face down") : "upright"}`;
      return room;
    }
    if (action === "toggle-target") {
      const targetId = String(data.targetPlayerId ?? "");
      const target = requirePlayer(room, targetId);
      if (targetId === playerId) throw new RoomError("Choose another player.");
      const targets = room.targets[playerId] ?? [];
      room.targets[playerId] = targets.includes(targetId) ? targets.filter((id) => id !== targetId) : [...targets, targetId];
      room.lastAction = `${player.name} ${room.targets[playerId].includes(targetId) ? "targeted" : "untargeted"} ${target.name}`;
      return room;
    }
    if (action === "clear-targets") {
      room.targets[playerId] = [];
      room.lastAction = `${player.name} cleared their targets`;
      return room;
    }
    if (action === "set-active") {
      const targetId = String(data.targetPlayerId ?? playerId);
      const target = requirePlayer(room, targetId);
      room.activePlayerId = targetId;
      room.targets[playerId] = [];
      room.lastAction = `${target.name} is now taking a turn`;
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
      room.deck = shuffle(createDeck(room.game));
      room.table = [];
      room.discard = [];
      room.targets = Object.fromEntries(room.players.map((seated) => [seated.id, []]));
      room.activePlayerId = room.players[0]?.id ?? null;
      for (const seated of room.players) {
        room.hands[seated.id] = [];
        const board = room.boards[seated.id];
        board.equipment = [];
        board.judging = [];
        board.chained = false;
        board.faceDown = false;
        board.hp = board.maxHp;
      }
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
      room.deck = shuffle(createDeck(room.game));
      room.table = [];
      room.discard = [];
      room.targets = Object.fromEntries(room.players.map((seated) => [seated.id, []]));
      room.activePlayerId = room.players[0]?.id ?? null;
      for (const seated of room.players) {
        room.hands[seated.id] = [];
        const board = room.boards[seated.id];
        board.equipment = [];
        board.judging = [];
        board.chained = false;
        board.faceDown = false;
        board.hp = board.maxHp;
      }
      room.lastAction = `${player.name} reset the table`;
      return room;
    }
    throw new RoomError("Unknown table action.");
  });
  return publicRoom(state, playerId);
}
