import type * as Party from "partykit/server";

import { PRESENCE, type Hand } from "@/lib/domain/presence";
import { newTable, type TableDeck } from "@/lib/domain/setup";
import { RuleError, applyCommand, viewFor, type CommandContext, type TableState } from "@/lib/domain/table";
import type { SeatRole } from "@/lib/domain/card";
import type { ClientMessage, DoorReply, DoorRequest, ServerMessage } from "@/lib/domain/protocol";
import { systemClock } from "@/lib/adapters/system-clock";
import { webCryptoRandomness } from "@/lib/adapters/web-crypto-randomness";

const STATE_KEY = "table";

function cleanName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
}

function reply(body: DoorReply, status: number) {
  return Response.json(body, { status, headers: { "access-control-allow-origin": "*" } });
}

export default class Table implements Party.Server {
  state: TableState | null = null;
  hands = new Map<string, Hand>();

  constructor(readonly room: Party.Room) {}

  async onStart() {
    this.state = (await this.room.storage.get<TableState>(STATE_KEY)) ?? null;
  }

  async onRequest(request: Party.Request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        },
      });
    }

    if (request.method === "GET") return reply({ error: this.state ? "" : "missing" }, this.state ? 200 : 404);
    if (request.method !== "POST") return reply({ error: "Không hỗ trợ." }, 405);

    let body: DoorRequest;
    try {
      body = await request.json() as DoorRequest;
    } catch {
      return reply({ error: "Yêu cầu không đọc được." }, 400);
    }

    const name = cleanName(body.name);
    if (!name) return reply({ error: "Nhập tên trước đã." }, 400);

    try {
      if (body.action === "create") {
        if (this.state) return reply({ error: "Bàn này đã có rồi." }, 409);
        const hostId = webCryptoRandomness.id();
        const deck: TableDeck = body.deck === "classic-52" ? "classic-52" : "tam-quoc-sat";
        const fresh = newTable(this.room.id, hostId, { shuffle: webCryptoRandomness.shuffle }, deck);
        await this.commit(this.seat(fresh, hostId, name, "player"));
        return reply({ seatId: hostId }, 201);
      }

      if (!this.state) return reply({ error: "Bàn này không tồn tại." }, 404);
      const role = body.role === "spectator" ? "spectator" : "player";
      const seatId = body.seatId && this.state.seats.some((seat) => seat.id === body.seatId)
        ? body.seatId
        : webCryptoRandomness.id();
      await this.commit(this.seat(this.state, seatId, name, role));
      this.pushTable();
      return reply({ seatId }, 200);
    } catch (error) {
      if (error instanceof RuleError) return reply({ error: error.message }, error.status);
      return reply({ error: "Bàn đang không dùng được." }, 500);
    }
  }

  onConnect(connection: Party.Connection, context: Party.ConnectionContext) {
    const seatId = new URL(context.request.url).searchParams.get("seatId") ?? "";
    connection.setState({ seatId });

    if (!this.state) {
      this.say(connection, { t: "gone", message: "Bàn này không tồn tại." });
      return;
    }
    this.say(connection, { t: "snapshot", snapshot: this.snapshotFor(seatId) });
  }

  onMessage(raw: string, connection: Party.Connection) {
    const seatId = (connection.state as { seatId?: string } | null)?.seatId ?? "";
    if (!this.state || !seatId) return;

    let message: ClientMessage;
    try {
      message = JSON.parse(raw) as ClientMessage;
    } catch {
      return;
    }

    if (message.t === "resync") {
      this.say(connection, { t: "snapshot", snapshot: this.snapshotFor(seatId) });
      return;
    }

    if (message.t === "hand") {
      this.hands.set(seatId, { seatId, anchor: message.anchor, grabbing: message.grabbing, changedAt: systemClock.now() });
      this.pushHands();
      return;
    }

    if (message.t !== "command") return;

    try {
      const next = applyCommand(this.state, message.command, this.context(seatId));
      this.state = next;
      this.pushTable();
      this.say(connection, { t: "ack", nonce: message.nonce });
      void this.room.storage.put(STATE_KEY, next);
    } catch (error) {
      const text = error instanceof RuleError ? error.message : "Nước đi không thành.";
      this.say(connection, { t: "reject", nonce: message.nonce, message: text });
      this.say(connection, { t: "snapshot", snapshot: this.snapshotFor(seatId) });
    }
  }

  onClose(connection: Party.Connection) {
    const seatId = (connection.state as { seatId?: string } | null)?.seatId ?? "";
    if (!seatId || this.stillHere(seatId)) return;
    this.hands.delete(seatId);
    this.pushHands();
  }

  onError(connection: Party.Connection) {
    this.onClose(connection);
  }

  private stillHere(seatId: string) {
    for (const open of this.room.getConnections()) {
      if (open.readyState !== 1) continue;
      if ((open.state as { seatId?: string } | null)?.seatId === seatId) return true;
    }
    return false;
  }

  private seat(state: TableState, seatId: string, name: string, role: SeatRole) {
    return applyCommand(state, { type: "join", seatId, name, role }, this.context(seatId));
  }

  private context(actorId: string): CommandContext {
    return { actorId, now: systemClock.now(), shuffle: webCryptoRandomness.shuffle, id: webCryptoRandomness.id };
  }

  private async commit(next: TableState) {
    this.state = next;
    await this.room.storage.put(STATE_KEY, next);
  }

  private liveHands() {
    const floor = systemClock.now() - PRESENCE.goHomeMs;
    return [...this.hands.values()].filter((hand) => hand.changedAt > floor);
  }

  private snapshotFor(seatId: string) {
    return { ...viewFor(this.state as TableState, seatId), liveHands: this.liveHands() };
  }

  private say(connection: Party.Connection, message: ServerMessage) {
    connection.send(JSON.stringify(message));
  }

  private pushTable() {
    for (const connection of this.room.getConnections()) {
      const seatId = (connection.state as { seatId?: string } | null)?.seatId ?? "";
      this.say(connection, { t: "snapshot", snapshot: this.snapshotFor(seatId) });
    }
  }

  private pushHands() {
    const hands = this.liveHands();
    this.room.broadcast(JSON.stringify({ t: "hands", hands } satisfies ServerMessage));
  }
}
