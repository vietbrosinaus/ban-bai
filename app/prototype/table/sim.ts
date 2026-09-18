import { createTamQuocSatDeck } from "@/lib/domain/tam-quoc-sat";
import { tamQuocSatGenerals } from "@/lib/domain/tam-quoc-sat-generals";

export type CardInfo = { id: string; name: string; asset: string; kind: "general" | "play"; sub: string };
export type CardRef = { id: string; faceUp: boolean };
export type PieceTag = "generals" | "deck";
export type Piece = { id: string; x: number; y: number; rot: number; cards: CardRef[]; tag?: PieceTag };
export type Peer = { id: string; name: string; color: string; seat: number; x: number; y: number; grabbing: boolean; handCount: number };
export type TableEvent = { id: number; who: string; text: string };
export type TableState = { pieces: Piece[]; hand: CardRef[]; events: TableEvent[]; peekId: string | null; seq: number };

const suitSymbol: Record<string, string> = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };

export const cards: Record<string, CardInfo> = {};
for (const card of createTamQuocSatDeck()) cards[card.id] = { id: card.id, name: card.name ?? card.rank, asset: card.asset ?? "", kind: "play", sub: `${card.rank}${suitSymbol[card.suit] ?? ""}` };
for (const general of tamQuocSatGenerals) cards[`general-${general.id}`] = { id: `general-${general.id}`, name: general.name, asset: general.asset, kind: "general", sub: `${general.faction.toUpperCase()} ${general.maxHp} HP` };

export const ME = { id: "me", name: "Bạn", color: "#f4c95d", seat: 0 };
export const PEERS: Peer[] = [
  { id: "p1", name: "Minh", color: "#ff8066", seat: 1, x: 0.42, y: 0.28, grabbing: false, handCount: 4 },
  { id: "p2", name: "Lan", color: "#65c7ba", seat: 2, x: 0.7, y: 0.36, grabbing: false, handCount: 3 },
  { id: "p3", name: "Huy", color: "#7aa8ff", seat: 3, x: 0.3, y: 0.5, grabbing: false, handCount: 5 },
  { id: "p4", name: "Trang", color: "#d49af4", seat: 4, x: 0.6, y: 0.6, grabbing: false, handCount: 2 },
];
export const STACK_LABEL: Record<PieceTag, string> = { generals: "Chồng tướng", deck: "Chồng bài" };

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

export function initialState(): TableState {
  const all = Object.values(cards);
  const deck = seededShuffle(all.filter((c) => c.kind === "play").map((c) => ({ id: c.id, faceUp: false })), 7);
  const generals = seededShuffle(all.filter((c) => c.kind === "general").map((c) => ({ id: c.id, faceUp: false })), 11);
  const hand = deck.splice(-4).map((c) => ({ ...c, faceUp: true }));
  return {
    pieces: [
      { id: "generals", x: 0.08, y: 0.3, rot: 0, cards: generals, tag: "generals" },
      { id: "deck", x: 0.08, y: 0.66, rot: 0, cards: deck, tag: "deck" },
    ],
    hand,
    events: [{ id: 1, who: "table", text: "chồng tướng and chồng bài are on the table, everything else you build by hand" }],
    peekId: null,
    seq: 1,
  };
}

export type Action =
  | { type: "move"; id: string; x: number; y: number }
  | { type: "lift"; id: string }
  | { type: "split"; id: string; count: number; newId: string; x: number; y: number; who: string }
  | { type: "merge"; from: string; onto: string; who: string }
  | { type: "flip"; id: string; whole?: boolean; who: string }
  | { type: "rotate"; id: string; delta: number }
  | { type: "shuffle"; id: string; seed: number; who: string }
  | { type: "spread"; id: string; who: string }
  | { type: "draw"; id: string; count: number }
  | { type: "takeAll"; id: string }
  | { type: "play"; cardId: string; x: number; y: number; faceUp: boolean; newId: string }
  | { type: "playOnto"; cardId: string; onto: string; faceUp: boolean }
  | { type: "peek"; id: string | null }
  | { type: "peerDraw"; id: string; who: string }
  | { type: "note"; who: string; text: string };

export function cardLabel(card: CardRef | undefined) {
  if (!card) return "nothing";
  if (!card.faceUp) return "a face-down card";
  return cards[card.id]?.name ?? card.id;
}

export function pieceName(piece: Piece) {
  if (piece.tag) return STACK_LABEL[piece.tag].toLowerCase();
  if (piece.cards.length > 1) return `a stack of ${piece.cards.length}`;
  return cardLabel(piece.cards[0]);
}

const count = (n: number) => `${n} card${n === 1 ? "" : "s"}`;
const clamp = (value: number) => Math.min(0.98, Math.max(0.02, value));

export function reduce(state: TableState, action: Action): TableState {
  const find = (id: string) => state.pieces.find((p) => p.id === id);
  const replace = (pieces: Piece[], piece: Piece) => pieces.map((p) => (p.id === piece.id ? piece : p));
  const without = (pieces: Piece[], id: string) => pieces.filter((p) => p.id !== id);
  const log = (who: string, text: string, next: Partial<TableState>): TableState => ({ ...state, ...next, seq: state.seq + 1, events: [...state.events.slice(-9), { id: state.seq + 1, who, text }] });
  switch (action.type) {
    case "move": {
      const p = find(action.id);
      if (!p) return state;
      return { ...state, pieces: replace(state.pieces, { ...p, x: clamp(action.x), y: clamp(action.y) }) };
    }
    case "lift": {
      const p = find(action.id);
      if (!p || state.pieces[state.pieces.length - 1] === p) return state;
      return { ...state, pieces: [...without(state.pieces, p.id), p] };
    }
    case "split": {
      const p = find(action.id);
      if (!p || p.cards.length <= action.count) return state;
      const taken = p.cards.slice(-action.count);
      const rest = p.cards.slice(0, p.cards.length - action.count);
      return log(action.who, `picked up ${taken.length > 1 ? count(taken.length) : cardLabel(taken[0])} from ${pieceName(p)}`, { pieces: [...replace(state.pieces, { ...p, cards: rest }), { id: action.newId, x: action.x, y: action.y, rot: p.rot, cards: taken }] });
    }
    case "merge": {
      const a = find(action.from);
      const b = find(action.onto);
      if (!a || !b || a.id === b.id) return state;
      return log(action.who, `put ${a.cards.length > 1 ? count(a.cards.length) : cardLabel(a.cards[0])} on ${pieceName(b)}`, { pieces: replace(without(state.pieces, a.id), { ...b, cards: [...b.cards, ...a.cards] }) });
    }
    case "flip": {
      const p = find(action.id);
      if (!p || !p.cards.length) return state;
      const top = p.cards.length - 1;
      const flipped = action.whole ? [...p.cards].reverse().map((c) => ({ ...c, faceUp: !c.faceUp })) : p.cards.map((c, i) => (i === top ? { ...c, faceUp: !c.faceUp } : c));
      const text = action.whole && p.cards.length > 1 ? `flipped ${pieceName(p)} over` : flipped[top].faceUp ? `turned ${cardLabel(flipped[top])} face up` : `turned ${cardLabel(p.cards[top])} face down`;
      return log(action.who, text, { pieces: replace(state.pieces, { ...p, cards: flipped }) });
    }
    case "rotate": {
      const p = find(action.id);
      if (!p) return state;
      return { ...state, pieces: replace(state.pieces, { ...p, rot: (p.rot + action.delta + 360) % 360 }) };
    }
    case "shuffle": {
      const p = find(action.id);
      if (!p || p.cards.length < 2) return state;
      return log(action.who, `shuffled ${pieceName(p)}`, { pieces: replace(state.pieces, { ...p, cards: seededShuffle(p.cards, action.seed) }) });
    }
    case "spread": {
      const p = find(action.id);
      if (!p || p.cards.length < 2) return state;
      const n = Math.min(p.cards.length, 8);
      const taken = p.cards.slice(-n);
      const rest = p.cards.slice(0, p.cards.length - n);
      const spread = taken.map((c, i) => ({ id: `${p.id}-${state.seq}-${i}`, x: clamp(p.x + (i + 1) * 0.052), y: p.y, rot: p.rot, cards: [c] }));
      return log(action.who, `spread ${count(n)} from ${pieceName(p)}`, { pieces: [...(rest.length || p.tag ? replace(state.pieces, { ...p, cards: rest }) : without(state.pieces, p.id)), ...spread] });
    }
    case "draw": {
      const p = find(action.id);
      const n = Math.min(action.count, p?.cards.length ?? 0);
      if (!p || n === 0) return state;
      const taken = p.cards.slice(-n).map((c) => ({ ...c, faceUp: true }));
      const rest = p.cards.slice(0, p.cards.length - n);
      return log("you", `took ${count(n)} from ${pieceName(p)} into your hand`, { hand: [...state.hand, ...taken], pieces: rest.length || p.tag ? replace(state.pieces, { ...p, cards: rest }) : without(state.pieces, p.id) });
    }
    case "takeAll": {
      const p = find(action.id);
      if (!p || !p.cards.length) return state;
      return log("you", `took ${count(p.cards.length)} from ${pieceName(p)} into your hand`, { hand: [...state.hand, ...p.cards.map((c) => ({ ...c, faceUp: true }))], pieces: p.tag ? replace(state.pieces, { ...p, cards: [] }) : without(state.pieces, p.id) });
    }
    case "play": {
      const card = state.hand.find((c) => c.id === action.cardId);
      if (!card) return state;
      return log("you", action.faceUp ? `played ${cards[card.id]?.name ?? card.id}` : "played a card face down", { hand: state.hand.filter((c) => c.id !== card.id), pieces: [...state.pieces, { id: action.newId, x: clamp(action.x), y: clamp(action.y), rot: 0, cards: [{ id: card.id, faceUp: action.faceUp }] }] });
    }
    case "playOnto": {
      const card = state.hand.find((c) => c.id === action.cardId);
      const p = find(action.onto);
      if (!card || !p) return state;
      return log("you", `put ${action.faceUp ? cards[card.id]?.name ?? card.id : "a card face down"} on ${pieceName(p)}`, { hand: state.hand.filter((c) => c.id !== card.id), pieces: replace(state.pieces, { ...p, cards: [...p.cards, { id: card.id, faceUp: action.faceUp }] }) });
    }
    case "peek":
      return state.peekId === action.id ? state : { ...state, peekId: action.id };
    case "peerDraw": {
      const p = find(action.id);
      if (!p || !p.cards.length) return state;
      return log(action.who, `took 1 card from ${pieceName(p)}`, { pieces: replace(state.pieces, { ...p, cards: p.cards.slice(0, -1) }) });
    }
    case "note":
      return log(action.who, action.text, {});
    default:
      return state;
  }
}
