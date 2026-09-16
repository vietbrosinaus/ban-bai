import { createTamQuocSatDeck } from "@/lib/tam-quoc-sat";
import type { TamFaction } from "@/lib/tam-quoc-sat-generals";

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
  x: number;
  y: number;
  rotation: number;
  faceDown: boolean;
  zIndex: number;
};

export type TokenColor = "gold" | "coral" | "mint" | "blue" | "ink";

export type TableToken = {
  id: string;
  label: string;
  value: number;
  color: TokenColor;
  x: number;
  y: number;
  zIndex: number;
  createdBy: string;
  createdAt: number;
};

export type Player = {
  id: string;
  name: string;
  color: string;
  seat: number;
  joinedAt: number;
};

export type SelectedGeneral = {
  id: string;
  name: string;
  faction: TamFaction;
  maxHp: number;
  asset: string;
  revealed: boolean;
};

export type HiddenGeneral = { hidden: true; revealed: false };

export type PlayerBoard = {
  hp: number;
  maxHp: number;
  generals: Array<SelectedGeneral | null>;
  equipment: PlayingCard[];
  judging: PlayingCard[];
  chained: boolean;
  faceDown: boolean;
};

export type PublicPlayerBoard = Omit<PlayerBoard, "generals"> & {
  generals: Array<SelectedGeneral | HiddenGeneral | null>;
};

export type RoomState = {
  code: string;
  hostId: string;
  game: GameMode;
  players: Player[];
  hands: Record<string, PlayingCard[]>;
  deck: PlayingCard[];
  table: TableCard[];
  tokens: TableToken[];
  discard: PlayingCard[];
  boards: Record<string, PlayerBoard>;
  activePlayerId: string | null;
  targets: Record<string, string[]>;
  revision: number;
  updatedAt: number;
  lastAction: string;
};

export type PublicRoom = Omit<RoomState, "hands" | "hostId" | "deck" | "boards"> & {
  deckCount: number;
  hand: PlayingCard[];
  handCounts: Record<string, number>;
  viewerId: string;
  isHost: boolean;
  boards: Record<string, PublicPlayerBoard>;
};

const suits: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

export const playerColors = [
  "#f4c95d", "#ff8066", "#65c7ba", "#7aa8ff", "#d49af4",
  "#ffad5a", "#8fd06f", "#ef7da7", "#8fc9ef", "#c7a776",
];

export const seatJoinOrder = [0, 5, 3, 7, 2, 8, 1, 9, 4, 6] as const;

export function createPlayerBoard(): PlayerBoard {
  return { hp: 4, maxHp: 4, generals: [null, null], equipment: [], judging: [], chained: false, faceDown: false };
}

export function normalizeRoomState(state: RoomState): RoomState {
  state.table ??= [];
  state.tokens ??= [];
  state.discard ??= [];
  state.boards ??= {};
  state.targets ??= {};
  if (state.activePlayerId === undefined) state.activePlayerId = null;
  const occupiedSeats = new Set<number>();
  for (const [index, player] of state.players.entries()) {
    if (!Number.isInteger(player.seat) || player.seat < 0 || player.seat > 9 || occupiedSeats.has(player.seat)) {
      player.seat = seatJoinOrder.find((seat) => !occupiedSeats.has(seat)) ?? index;
    }
    occupiedSeats.add(player.seat);
    state.hands[player.id] ??= [];
    state.boards[player.id] ??= createPlayerBoard();
    state.targets[player.id] ??= [];
  }
  for (const [index, card] of state.table.entries()) {
    card.x ??= 50 + ((index % 5) - 2) * 6;
    card.y ??= 50 + (Math.floor(index / 5) % 3) * 8;
    card.rotation ??= ((index % 5) - 2) * 4;
    card.faceDown ??= false;
    card.zIndex ??= index + 1;
  }
  return state;
}

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
  normalizeRoomState(state);
  return {
    code: state.code,
    game: state.game,
    players: state.players,
    deckCount: state.deck.length,
    table: state.table,
    tokens: state.tokens,
    discard: state.discard,
    boards: Object.fromEntries(state.players.map((player) => {
      const board = state.boards[player.id];
      const generals = board.generals.map((general) => {
        if (!general || player.id === viewerId || general.revealed) return general;
        return { hidden: true as const, revealed: false as const };
      });
      return [player.id, { ...board, generals }];
    })),
    activePlayerId: state.activePlayerId,
    targets: state.targets,
    revision: state.revision,
    updatedAt: state.updatedAt,
    lastAction: state.lastAction,
    hand: state.hands[viewerId] ?? [],
    handCounts: Object.fromEntries(state.players.map((player) => [player.id, state.hands[player.id]?.length ?? 0])),
    viewerId,
    isHost: state.hostId === viewerId,
  };
}
