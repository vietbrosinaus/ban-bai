import type { Anchor } from "@/lib/domain/presence";
import { RuleError, type Command } from "@/lib/domain/table";
import { tableService } from "@/lib/composition";

type Params = { params: Promise<{ code: string }> };

function tableCode(value: string) {
  return value.trim().toUpperCase().slice(0, 6);
}

function failure(error: unknown) {
  const status = error instanceof RuleError ? error.status : 500;
  const message = error instanceof RuleError ? error.message : "Bàn đang không dùng được.";
  return Response.json({ error: message }, { status });
}

const noStore = { "cache-control": "no-store" };

export async function GET(request: Request, { params }: Params) {
  try {
    const { code } = await params;
    const url = new URL(request.url);
    const seatId = url.searchParams.get("seatId") ?? "";
    const sinceRaw = url.searchParams.get("since");
    const since = sinceRaw === null ? undefined : Number(sinceRaw);
    const snapshot = await tableService().readTable(tableCode(code), seatId, Number.isFinite(since) ? since : undefined);
    if (!snapshot) return new Response(null, { status: 204, headers: noStore });
    return Response.json(snapshot, { headers: noStore });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { code } = await params;
    const table = tableCode(code);
    const body = await request.json() as {
      action?: string;
      seatId?: string;
      name?: string;
      role?: string;
      command?: Command;
      anchor?: Anchor;
      grabbing?: boolean;
    };
    const service = tableService();

    if (body.action === "join") {
      const name = String(body.name ?? "").trim().replace(/\s+/g, " ").slice(0, 24);
      if (!name) throw new RuleError("Nhập tên trước đã.", 400);
      const role = body.role === "spectator" ? "spectator" : "player";
      return Response.json(await service.joinTable(table, name, role, body.seatId));
    }

    if (!body.seatId) throw new RuleError("Vào bàn trước đã.", 403);

    if (body.action === "hand") {
      if (!body.anchor) throw new RuleError("Thiếu vị trí tay.", 400);
      await service.setHand(table, body.seatId, body.anchor, Boolean(body.grabbing));
      return Response.json({ ok: true }, { headers: noStore });
    }

    if (!body.command) throw new RuleError("Thiếu nước đi.", 400);
    return Response.json(await service.run(table, body.seatId, body.command), { headers: noStore });
  } catch (error) {
    return failure(error);
  }
}
