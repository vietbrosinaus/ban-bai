CREATE TABLE IF NOT EXISTS rooms (
  code text PRIMARY KEY,
  state jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);
