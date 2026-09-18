import type { Anchor, Hand } from "./presence";
import type { SeatRole } from "./card";
import type { TableDeck } from "./setup";
import type { Command, TableView } from "./table";

export type TableSnapshot = TableView & { liveHands: Hand[] };

export type CardBackKind = "general" | "play";
export type Carry = { x: number; y: number; back: CardBackKind };

export type CreateRequest = { action: "create"; name: string; deck: TableDeck };
export type JoinRequest = { action: "join"; name: string; role: SeatRole; seatId?: string };
export type DoorRequest = CreateRequest | JoinRequest;
export type DoorReply = { seatId: string } | { error: string };

export type ClientMessage =
  | { t: "command"; nonce: string; command: Command }
  | { t: "hand"; anchor: Anchor; grabbing: boolean }
  | { t: "drag"; pieceId: string | null; x: number; y: number }
  | { t: "carry"; carry: Carry | null }
  | { t: "ping"; x: number; y: number }
  | { t: "resync" };

export type ServerMessage =
  | { t: "snapshot"; snapshot: TableSnapshot }
  | { t: "hands"; hands: Hand[] }
  | { t: "drag"; seatId: string; pieceId: string | null; x: number; y: number }
  | { t: "carry"; seatId: string; carry: Carry | null }
  | { t: "ping"; seatId: string; x: number; y: number }
  | { t: "ack"; nonce: string }
  | { t: "reject"; nonce: string; message: string }
  | { t: "gone"; message: string };
