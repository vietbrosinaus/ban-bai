import { createRoom, RoomError } from "@/lib/rooms";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: unknown };
    return Response.json(await createRoom(body.name), { status: 201 });
  } catch (error) {
    const status = error instanceof RoomError ? error.status : 500;
    const message = error instanceof RoomError ? error.message : "Could not create the room.";
    return Response.json({ error: message }, { status });
  }
}
