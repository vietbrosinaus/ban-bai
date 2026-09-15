import { createTamQuocSatDeck } from "@/lib/tam-quoc-sat";

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type GameMode = "sandbox-52" | "tam-quoc-sat";

export type PlayingCard = {
  id: string;
  rank: string;
  suit: Suit;
  cardType?: string;
  name?: string;
  asset?: string;
};

export type TableCard = PlayingCard & {
  playedBy: string;
  playedAt: number;
};

export type Player = {
  id: string;
  name: string;
  color: string;
  joinedAt: number;
};

export type RoomState = {
  code: string;
  hostId: string;
  game: GameMode;
  players: Player[];
  hands: Record<string, PlayingCard[]>;
  deck: PlayingCard[];
  table: TableCard[];
  revision: number;
  updatedAt: number;
  lastAction: string;
};

export type PublicRoom = Omit<RoomState, "hands" | "hostId" | "deck"> & {
  deckCount: number;
  hand: PlayingCard[];
  handCounts: Record<string, number>;
  viewerId: string;
  isHost: boolean;
};

const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export const playerColors = [
  "#f4c95d", "#ff8066", "#65c7ba", "#7aa8ff", "#d49af4",
  "#ffad5a", "#8fd06f", "#ef7da7", "#8fc9ef", "#c7a776",
];

export function createDeck(game: GameMode = "sandbox-52"): PlayingCard[] {
  if (game === "tam-quoc-sat") return createTamQuocSatDeck();
  return suits.flatMap((suit) => ranks.map((rank) => ({ id: `${suit}-${rank}`, rank, suit })));
}

function secureIndex(max: number) {
  if (max <= 1) return 0;
  const sample = new Uint32Array(1);
  crypto.getRandomValues(sample);
  return sample[0] % max;
}

export function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const target = secureIndex(index + 1);
    [next[index], next[target]] = [next[target], next[index]];
  }
  return next;
}

export function cleanName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
}

export function publicRoom(state: RoomState, viewerId: string): PublicRoom {
  return {
    code: state.code,
    game: state.game,
    players: state.players,
    deckCount: state.deck.length,
    table: state.table,
    revision: state.revision,
    updatedAt: state.updatedAt,
    lastAction: state.lastAction,
    hand: state.hands[viewerId] ?? [],
    handCounts: Object.fromEntries(state.players.map((player) => [player.id, state.hands[player.id]?.length ?? 0])),
    viewerId,
    isHost: state.hostId === viewerId,
  };
}
