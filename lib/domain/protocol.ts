import type { Anchor, Hand } from "./presence";
import type { SeatRole } from "./card";
import type { TableDeck } from "./setup";
import type { Command, TableView } from "./table";

export type TableSnapshot = TableView & { liveHands: Hand[] };

export type CreateRequest = { action: "create"; name: string; deck: TableDeck };
export type JoinRequest = { action: "join"; name: string; role: SeatRole; seatId?: string };
export type DoorRequest = CreateRequest | JoinRequest;
export type DoorReply = { seatId: string } | { error: string };

export type ClientMessage =
  | { t: "command"; nonce: string; command: Command }
  | { t: "hand"; anchor: Anchor; grabbing: boolean }
  | { t: "resync" };

export type ServerMessage =
  | { t: "snapshot"; snapshot: TableSnapshot }
  | { t: "hands"; hands: Hand[] }
  | { t: "ack"; nonce: string }
  | { t: "reject"; nonce: string; message: string }
  | { t: "gone"; message: string };
