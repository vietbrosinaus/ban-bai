import { neon } from "@neondatabase/serverless";

import type { HandRepository, RoomRepository, StoredHand, StoredRoom } from "@/lib/ports/room-repository";

export function neonRoomRepository(connectionString: string): RoomRepository & HandRepository {
  const sql = neon(connectionString);

  return {
    async read(code) {
      const rows = await sql.query("SELECT state, version FROM rooms WHERE code = $1 LIMIT 1", [code]);
      return (rows[0] as StoredRoom | undefined) ?? null;
    },

    async create(code, state, now) {
      await sql.query("INSERT INTO rooms (code, state, version, created_at, updated_at) VALUES ($1, $2::jsonb, $3, $4, $5)", [code, state, 1, now, now]);
    },

    async swap(code, state, nextVersion, now, expectedVersion) {
      const rows = await sql.query(
        "UPDATE rooms SET state = $1::jsonb, version = $2, updated_at = $3 WHERE code = $4 AND version = $5 RETURNING code",
        [state, nextVersion, now, code, expectedVersion],
      );
      return rows.length > 0;
    },

    async readHands(code, freshAfter) {
      const rows = await sql.query(
        "SELECT seat_id, anchor, grabbing, changed_at FROM room_hands WHERE room_code = $1 AND changed_at > $2",
        [code, freshAfter],
      ) as Array<{ seat_id: string; anchor: StoredHand["anchor"] | string; grabbing: boolean; changed_at: number }>;
      return rows.map((row) => ({
        seatId: row.seat_id,
        anchor: typeof row.anchor === "string" ? JSON.parse(row.anchor) as StoredHand["anchor"] : row.anchor,
        grabbing: row.grabbing,
        changedAt: Number(row.changed_at),
      }));
    },

    async writeHand(code, hand) {
      await sql.query(
        `INSERT INTO room_hands (room_code, seat_id, anchor, grabbing, changed_at)
         VALUES ($1, $2, $3::jsonb, $4, $5)
         ON CONFLICT (room_code, seat_id) DO UPDATE SET
           anchor = EXCLUDED.anchor, grabbing = EXCLUDED.grabbing, changed_at = EXCLUDED.changed_at`,
        [code, hand.seatId, JSON.stringify(hand.anchor), hand.grabbing, hand.changedAt],
      );
    },

    async removeHand(code, seatId) {
      await sql.query("DELETE FROM room_hands WHERE room_code = $1 AND seat_id = $2", [code, seatId]);
    },
  };
}
