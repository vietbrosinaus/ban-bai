import { neon } from "@neondatabase/serverless";

import { cleanName, createDeck, createGeneralPile, createPlayerBoard, GameMode, generalToPlayingCard, GENERAL_PILE_ID, normalizeRoomState, playerColors, type PlayerCursor, PlayingCard, publicRoom, RoomState, seatJoinOrder, shuffle, TableCard, TokenColor } from "@/lib/game";

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
  return { id: card.id, rank: card.rank, suit: card.suit, cardType: card.cardType, name: card.name, asset: card.asset, faction: card.faction, maxHp: card.maxHp };
}

function initialPiles(game: GameMode, createdBy: string) {
  return game === "tam-quoc-sat" ? [createGeneralPile(createdBy)] : [];
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

export async function getRoomCursors(code: string): Promise<Record<string, PlayerCursor>> {
  const rows = await database().query(`
    SELECT presence.player_id, presence.x, presence.y, presence.activity, presence.updated_at
    FROM room_presence AS presence
    JOIN rooms ON rooms.code = presence.room_code
    WHERE presence.room_code = $1
      AND presence.visible = true
      AND presence.updated_at > $2
      AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(rooms.state->'players') AS seated
        WHERE seated->>'id' = presence.player_id
      )
  `, [code, Date.now() - 5000]) as Array<{ player_id: string; x: number; y: number; activity: PlayerCursor["activity"]; updated_at: number }>;
  return Object.fromEntries(rows.map((row) => [row.player_id, { x: Number(row.x), y: Number(row.y), activity: row.activity, updatedAt: Number(row.updated_at) }]));
}

export async function updateRoomCursor(code: string, playerId: string, data: Record<string, unknown>) {
  const allowedActivities: PlayerCursor["activity"][] = ["table", "card", "pile", "deck", "controls"];
  const requestedActivity = String(data.activity ?? "table") as PlayerCursor["activity"];
  const activity = allowedActivities.includes(requestedActivity) ? requestedActivity : "table";
  const x = Math.max(0, Math.min(100, Number(data.x) || 0));
  const y = Math.max(0, Math.min(100, Number(data.y) || 0));
  const visible = data.visible !== false;
  const rows = await database().query(`
    INSERT INTO room_presence (room_code, player_id, x, y, activity, visible, updated_at)
    SELECT $1, $2, $3, $4, $5, $6, $7
    WHERE EXISTS (
      SELECT 1 FROM rooms, jsonb_array_elements(rooms.state->'players') AS seated
      WHERE rooms.code = $1 AND seated->>'id' = $2
    )
    ON CONFLICT (room_code, player_id) DO UPDATE SET
      x = EXCLUDED.x,
      y = EXCLUDED.y,
      activity = EXCLUDED.activity,
      visible = EXCLUDED.visible,
      updated_at = EXCLUDED.updated_at
    RETURNING player_id
  `, [code, playerId, x, y, activity, visible, Date.now()]);
  if (!rows.length) throw new RoomError("Join the room before playing.", 403);
  return { ok: true };
}

export async function createRoom(nameValue: unknown, gameValue?: unknown) {
  const name = cleanName(nameValue);
  if (!name) throw new RoomError("Please enter your name.");
  const game: GameMode = gameValue === "tam-quoc-sat" ? "tam-quoc-sat" : "sandbox-52";
  const playerId = crypto.randomUUID();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = roomCode();
    const now = Date.now();
    const openedMessage = `${name} opened the table`;
    const state: RoomState = {
      code,
      hostId: playerId,
      game,
      players: [newPlayer(playerId, name, 0)],
      hands: { [playerId]: [] },
      deck: shuffle(createDeck(game)),
      table: [],
      tokens: [],
      piles: initialPiles(game, playerId),
      discard: [],
      boards: { [playerId]: createPlayerBoard() },
      targets: { [playerId]: [] },
      generalDeckInitialized: true,
      revision: 1,
      updatedAt: now,
      lastAction: openedMessage,
      activityLog: [{ id: crypto.randomUUID(), actorId: playerId, message: openedMessage, createdAt: now }],
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

async function mutateRoom(code: string, actorId: string, update: (state: RoomState) => RoomState) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const row = await readRow(code);
    if (!row) throw new RoomError("That room does not exist.", 404);
    const current = decodeState(row.state);
    const next = update(structuredClone(current));
    if (next.lastAction) next.activityLog = [...next.activityLog, { id: crypto.randomUUID(), actorId, message: next.lastAction, createdAt: Date.now() }].slice(-100);
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
  const state = await mutateRoom(code, playerId, (room) => {
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
  const state = await mutateRoom(code, playerId, (room) => {
    const player = requirePlayer(room, playerId);
    if (action === "kick-player") {
      requireHost(room, playerId);
      const targetPlayerId = String(data.targetPlayerId ?? "");
      if (targetPlayerId === playerId) throw new RoomError("You cannot remove yourself from the table.");
      const targetIndex = room.players.findIndex((seated) => seated.id === targetPlayerId);
      if (targetIndex < 0) throw new RoomError("That player is no longer at the table.", 409);
      const [target] = room.players.splice(targetIndex, 1);
      const board = room.boards[targetPlayerId];
      const returnedCards = [
        ...(room.hands[targetPlayerId] ?? []),
        ...(board?.generals.flatMap((general) => general ? [generalToPlayingCard(general)] : []) ?? []),
      ];
      const generalCards = returnedCards.filter((card) => card.cardType === "general");
      const deckCards = returnedCards.filter((card) => card.cardType !== "general");
      if (deckCards.length) room.deck = shuffle([...room.deck, ...deckCards]);
      if (generalCards.length) {
        let generalPile = room.piles.find((pile) => pile.id === GENERAL_PILE_ID);
        if (!generalPile) {
          generalPile = createGeneralPile(playerId);
          generalPile.cards = [];
          room.piles.push(generalPile);
        }
        const now = Date.now();
        generalPile.cards.push(...generalCards.map((card, index) => ({
          ...card,
          playedBy: targetPlayerId,
          playedAt: now,
          x: generalPile.x,
          y: generalPile.y,
          rotation: 0,
          faceDown: true,
          zIndex: generalPile.cards.length + index + 1,
        })));
        generalPile.cards = shuffle(generalPile.cards);
        generalPile.faceDown = true;
      }
      delete room.hands[targetPlayerId];
      delete room.boards[targetPlayerId];
      delete room.targets[targetPlayerId];
      for (const seated of room.players) room.targets[seated.id] = (room.targets[seated.id] ?? []).filter((id) => id !== targetPlayerId);
      room.lastAction = `${player.name} removed ${target.name} from the table`;
      return room;
    }
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
      if (destination === "discard") {
        room.discard.push(card);
        room.lastAction = `${player.name} discarded ${card.name ?? card.rank}`;
      } else if (destination === "player") {
        const targetId = String(data.targetPlayerId ?? "");
        const target = requirePlayer(room, targetId);
        if (targetId === playerId) throw new RoomError("Choose another player.");
        room.hands[targetId].push(card);
        room.lastAction = `${player.name} gave a card to ${target.name}`;
      } else if (destination === "table") {
        room.table.push(tableCard(room, card, playerId, data));
        room.lastAction = `${player.name} played ${card.name ?? card.rank}`;
      } else throw new RoomError("Unknown card destination.");
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
    if (action === "take-discard") {
      const index = room.discard.findIndex((card) => card.id === String(data.cardId ?? ""));
      if (index < 0) throw new RoomError("That card is no longer in the discard pile.", 409);
      const [card] = room.discard.splice(index, 1);
      room.hands[playerId].push(card);
      room.lastAction = `${player.name} retrieved ${card.name ?? card.rank} from discard`;
      return room;
    }
    if (action === "clear-table") {
      requireHost(room, playerId);
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
      const tableCards = room.table.filter((card) => ids.has(card.id)).sort((a, b) => a.zIndex - b.zIndex);
      const handCards = room.hands[playerId].filter((card) => ids.has(card.id)).map((card) => tableCard(room, card, playerId, { x: pile.x, y: pile.y, faceDown: pile.faceDown }));
      const cards = [...tableCards, ...handCards];
      if (!cards.length) throw new RoomError("Select cards to add to the pile.");
      room.table = room.table.filter((card) => !ids.has(card.id));
      room.hands[playerId] = room.hands[playerId].filter((card) => !ids.has(card.id));
      const placement = data.placement === "random" ? "random" : "top";
      if (placement === "random") {
        for (const card of cards) {
          const sample = new Uint32Array(1);
          crypto.getRandomValues(sample);
          pile.cards.splice(sample[0] % (pile.cards.length + 1), 0, card);
        }
      } else pile.cards.push(...cards);
      pile.zIndex = topLayer(room);
      room.lastAction = `${player.name} added ${cards.length} ${cards.length === 1 ? "card" : "cards"} ${placement === "random" ? "randomly into" : "to the top of"} ${pile.label}`;
      return room;
    }
    if (action === "add-cards-to-deck") {
      const ids = new Set(Array.isArray(data.cardIds) ? data.cardIds.map(String) : []);
      const tableCards = room.table.filter((card) => ids.has(card.id));
      const handCards = room.hands[playerId].filter((card) => ids.has(card.id));
      const cards = [...tableCards.map(toPlayingCard), ...handCards];
      if (!cards.length) throw new RoomError("Select cards to return to the deck.");
      if (cards.some((card) => card.cardType === "general")) throw new RoomError("Return general cards to the general pile.");
      room.table = room.table.filter((card) => !ids.has(card.id));
      room.hands[playerId] = room.hands[playerId].filter((card) => !ids.has(card.id));
      const placement = data.placement === "random" ? "random" : "top";
      if (placement === "random") {
        for (const card of cards) {
          const sample = new Uint32Array(1);
          crypto.getRandomValues(sample);
          room.deck.splice(sample[0] % (room.deck.length + 1), 0, card);
        }
      } else room.deck.push(...cards);
      room.lastAction = `${player.name} returned ${cards.length} ${cards.length === 1 ? "card" : "cards"} ${placement === "random" ? "randomly into" : "to the top of"} the deck`;
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
      if (status !== "faceDown") throw new RoomError("Unknown status.");
      room.boards[playerId].faceDown = !room.boards[playerId].faceDown;
      room.lastAction = `${player.name} is ${room.boards[playerId].faceDown ? "face down" : "upright"}`;
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
    if (action === "shuffle") {
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
      room.piles = initialPiles(room.game, playerId);
      room.discard = [];
      room.targets = Object.fromEntries(room.players.map((seated) => [seated.id, []]));
      for (const seated of room.players) {
        room.hands[seated.id] = [];
        const board = room.boards[seated.id];
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
      room.piles = initialPiles(room.game, playerId);
      room.discard = [];
      room.targets = Object.fromEntries(room.players.map((seated) => [seated.id, []]));
      for (const seated of room.players) {
        room.hands[seated.id] = [];
        const board = room.boards[seated.id];
        board.faceDown = false;
        board.hp = board.maxHp;
      }
      room.lastAction = `${player.name} reset the table`;
      return room;
    }
    throw new RoomError("Unknown table action.");
  });
  if (action === "kick-player") await database().query("DELETE FROM room_presence WHERE room_code = $1 AND player_id = $2", [code, String(data.targetPlayerId ?? "")]);
  return publicRoom(state, playerId);
}
