import type { Anchor } from "@/lib/domain/presence";

export type StoredRoom = { state: string; version: number };

export type StoredHand = {
  seatId: string;
  anchor: Anchor;
  grabbing: boolean;
  changedAt: number;
};

export interface RoomRepository {
  read(code: string): Promise<StoredRoom | null>;
  create(code: string, state: string, now: number): Promise<void>;
  swap(code: string, state: string, nextVersion: number, now: number, expectedVersion: number): Promise<boolean>;
}

export interface HandRepository {
  readHands(code: string, freshAfter: number): Promise<StoredHand[]>;
  writeHand(code: string, hand: StoredHand): Promise<void>;
  removeHand(code: string, seatId: string): Promise<void>;
}
