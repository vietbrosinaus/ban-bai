import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const sql = neon(connectionString);

await sql.query(`CREATE TABLE IF NOT EXISTS rooms (
  code text PRIMARY KEY,
  state jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
)`);

await sql.query(`CREATE TABLE IF NOT EXISTS room_hands (
  room_code text NOT NULL,
  seat_id text NOT NULL,
  anchor jsonb NOT NULL,
  grabbing boolean NOT NULL DEFAULT false,
  changed_at bigint NOT NULL,
  PRIMARY KEY (room_code, seat_id)
)`);

await sql.query("CREATE INDEX IF NOT EXISTS room_hands_fresh_idx ON room_hands (room_code, changed_at)");

console.log("Table storage is ready.");
