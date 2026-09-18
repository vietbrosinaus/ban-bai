import { type Anchor, PRESENCE } from "@/lib/domain/presence";
import { newTable, type TableDeck } from "@/lib/domain/setup";
import type { SeatRole } from "@/lib/domain/card";
import { applyCommand, RuleError, viewFor, type Command, type TableState, type TableView } from "@/lib/domain/table";
import type { Clock } from "@/lib/ports/clock";
import type { Randomness } from "@/lib/ports/randomness";
import type { HandRepository, RoomRepository, StoredHand } from "@/lib/ports/room-repository";

export type TableSnapshot = TableView & { liveHands: StoredHand[] };

export type TableService = ReturnType<typeof createTableService>;

const MAX_SWAP_ATTEMPTS = 5;

export function createTableService(deps: {
  rooms: RoomRepository;
  hands: HandRepository;
  clock: Clock;
  random: Randomness;
}) {
  const { rooms, hands, clock, random } = deps;

  function context(actorId: string) {
    return { actorId, now: clock.now(), shuffle: random.shuffle, id: random.id };
  }

  async function load(code: string) {
    const row = await rooms.read(code);
    if (!row) throw new RuleError("That table does not exist.", 404);
    return { state: JSON.parse(row.state) as TableState, version: row.version };
  }

  async function snapshot(code: string, viewerId: string): Promise<TableSnapshot> {
    const { state } = await load(code);
    const live = await hands.readHands(code, clock.now() - PRESENCE.goHomeMs);
    return { ...viewFor(state, viewerId), liveHands: live };
  }

  return {
    async createTable(hostName: string, deck: TableDeck = "tam-quoc-sat") {
      const code = random.roomCode();
      const hostId = random.id();
      const base = newTable(code, hostId, { shuffle: random.shuffle }, deck);
      const seated = applyCommand(base, { type: "join", seatId: hostId, name: hostName, role: "player" }, context(hostId));
      await rooms.create(code, JSON.stringify(seated), clock.now());
      return { code, seatId: hostId, table: viewFor(seated, hostId) };
    },

    async joinTable(code: string, name: string, role: SeatRole, seatId?: string) {
      const id = seatId || random.id();
      const table = await run(code, id, { type: "join", seatId: id, name, role });
      return { seatId: id, table };
    },

    async readTable(code: string, viewerId: string, sinceRevision?: number) {
      const snap = await snapshot(code, viewerId);
      if (typeof sinceRevision === "number" && snap.revision <= sinceRevision) return null;
      return snap;
    },

    async run(code: string, actorId: string, command: Command) {
      return run(code, actorId, command);
    },

    async setHand(code: string, seatId: string, anchor: Anchor, grabbing: boolean) {
      await hands.writeHand(code, { seatId, anchor, grabbing, changedAt: clock.now() });
    },

    async clearHand(code: string, seatId: string) {
      await hands.removeHand(code, seatId);
    },
  };

  async function run(code: string, actorId: string, command: Command): Promise<TableSnapshot> {
    for (let attempt = 0; attempt < MAX_SWAP_ATTEMPTS; attempt += 1) {
      const { state, version } = await load(code);
      const next = applyCommand(state, command, context(actorId));
      const swapped = await rooms.swap(code, JSON.stringify(next), version + 1, clock.now(), version);
      if (swapped) {
        const live = await hands.readHands(code, clock.now() - PRESENCE.goHomeMs);
        return { ...viewFor(next, actorId), liveHands: live };
      }
    }
    throw new RuleError("The table is busy, try again.", 409);
  }
}
