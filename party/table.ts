import { Server, type Connection, type ConnectionContext, type WSMessage } from "partyserver";

import { PRESENCE, type Hand } from "@/lib/domain/presence";
import { newTable, type TableDeck } from "@/lib/domain/setup";
import { RuleError, applyCommand, viewFor, type CommandContext, type TableState } from "@/lib/domain/table";
import type { SeatRole } from "@/lib/domain/card";
import type { ClientMessage, DoorReply, DoorRequest, ServerMessage } from "@/lib/domain/protocol";
import { systemClock } from "@/lib/adapters/system-clock";
import { webCryptoRandomness } from "@/lib/adapters/web-crypto-randomness";

const STATE_KEY = "table";

type SeatState = { seatId: string; hand?: Hand };

function cleanName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
}

function reply(body: DoorReply, status: number) {
  return Response.json(body, { status, headers: { "access-control-allow-origin": "*" } });
}

function stateOf(connection: Connection) {
  return (connection.state as SeatState | null) ?? { seatId: "" };
}

function seatOfConnection(connection: Connection) {
  return stateOf(connection).seatId;
}

export class Table extends Server {
  static options = { hibernate: true };

  state: TableState | null = null;

  async onStart() {
    this.state = (await this.ctx.storage.get<TableState>(STATE_KEY)) ?? null;
  }

  async onRequest(request: Request) {
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
        const fresh = newTable(this.name, hostId, { shuffle: webCryptoRandomness.shuffle }, deck);
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

  onConnect(connection: Connection, context: ConnectionContext) {
    const seatId = new URL(context.request.url).searchParams.get("seatId") ?? "";
    connection.setState({ seatId } satisfies SeatState);

    if (!this.state) {
      this.say(connection, { t: "gone", message: "Bàn này không tồn tại." });
      return;
    }
    this.say(connection, { t: "snapshot", snapshot: this.snapshotFor(seatId) });
  }

  onMessage(connection: Connection, raw: WSMessage) {
    const seatId = seatOfConnection(connection);
    if (!this.state || !seatId || typeof raw !== "string") return;

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
      const hand: Hand = { seatId, anchor: message.anchor, grabbing: message.grabbing, changedAt: systemClock.now() };
      connection.setState({ ...stateOf(connection), hand } satisfies SeatState);
      this.pushHands();
      return;
    }

    if (message.t !== "command") return;

    try {
      const next = applyCommand(this.state, message.command, this.context(seatId));
      this.state = next;
      this.pushTable();
      this.say(connection, { t: "ack", nonce: message.nonce });
      void this.ctx.storage.put(STATE_KEY, next);
    } catch (error) {
      const text = error instanceof RuleError ? error.message : "Nước đi không thành.";
      this.say(connection, { t: "reject", nonce: message.nonce, message: text });
      this.say(connection, { t: "snapshot", snapshot: this.snapshotFor(seatId) });
    }
  }

  onClose(connection: Connection) {
    if (!seatOfConnection(connection)) return;
    this.pushHands(connection.id);
  }

  onError(connection: Connection) {
    this.onClose(connection);
  }

  private seat(state: TableState, seatId: string, name: string, role: SeatRole) {
    return applyCommand(state, { type: "join", seatId, name, role }, this.context(seatId));
  }

  private context(actorId: string): CommandContext {
    return { actorId, now: systemClock.now(), shuffle: webCryptoRandomness.shuffle, id: webCryptoRandomness.id };
  }

  private async commit(next: TableState) {
    this.state = next;
    await this.ctx.storage.put(STATE_KEY, next);
  }

  private liveHands(leavingId?: string) {
    const floor = systemClock.now() - PRESENCE.goHomeMs;
    const latest = new Map<string, Hand>();
    for (const connection of this.getConnections()) {
      if (connection.id === leavingId) continue;
      const hand = stateOf(connection).hand;
      if (!hand || hand.changedAt <= floor) continue;
      const known = latest.get(hand.seatId);
      if (!known || hand.changedAt > known.changedAt) latest.set(hand.seatId, hand);
    }
    return [...latest.values()];
  }

  private snapshotFor(seatId: string) {
    return { ...viewFor(this.state as TableState, seatId), liveHands: this.liveHands() };
  }

  private say(connection: Connection, message: ServerMessage) {
    connection.send(JSON.stringify(message));
  }

  private pushTable() {
    for (const connection of this.getConnections()) {
      this.say(connection, { t: "snapshot", snapshot: this.snapshotFor(seatOfConnection(connection)) });
    }
  }

  private pushHands(leavingId?: string) {
    this.broadcast(JSON.stringify({ t: "hands", hands: this.liveHands(leavingId) } satisfies ServerMessage), leavingId ? [leavingId] : undefined);
  }
}
