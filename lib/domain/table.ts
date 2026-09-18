import type { CardId, CardRef, Counter, Piece, Point, Seat, SeatRole } from "./card";
import { starterPieces, type TableDeck } from "./setup";

export type PieceTag = "generals" | "deck" | "discard" | "seat";

export type TablePiece = Piece & {
  tag?: PieceTag;
  ownerId?: string;
  spread?: boolean;
};

export type LogEntry = {
  id: number;
  actorId: string;
  text: string;
};

export type TableState = {
  code: string;
  hostId: string;
  deck: TableDeck;
  ringSize: number;
  seats: Seat[];
  pieces: TablePiece[];
  hands: Record<string, CardRef[]>;
  counters: Counter[];
  revision: number;
  log: LogEntry[];
};

export type Command =
  | { type: "join"; seatId: string; name: string; role: SeatRole }
  | { type: "leave"; seatId: string }
  | { type: "move"; pieceId: string; x: number; y: number }
  | { type: "lift"; pieceId: string }
  | { type: "rotate"; pieceId: string; degrees: number }
  | { type: "flipTop"; pieceId: string }
  | { type: "flipAll"; pieceId: string }
  | { type: "shuffle"; pieceId: string }
  | { type: "spread"; pieceId: string }
  | { type: "split"; pieceId: string; count: number; x: number; y: number }
  | { type: "merge"; pieceId: string; ontoId: string }
  | { type: "takeToHand"; pieceId: string; count: number }
  | { type: "playToTable"; cardId: CardId; x: number; y: number; faceUp: boolean }
  | { type: "playOntoPiece"; cardId: CardId; pieceId: string; faceUp: boolean }
  | { type: "giveToSeat"; cardId: CardId; seatId: string }
  | { type: "addCounter"; label: string; value: number; x: number; y: number; ownerId?: string }
  | { type: "adjustCounter"; counterId: string; delta: number }
  | { type: "removeCounter"; counterId: string }
  | { type: "dealToAll"; count: number }
  | { type: "gather" }
  | { type: "compactRing" }
  | { type: "reset" };

export type CommandContext = {
  actorId: string;
  now: number;
  shuffle: <T>(items: T[]) => T[];
  id: () => string;
};

export class RuleError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

const clamp = (value: number) => Math.min(0.97, Math.max(0.03, value));

function seatOf(state: TableState, seatId: string) {
  const seat = state.seats.find((item) => item.id === seatId);
  if (!seat) throw new RuleError("Vào bàn trước đã.", 403);
  return seat;
}

const SPECTATOR_SAFE = new Set(["join", "leave"]);

function requirePlayer(state: TableState, seatId: string) {
  const seat = seatOf(state, seatId);
  if (seat.role === "spectator") throw new RuleError("Bạn đang xem, không cầm bài được.", 403);
  return seat;
}

function pieceOf(state: TableState, pieceId: string) {
  const piece = state.pieces.find((item) => item.id === pieceId);
  if (!piece) throw new RuleError("That is not on the table any more.", 409);
  return piece;
}

function requireHost(state: TableState, actorId: string) {
  if (state.hostId !== actorId) throw new RuleError("Only the host can do that.", 403);
}

function note(state: TableState, actorId: string, text: string): TableState {
  return { ...state, log: [...state.log.slice(-40), { id: state.revision + 1, actorId, text }] };
}

function withPieces(state: TableState, pieces: TablePiece[]) {
  return { ...state, pieces };
}

function replacePiece(pieces: TablePiece[], piece: TablePiece) {
  return pieces.map((item) => (item.id === piece.id ? piece : item));
}

function dropPiece(pieces: TablePiece[], pieceId: string) {
  return pieces.filter((item) => item.id !== pieceId);
}

function topToBottom(cards: CardRef[]) {
  return [...cards].reverse().map((card) => ({ ...card, faceUp: !card.faceUp }));
}

function countLabel(count: number) {
  return count === 1 ? "1 lá" : `${count} lá`;
}

export function pieceLabel(piece: TablePiece) {
  if (piece.label) return piece.label;
  if (piece.cards.length > 1) return `chồng ${countLabel(piece.cards.length)}`;
  return "một lá";
}

export function applyCommand(state: TableState, command: Command, ctx: CommandContext): TableState {
  if (!SPECTATOR_SAFE.has(command.type)) requirePlayer(state, ctx.actorId);
  const next = route(state, command, ctx);
  return { ...next, revision: state.revision + 1 };
}

function route(state: TableState, command: Command, ctx: CommandContext): TableState {
  switch (command.type) {
    case "join": {
      if (state.seats.some((seat) => seat.id === command.seatId)) return state;
      const players = state.seats.filter((seat) => seat.role === "player");
      if (command.role === "spectator") {
        const seat: Seat = { id: command.seatId, name: command.name, colour: "#9aa7a1", index: -1, handCount: 0, role: "spectator" };
        return note({ ...state, seats: [...state.seats, seat] }, command.seatId, `${command.name} vào xem`);
      }
      if (players.length >= MAX_PLAYERS) throw new RuleError("Bàn đã đủ 10 người, bạn có thể vào xem.", 409);
      const taken = new Set(players.map((seat) => seat.index));
      let index = 0;
      while (taken.has(index)) index += 1;
      const seat: Seat = { id: command.seatId, name: command.name, colour: SEAT_COLOURS[index % SEAT_COLOURS.length], index, handCount: 0, role: "player" };
      return note({
        ...state,
        ringSize: Math.max(state.ringSize, index + 1, players.length + 1),
        seats: [...state.seats, seat],
        hands: { ...state.hands, [seat.id]: [] },
      }, command.seatId, `${command.name} ngồi vào ghế ${index + 1}`);
    }

    case "leave": {
      const hands = { ...state.hands };
      delete hands[command.seatId];
      return { ...state, seats: state.seats.filter((seat) => seat.id !== command.seatId), hands };
    }

    case "compactRing": {
      requireHost(state, ctx.actorId);
      return note({ ...state, ...compactRing(state) }, ctx.actorId, "xếp lại chỗ ngồi");
    }

    case "move": {
      const piece = pieceOf(state, command.pieceId);
      return withPieces(state, replacePiece(state.pieces, { ...piece, x: clamp(command.x), y: clamp(command.y) }));
    }

    case "lift": {
      const piece = pieceOf(state, command.pieceId);
      return withPieces(state, [...dropPiece(state.pieces, piece.id), piece]);
    }

    case "rotate": {
      const piece = pieceOf(state, command.pieceId);
      return withPieces(state, replacePiece(state.pieces, { ...piece, rotation: (piece.rotation + command.degrees + 360) % 360 }));
    }

    case "flipTop": {
      const piece = pieceOf(state, command.pieceId);
      if (!piece.cards.length) return state;
      const top = piece.cards.length - 1;
      const cards = piece.cards.map((card, index) => (index === top ? { ...card, faceUp: !card.faceUp } : card));
      return note(withPieces(state, replacePiece(state.pieces, { ...piece, cards })), ctx.actorId, `lật lá trên ${pieceLabel(piece)}`);
    }

    case "flipAll": {
      const piece = pieceOf(state, command.pieceId);
      if (piece.cards.length < 2) return state;
      return note(withPieces(state, replacePiece(state.pieces, { ...piece, cards: topToBottom(piece.cards) })), ctx.actorId, `lật cả ${pieceLabel(piece)}`);
    }

    case "shuffle": {
      const piece = pieceOf(state, command.pieceId);
      if (piece.cards.length < 2) return state;
      return note(withPieces(state, replacePiece(state.pieces, { ...piece, cards: ctx.shuffle(piece.cards) })), ctx.actorId, `xào ${pieceLabel(piece)}`);
    }

    case "spread": {
      const piece = pieceOf(state, command.pieceId);
      if (piece.cards.length < 2) return state;
      const taken = piece.cards.slice(-Math.min(piece.cards.length, 8));
      const rest = piece.cards.slice(0, piece.cards.length - taken.length);
      const spread = taken.map((card, index) => ({
        id: ctx.id(),
        x: clamp(piece.x + (index + 1) * 0.055),
        y: piece.y,
        rotation: piece.rotation,
        cards: [card],
      }));
      const base = rest.length || piece.tag ? replacePiece(state.pieces, { ...piece, cards: rest }) : dropPiece(state.pieces, piece.id);
      return note(withPieces(state, [...base, ...spread]), ctx.actorId, `trải ${countLabel(taken.length)} từ ${pieceLabel(piece)}`);
    }

    case "split": {
      const piece = pieceOf(state, command.pieceId);
      const count = Math.max(1, Math.min(command.count, piece.cards.length));
      if (count >= piece.cards.length && !piece.tag) return route(state, { type: "move", pieceId: piece.id, x: command.x, y: command.y }, ctx);
      const taken = piece.cards.slice(-count);
      const rest = piece.cards.slice(0, piece.cards.length - count);
      const born: TablePiece = { id: ctx.id(), x: clamp(command.x), y: clamp(command.y), rotation: piece.rotation, cards: taken };
      return note(withPieces(state, [...replacePiece(state.pieces, { ...piece, cards: rest }), born]), ctx.actorId, `lấy ${countLabel(count)} từ ${pieceLabel(piece)}`);
    }

    case "merge": {
      const from = pieceOf(state, command.pieceId);
      const onto = pieceOf(state, command.ontoId);
      if (from.id === onto.id) return state;
      const merged: TablePiece = { ...onto, cards: [...onto.cards, ...from.cards] };
      const base = from.tag ? replacePiece(state.pieces, { ...from, cards: [] }) : dropPiece(state.pieces, from.id);
      return note(withPieces(state, replacePiece(base, merged)), ctx.actorId, `đặt ${pieceLabel(from)} lên ${pieceLabel(onto)}`);
    }

    case "takeToHand": {
      const piece = pieceOf(state, command.pieceId);
      requirePlayer(state, ctx.actorId);
      const count = Math.max(1, Math.min(command.count, piece.cards.length));
      if (!count) return state;
      const taken = piece.cards.slice(-count).map((card) => ({ ...card, faceUp: true }));
      const rest = piece.cards.slice(0, piece.cards.length - count);
      const hands = { ...state.hands, [ctx.actorId]: [...(state.hands[ctx.actorId] ?? []), ...taken] };
      const base = rest.length || piece.tag ? replacePiece(state.pieces, { ...piece, cards: rest }) : dropPiece(state.pieces, piece.id);
      return note({ ...withPieces(state, base), hands }, ctx.actorId, `cầm ${countLabel(count)} từ ${pieceLabel(piece)}`);
    }

    case "playToTable": {
      const hand = state.hands[ctx.actorId] ?? [];
      const card = hand.find((item) => item.id === command.cardId);
      if (!card) throw new RuleError("That card is not in your hand.", 409);
      const born: TablePiece = { id: ctx.id(), x: clamp(command.x), y: clamp(command.y), rotation: 0, cards: [{ id: card.id, faceUp: command.faceUp }] };
      const hands = { ...state.hands, [ctx.actorId]: hand.filter((item) => item.id !== card.id) };
      return note({ ...withPieces(state, [...state.pieces, born]), hands }, ctx.actorId, command.faceUp ? "đánh một lá ngửa" : "đánh một lá úp");
    }

    case "playOntoPiece": {
      const hand = state.hands[ctx.actorId] ?? [];
      const card = hand.find((item) => item.id === command.cardId);
      if (!card) throw new RuleError("That card is not in your hand.", 409);
      const piece = pieceOf(state, command.pieceId);
      const hands = { ...state.hands, [ctx.actorId]: hand.filter((item) => item.id !== card.id) };
      const merged = { ...piece, cards: [...piece.cards, { id: card.id, faceUp: command.faceUp }] };
      return note({ ...withPieces(state, replacePiece(state.pieces, merged)), hands }, ctx.actorId, `đặt một lá lên ${pieceLabel(piece)}`);
    }

    case "giveToSeat": {
      const hand = state.hands[ctx.actorId] ?? [];
      const card = hand.find((item) => item.id === command.cardId);
      if (!card) throw new RuleError("That card is not in your hand.", 409);
      const target = seatOf(state, command.seatId);
      const hands = {
        ...state.hands,
        [ctx.actorId]: hand.filter((item) => item.id !== card.id),
        [target.id]: [...(state.hands[target.id] ?? []), { ...card, faceUp: true }],
      };
      return note({ ...state, hands }, ctx.actorId, `đưa một lá cho ${target.name}`);
    }

    case "addCounter": {
      const counter: Counter = { id: ctx.id(), label: command.label.slice(0, 12), value: command.value, x: clamp(command.x), y: clamp(command.y), ownerId: command.ownerId };
      return { ...state, counters: [...state.counters, counter] };
    }

    case "adjustCounter": {
      return { ...state, counters: state.counters.map((counter) => (counter.id === command.counterId ? { ...counter, value: counter.value + command.delta } : counter)) };
    }

    case "removeCounter": {
      return { ...state, counters: state.counters.filter((counter) => counter.id !== command.counterId) };
    }

    case "dealToAll": {
      requireHost(state, ctx.actorId);
      const deck = state.pieces.find((piece) => piece.tag === "deck");
      if (!deck) throw new RuleError("There is no deck on the table.", 409);
      const count = Math.max(1, Math.min(13, command.count));
      const hands = { ...state.hands };
      const cards = [...deck.cards];
      for (let round = 0; round < count; round += 1) {
        for (const seat of state.seats.filter((item) => item.role === "player")) {
          const card = cards.pop();
          if (card) hands[seat.id] = [...(hands[seat.id] ?? []), { ...card, faceUp: true }];
        }
      }
      const pieces = replacePiece(state.pieces, { ...deck, cards });
      return note({ ...withPieces(state, pieces), hands }, ctx.actorId, `chia mỗi người ${countLabel(count)}`);
    }

    case "gather": {
      const deck = state.pieces.find((piece) => piece.tag === "deck");
      if (!deck) return state;
      const loose = state.pieces.filter((piece) => !piece.tag);
      const gathered = loose.flatMap((piece) => piece.cards).map((card) => ({ ...card, faceUp: false }));
      const pieces = state.pieces.filter((piece) => Boolean(piece.tag)).map((piece) => (piece.id === deck.id ? { ...piece, cards: [...piece.cards, ...gathered] } : piece));
      return note(withPieces(state, pieces), ctx.actorId, "dọn bài về chồng bài");
    }

    case "reset": {
      requireHost(state, ctx.actorId);
      return note({
        ...state,
        ...compactRing(state),
        pieces: starterPieces(ctx, state.deck),
        hands: Object.fromEntries(state.seats.filter((seat) => seat.role === "player").map((seat) => [seat.id, []])),
        counters: [],
      }, ctx.actorId, "dọn bàn và chia lại");
    }

    default:
      throw new RuleError("Unknown move.", 400);
  }
}

export const MAX_PLAYERS = 10;

function compactRing(state: TableState): Pick<TableState, "seats" | "ringSize"> {
  const players = state.seats.filter((seat) => seat.role === "player").sort((a, b) => a.index - b.index);
  const seated = players.map((seat, index) => ({ ...seat, index, colour: SEAT_COLOURS[index % SEAT_COLOURS.length] }));
  const spectators = state.seats.filter((seat) => seat.role === "spectator");
  return { seats: [...seated, ...spectators], ringSize: Math.max(seated.length, 1) };
}

export function seatDistance(a: number, b: number, ringSize: number) {
  if (a < 0 || b < 0 || ringSize < 2) return 0;
  const gap = Math.abs(a - b) % ringSize;
  return Math.min(gap, ringSize - gap);
}

export const SEAT_COLOURS = [
  "#f4c95d", "#ff8066", "#65c7ba", "#7aa8ff", "#d49af4",
  "#ffad5a", "#8fd06f", "#ef7da7", "#8fc9ef", "#c7a776",
];

export type TableView = Omit<TableState, "hands"> & {
  viewerId: string;
  isHost: boolean;
  hand: CardRef[];
  handCounts: Record<string, number>;
};

export function viewFor(state: TableState, viewerId: string): TableView {
  const { hands, ...shared } = state;
  return {
    ...shared,
    seats: state.seats.map((seat) => ({ ...seat, handCount: hands[seat.id]?.length ?? 0 })),
    viewerId,
    isHost: state.hostId === viewerId,
    hand: hands[viewerId] ?? [],
    handCounts: Object.fromEntries(state.seats.map((seat) => [seat.id, hands[seat.id]?.length ?? 0])),
  };
}

export function seatPoint(index: number, ringSize: number): Point {
  const angle = (index / Math.max(1, ringSize)) * Math.PI * 2 + Math.PI / 2;
  return { x: 0.5 - Math.cos(angle) * 0.44, y: 0.5 + Math.sin(angle) * 0.40 };
}
