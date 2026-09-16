import { neon } from "@neondatabase/serverless";

import { cleanName, createDeck, createPlayerBoard, GameMode, normalizeRoomState, playerColors, PlayingCard, publicRoom, RoomState, seatJoinOrder, shuffle, TableCard, TokenColor } from "@/lib/game";
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

function newPlayer(id: string, name: string, index: number, occupiedSeats: number[] = []) {
  const seat = seatJoinOrder.find((candidate) => !occupiedSeats.includes(candidate)) ?? index;
  return { id, name, color: playerColors[index % playerColors.length], seat, joinedAt: Date.now() };
}

function toPlayingCard(card: TableCard): PlayingCard {
  return { id: card.id, rank: card.rank, suit: card.suit, cardType: card.cardType, name: card.name, asset: card.asset };
}

function clampPosition(value: unknown, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(4, Math.min(96, number)) : fallback;
}

function topLayer(room: RoomState) {
  return Math.max(0, ...room.table.map((card) => card.zIndex), ...room.tokens.map((token) => token.zIndex), ...room.piles.map((pile) => pile.zIndex)) + 1;
}

function tableCard(room: RoomState, card: PlayingCard, playerId: string, data: Record<string, unknown> = {}): TableCard {
  const spread = room.table.length % 5;
  return {
    ...card,
    playedBy: playerId,
    playedAt: Date.now(),
    x: clampPosition(data.x, 44 + spread * 3),
    y: clampPosition(data.y, 48 + (spread % 2) * 4),
    rotation: Math.max(-180, Math.min(180, Number(data.rotation) || 0)),
    faceDown: Boolean(data.faceDown),
    zIndex: topLayer(room),
  };
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
      tokens: [],
      piles: [],
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
    room.players.push(newPlayer(playerId, name, room.players.length, room.players.map((player) => player.seat)));
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
        room.table.push(tableCard(room, card, playerId, data));
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
      else if (destination === "table") room.table.push(tableCard(room, card, playerId, data));
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
      if (!room.table.length && !room.tokens.length && !room.piles.length) throw new RoomError("The canvas is already empty.", 409);
      room.discard.push(...room.table.map(toPlayingCard));
      room.discard.push(...room.piles.flatMap((pile) => pile.cards.map(toPlayingCard)));
      room.table = [];
      room.tokens = [];
      room.piles = [];
      room.lastAction = `${player.name} cleared the canvas`;
      return room;
    }
    if (action === "move-table-item") {
      const itemType = String(data.itemType ?? "card");
      const itemId = String(data.itemId ?? "");
      const item = itemType === "token" ? room.tokens.find((token) => token.id === itemId) : itemType === "pile" ? room.piles.find((pile) => pile.id === itemId) : room.table.find((card) => card.id === itemId);
      if (!item) throw new RoomError("That item is no longer on the canvas.", 409);
      item.x = clampPosition(data.x, item.x);
      item.y = clampPosition(data.y, item.y);
      item.zIndex = topLayer(room);
      room.lastAction = `${player.name} moved an item`;
      return room;
    }
    if (action === "move-table-items") {
      const moves = Array.isArray(data.moves) ? data.moves.slice(0, 100) : [];
      let moved = 0;
      for (const move of moves) {
        if (!move || typeof move !== "object") continue;
        const values = move as Record<string, unknown>;
        const card = room.table.find((item) => item.id === String(values.id ?? ""));
        if (!card) continue;
        card.x = clampPosition(values.x, card.x);
        card.y = clampPosition(values.y, card.y);
        card.zIndex = topLayer(room);
        moved += 1;
      }
      if (!moved) throw new RoomError("Those cards are no longer on the canvas.", 409);
      room.lastAction = `${player.name} moved ${moved} cards`;
      return room;
    }
    if (action === "table-card-action") {
      const requestedIds = Array.isArray(data.cardIds) ? data.cardIds.map(String) : [String(data.cardId ?? "")];
      const cardIds = new Set(requestedIds);
      const cards = room.table.filter((card) => cardIds.has(card.id));
      if (!cards.length) throw new RoomError("Those cards are no longer on the canvas.", 409);
      const cardAction = String(data.cardAction ?? "");
      if (cardAction === "flip") cards.forEach((card) => { card.faceDown = !card.faceDown; });
      else if (cardAction === "rotate-left") cards.forEach((card) => { card.rotation = ((card.rotation - 15 + 180) % 360 + 360) % 360 - 180; });
      else if (cardAction === "rotate-right") cards.forEach((card) => { card.rotation = ((card.rotation + 15 + 180) % 360 + 360) % 360 - 180; });
      else if (cardAction === "front") cards.forEach((card) => { card.zIndex = topLayer(room); });
      else if (cardAction === "hand") {
        room.table = room.table.filter((card) => !cardIds.has(card.id));
        room.hands[playerId].push(...cards.map(toPlayingCard));
      } else if (cardAction === "discard") {
        room.table = room.table.filter((card) => !cardIds.has(card.id));
        room.discard.push(...cards.map(toPlayingCard));
      } else throw new RoomError("Unknown card action.");
      room.lastAction = `${player.name} adjusted ${cards.length === 1 ? "a card" : `${cards.length} cards`} on the canvas`;
      return room;
    }
    if (action === "make-pile") {
      const ids = new Set(Array.isArray(data.cardIds) ? data.cardIds.map(String) : []);
      const cards = room.table.filter((card) => ids.has(card.id)).sort((a, b) => a.zIndex - b.zIndex);
      if (cards.length < 2) throw new RoomError("Select at least two cards to make a pile.");
      room.table = room.table.filter((card) => !ids.has(card.id));
      const centerX = cards.reduce((sum, card) => sum + card.x, 0) / cards.length;
      const centerY = cards.reduce((sum, card) => sum + card.y, 0) / cards.length;
      room.piles.push({ id: crypto.randomUUID(), label: cleanName(data.label).slice(0, 18) || "Card pile", cards, faceDown: data.faceDown !== false, x: centerX, y: centerY, rotation: 0, zIndex: topLayer(room), createdBy: playerId, createdAt: Date.now() });
      room.lastAction = `${player.name} stacked ${cards.length} cards into a pile`;
      return room;
    }
    if (action === "pile-action") {
      const pileIndex = room.piles.findIndex((pile) => pile.id === String(data.pileId ?? ""));
      if (pileIndex < 0) throw new RoomError("That pile is no longer on the canvas.", 409);
      const pile = room.piles[pileIndex];
      const pileAction = String(data.pileAction ?? "");
      if (pileAction === "shuffle") pile.cards = shuffle(pile.cards);
      else if (pileAction === "flip") pile.faceDown = !pile.faceDown;
      else if (pileAction === "front") pile.zIndex = topLayer(room);
      else if (pileAction === "draw" || pileAction === "play-top") {
        const card = pile.cards.pop();
        if (!card) throw new RoomError("That pile is empty.", 409);
        if (pileAction === "draw") room.hands[playerId].push(toPlayingCard(card));
        else room.table.push({ ...card, playedBy: playerId, playedAt: Date.now(), x: clampPosition(data.x, pile.x + 8), y: clampPosition(data.y, pile.y + 4), faceDown: Boolean(data.faceDown), zIndex: topLayer(room) });
        if (!pile.cards.length) room.piles.splice(pileIndex, 1);
      } else if (pileAction === "spread") {
        room.piles.splice(pileIndex, 1);
        pile.cards.forEach((card, index) => room.table.push({ ...card, x: clampPosition(pile.x + (index - (pile.cards.length - 1) / 2) * 5, pile.x), y: clampPosition(pile.y + (index % 2) * 3, pile.y), rotation: (index - (pile.cards.length - 1) / 2) * 4, faceDown: pile.faceDown, zIndex: topLayer(room) }));
      } else if (pileAction === "discard") {
        room.piles.splice(pileIndex, 1);
        room.discard.push(...pile.cards.map(toPlayingCard));
      } else throw new RoomError("Unknown pile action.");
      const pileVerb = pileAction === "draw" ? "drew from" : pileAction === "play-top" ? "played from" : pileAction === "spread" ? "spread" : pileAction === "discard" ? "discarded" : pileAction === "shuffle" ? "shuffled" : pileAction === "flip" ? "flipped" : "moved";
      room.lastAction = `${player.name} ${pileVerb} ${pile.label}`;
      return room;
    }
    if (action === "add-cards-to-pile") {
      const pile = room.piles.find((item) => item.id === String(data.pileId ?? ""));
      if (!pile) throw new RoomError("That pile is no longer on the canvas.", 409);
      const ids = new Set(Array.isArray(data.cardIds) ? data.cardIds.map(String) : []);
      const cards = room.table.filter((card) => ids.has(card.id)).sort((a, b) => a.zIndex - b.zIndex);
      if (!cards.length) throw new RoomError("Select cards to add to the pile.");
      room.table = room.table.filter((card) => !ids.has(card.id));
      pile.cards.push(...cards);
      pile.zIndex = topLayer(room);
      room.lastAction = `${player.name} added ${cards.length} ${cards.length === 1 ? "card" : "cards"} to ${pile.label}`;
      return room;
    }
    if (action === "add-token") {
      const allowedColors: TokenColor[] = ["gold", "coral", "mint", "blue", "ink"];
      const requestedColor = String(data.color ?? "gold") as TokenColor;
      const label = cleanName(data.label).slice(0, 12) || "Counter";
      room.tokens.push({
        id: crypto.randomUUID(),
        label,
        value: Math.max(-99, Math.min(999, Number(data.value) || 1)),
        color: allowedColors.includes(requestedColor) ? requestedColor : "gold",
        x: clampPosition(data.x, 50),
        y: clampPosition(data.y, 54),
        zIndex: topLayer(room),
        createdBy: playerId,
        createdAt: Date.now(),
      });
      room.lastAction = `${player.name} added a ${label.toLowerCase()}`;
      return room;
    }
    if (action === "adjust-token") {
      const token = room.tokens.find((item) => item.id === String(data.tokenId ?? ""));
      if (!token) throw new RoomError("That counter is no longer on the canvas.", 409);
      const delta = Math.max(-10, Math.min(10, Number(data.delta) || 0));
      token.value = Math.max(-99, Math.min(999, token.value + delta));
      token.zIndex = topLayer(room);
      room.lastAction = `${player.name} set ${token.label} to ${token.value}`;
      return room;
    }
    if (action === "remove-token") {
      const index = room.tokens.findIndex((token) => token.id === String(data.tokenId ?? ""));
      if (index < 0) throw new RoomError("That counter is no longer on the canvas.", 409);
      const [token] = room.tokens.splice(index, 1);
      room.lastAction = `${player.name} removed ${token.label}`;
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
      room.tokens = [];
      room.piles = [];
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
      room.tokens = [];
      room.piles = [];
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
