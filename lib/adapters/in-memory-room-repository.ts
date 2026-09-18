import type { HandRepository, RoomRepository, StoredHand, StoredRoom } from "@/lib/ports/room-repository";

export type MemoryBucket = {
  rooms: Map<string, StoredRoom>;
  hands: Map<string, Map<string, StoredHand>>;
};

export function createBucket(): MemoryBucket {
  return { rooms: new Map(), hands: new Map() };
}

export function inMemoryRoomRepository(bucket: MemoryBucket = createBucket()): RoomRepository & HandRepository {
  return {
    async read(code) {
      return bucket.rooms.get(code) ?? null;
    },

    async create(code, state) {
      bucket.rooms.set(code, { state, version: 1 });
    },

    async swap(code, state, nextVersion, _now, expectedVersion) {
      const room = bucket.rooms.get(code);
      if (!room || room.version !== expectedVersion) return false;
      bucket.rooms.set(code, { state, version: nextVersion });
      return true;
    },

    async readHands(code, freshAfter) {
      const hands = bucket.hands.get(code);
      return hands ? [...hands.values()].filter((hand) => hand.changedAt > freshAfter) : [];
    },

    async writeHand(code, hand) {
      const hands = bucket.hands.get(code) ?? new Map<string, StoredHand>();
      hands.set(hand.seatId, hand);
      bucket.hands.set(code, hands);
    },

    async removeHand(code, seatId) {
      bucket.hands.get(code)?.delete(seatId);
    },
  };
}
