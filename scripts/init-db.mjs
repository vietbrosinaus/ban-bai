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

await sql.query(`CREATE TABLE IF NOT EXISTS room_presence (
  room_code text NOT NULL REFERENCES rooms(code) ON DELETE CASCADE,
  player_id text NOT NULL,
  x double precision NOT NULL,
  y double precision NOT NULL,
  activity text NOT NULL DEFAULT 'table',
  visible boolean NOT NULL DEFAULT true,
  updated_at bigint NOT NULL,
  PRIMARY KEY (room_code, player_id)
)`);

await sql.query("CREATE INDEX IF NOT EXISTS room_presence_updated_idx ON room_presence (room_code, updated_at)");

console.log("Neon room storage is ready.");
