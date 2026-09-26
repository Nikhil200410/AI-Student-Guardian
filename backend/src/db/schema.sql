-- Phase 0 schema: a single student profile table.
-- Run this once against your database before starting the backend.
--
-- Design decision (Phase 0): since login does not exist yet (that's Phase 1),
-- we only ever store ONE profile row, with a fixed id of 1.
-- Phase 1+ will replace this with per-user rows tied to an authenticated user id.

CREATE TABLE IF NOT EXISTS student_profile (
  id          INTEGER PRIMARY KEY DEFAULT 1,
  name        VARCHAR(120) NOT NULL,
  degree      VARCHAR(120) NOT NULL,
  department  VARCHAR(120) NOT NULL,
  semester    INTEGER NOT NULL CHECK (semester BETWEEN 1 AND 12),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Enforce: this table may only ever contain the single row with id = 1.
  CONSTRAINT single_profile_row CHECK (id = 1)
);
