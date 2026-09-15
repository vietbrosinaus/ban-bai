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

console.log("Neon room storage is ready.");
