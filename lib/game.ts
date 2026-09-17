import { createTamQuocSatDeck } from "@/lib/tam-quoc-sat";
import { tamQuocSatGenerals, type TamFaction, type TamGeneral } from "@/lib/tam-quoc-sat-generals";

export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type GameMode = "sandbox-52" | "tam-quoc-sat";

export type PlayingCard = {
  id: string;
  rank: string;
  suit: Suit;
  cardType?: string;
  name?: string;
  asset?: string;
  faction?: TamFaction;
  maxHp?: number;
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

export type TablePile = {
  id: string;
  label: string;
  cards: TableCard[];
  faceDown: boolean;
  x: number;
  y: number;
  rotation: number;
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

export type ActivityLogEntry = {
  id: string;
  actorId: string;
  message: string;
  createdAt: number;
};

export type PlayerCursor = {
  x: number;
  y: number;
  activity: "table" | "card" | "pile" | "deck" | "controls";
  updatedAt: number;
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
  piles: TablePile[];
  discard: PlayingCard[];
  boards: Record<string, PlayerBoard>;
  targets: Record<string, string[]>;
  generalDeckInitialized: boolean;
  revision: number;
  updatedAt: number;
  lastAction: string;
  activityLog: ActivityLogEntry[];
};

export type PublicRoom = Omit<RoomState, "hands" | "hostId" | "deck" | "boards" | "generalDeckInitialized"> & {
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
export const GENERAL_PILE_ID = "tam-quoc-sat-generals";

const factionSuit: Record<TamFaction, Suit> = {
  wei: "spades",
  shu: "hearts",
  wu: "diamonds",
  qun: "clubs",
};

export function generalToPlayingCard(general: TamGeneral | SelectedGeneral): PlayingCard {
  return {
    id: `general-${general.id}`,
    rank: String(general.maxHp),
    suit: factionSuit[general.faction],
    cardType: "general",
    name: general.name,
    asset: general.asset,
    faction: general.faction,
    maxHp: general.maxHp,
  };
}

export function createPlayerBoard(): PlayerBoard {
  return { hp: 4, maxHp: 4, generals: [null, null], faceDown: false };
}

export function normalizeRoomState(state: RoomState): RoomState {
  state.table ??= [];
  state.tokens ??= [];
  state.piles ??= [];
  state.discard ??= [];
  state.boards ??= {};
  state.targets ??= {};
  if (!state.activityLog) {
    state.activityLog = state.lastAction ? [{ id: `legacy-${state.revision}`, actorId: state.hostId, message: state.lastAction, createdAt: state.updatedAt }] : [];
  }
  const occupiedSeats = new Set<number>();
  for (const [index, player] of state.players.entries()) {
    if (!Number.isInteger(player.seat) || player.seat < 0 || player.seat > 9 || occupiedSeats.has(player.seat)) {
      player.seat = seatJoinOrder.find((seat) => !occupiedSeats.has(seat)) ?? index;
    }
    occupiedSeats.add(player.seat);
    state.hands[player.id] ??= [];
    state.boards[player.id] ??= createPlayerBoard();
    const legacyBoard = state.boards[player.id] as PlayerBoard & { equipment?: PlayingCard[]; judging?: PlayingCard[]; chained?: boolean };
    state.hands[player.id].push(...(legacyBoard.equipment ?? []), ...(legacyBoard.judging ?? []));
    delete legacyBoard.equipment;
    delete legacyBoard.judging;
    delete legacyBoard.chained;
    state.targets[player.id] ??= [];
  }
  if (!state.generalDeckInitialized) {
    if (state.game === "tam-quoc-sat") {
      for (const player of state.players) {
        const board = state.boards[player.id];
        const migratedGenerals = board.generals.flatMap((general) => general ? [generalToPlayingCard(general)] : []);
        state.hands[player.id].push(...migratedGenerals);
        board.generals = [null, null];
      }
      const usedGeneralIds = new Set([
        ...Object.values(state.hands).flat(),
        ...state.table,
        ...state.piles.flatMap((pile) => pile.cards),
        ...state.discard,
      ].filter((card) => card.cardType === "general").map((card) => card.id));
      const pile = createGeneralPile("system");
      pile.cards = pile.cards.filter((card) => !usedGeneralIds.has(card.id));
      if (pile.cards.length) state.piles.push(pile);
    }
    state.generalDeckInitialized = true;
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

export function createGeneralPile(createdBy: string): TablePile {
  const now = Date.now();
  const cards = shuffle(tamQuocSatGenerals.map(generalToPlayingCard)).map((card, index) => ({
    ...card,
    playedBy: createdBy,
    playedAt: now,
    x: 24,
    y: 50,
    rotation: 0,
    faceDown: true,
    zIndex: index + 1,
  }));
  return {
    id: GENERAL_PILE_ID,
    label: "Generals",
    cards,
    faceDown: true,
    x: 24,
    y: 50,
    rotation: 0,
    zIndex: 2,
    createdBy,
    createdAt: now,
  };
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
    piles: state.piles.map((pile) => pile.faceDown ? {
      ...pile,
      cards: pile.cards.map((_, index) => ({
        id: `hidden-${pile.id}-${index}`,
        rank: "?",
        suit: "spades" as const,
        cardType: pile.id === GENERAL_PILE_ID ? "general" : undefined,
        playedBy: "",
        playedAt: 0,
        x: pile.x,
        y: pile.y,
        rotation: 0,
        faceDown: true,
        zIndex: index,
      })),
    } : pile),
    discard: state.discard,
    boards: Object.fromEntries(state.players.map((player) => {
      const board = state.boards[player.id];
      const generals = board.generals.map((general) => {
        if (!general || player.id === viewerId || general.revealed) return general;
        return { hidden: true as const, revealed: false as const };
      });
      return [player.id, { ...board, generals }];
    })),
    targets: state.targets,
    revision: state.revision,
    updatedAt: state.updatedAt,
    lastAction: state.lastAction,
    activityLog: state.activityLog,
    hand: state.hands[viewerId] ?? [],
    handCounts: Object.fromEntries(state.players.map((player) => [player.id, state.hands[player.id]?.length ?? 0])),
    viewerId,
    isHost: state.hostId === viewerId,
  };
}
