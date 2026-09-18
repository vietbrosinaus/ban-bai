export type CardId = string;
export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type CardKind = "play" | "general";
export type Faction = "wei" | "shu" | "wu" | "qun";

export type CardFace = {
  id: CardId;
  kind: CardKind;
  name: string;
  suit: Suit;
  rank: string;
  art: string;
  faction?: Faction;
  maxHp?: number;
};

export type CardRef = {
  id: CardId;
  faceUp: boolean;
};

export type Point = {
  x: number;
  y: number;
};

export type Piece = Point & {
  id: string;
  rotation: number;
  cards: CardRef[];
  label?: string;
};

export const SEAT_SLOTS = ["general1", "general2", "weapon", "armor", "horsePlus", "horseMinus", "judgement"] as const;

export type SeatSlot = (typeof SEAT_SLOTS)[number];

export const SEAT_SLOT_LABEL: Record<SeatSlot, string> = {
  general1: "Tướng 1",
  general2: "Tướng 2",
  weapon: "Vũ khí",
  armor: "Phòng cụ",
  horsePlus: "Ngựa +1",
  horseMinus: "Ngựa -1",
  judgement: "Phán xét",
};

export type Counter = Point & {
  id: string;
  label: string;
  value: number;
  ownerId?: string;
  slotted?: boolean;
};

export type SeatRole = "player" | "spectator";

export type Seat = {
  id: string;
  name: string;
  colour: string;
  index: number;
  handCount: number;
  role: SeatRole;
};

export type Presence = Point & {
  seatId: string;
  grabbing: boolean;
  visible: boolean;
};

export const FACTION_LABEL: Record<Faction, string> = {
  wei: "Ngụy",
  shu: "Thục",
  wu: "Ngô",
  qun: "Quần Hùng",
};

export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

export function isRed(suit: Suit) {
  return suit === "hearts" || suit === "diamonds";
}

