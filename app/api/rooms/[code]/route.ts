import { getRoom, getRoomCursors, joinRoom, performAction, RoomError, updateRoomCursor } from "@/lib/rooms";

function roomCode(value: string) {
  return value.trim().toUpperCase().slice(0, 6);
}

function failure(error: unknown) {
  const status = error instanceof RoomError ? error.status : 500;
  const message = error instanceof RoomError ? error.message : "The table is temporarily unavailable.";
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request, context: RouteContext<"/api/rooms/[code]">) {
  try {
    const { code } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    if (searchParams.get("presence") === "1") return Response.json({ cursors: await getRoomCursors(roomCode(code)) }, { headers: { "cache-control": "no-store" } });
    const playerId = searchParams.get("playerId") ?? "";
    const sinceValue = searchParams.get("since");
    const sinceRevision = sinceValue === null ? undefined : Number(sinceValue);
    const room = await getRoom(roomCode(code), playerId, Number.isFinite(sinceRevision) ? sinceRevision : undefined);
    if (!room) return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
    return Response.json(room, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request, context: RouteContext<"/api/rooms/[code]">) {
  try {
    const { code } = await context.params;
    const body = await request.json() as { action?: unknown; playerId?: unknown; name?: unknown; data?: Record<string, unknown> };
    if (body.action === "join") return Response.json(await joinRoom(roomCode(code), body.name, body.playerId));
    if (typeof body.playerId !== "string" || typeof body.action !== "string") throw new RoomError("Join the room before playing.", 403);
    if (body.action === "cursor") return Response.json(await updateRoomCursor(roomCode(code), body.playerId, body.data ?? {}));
    return Response.json(await performAction(roomCode(code), body.playerId, body.action, body.data ?? {}));
  } catch (error) {
    return failure(error);
  }
}
