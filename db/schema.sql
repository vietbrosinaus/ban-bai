CREATE TABLE IF NOT EXISTS rooms (
  code text PRIMARY KEY,
  state jsonb NOT NULL,
  version integer NOT NULL DEFAULT 1,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE TABLE IF NOT EXISTS room_hands (
  room_code text NOT NULL,
  seat_id text NOT NULL,
  anchor jsonb NOT NULL,
  grabbing boolean NOT NULL DEFAULT false,
  changed_at bigint NOT NULL,
  PRIMARY KEY (room_code, seat_id)
);

CREATE INDEX IF NOT EXISTS room_hands_fresh_idx ON room_hands (room_code, changed_at);
