-- Phase 1 migration: adds authentication.
-- Run this AFTER schema.sql (Phase 0), against the same database:
--   psql "$DATABASE_URL" -f backend/src/db/schema_phase1.sql
--
-- What changes:
--   1. New `users` table — one row per person who has ever verified an OTP.
--   2. New `otp_codes` table — short-lived one-time codes, hashed at rest.
--   3. `student_profile` changes from "always exactly one row (id=1)" to
--      "at most one row per user", now that we have real users.

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL,
  code_hash   VARCHAR(255) NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Speeds up "find the latest OTP for this email" lookups.
CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes (email);

-- --- Migrate student_profile from single-row to per-user ---

-- Drop the Phase 0 constraint that forced id to always be 1.
ALTER TABLE student_profile DROP CONSTRAINT IF EXISTS single_profile_row;

-- Add a user_id column. Nullable at first so this migration doesn't fail
-- if a Phase 0 profile row already exists with no owner.
ALTER TABLE student_profile ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id);

-- id no longer needs to be pinned to 1 — let it behave like a normal
-- auto-incrementing primary key for any *new* rows going forward.
-- (Existing row, if any, keeps id=1; that's fine.)
ALTER TABLE student_profile ALTER COLUMN id DROP DEFAULT;
CREATE SEQUENCE IF NOT EXISTS student_profile_id_seq OWNED BY student_profile.id;
SELECT setval('student_profile_id_seq', GREATEST((SELECT COALESCE(MAX(id), 0) FROM student_profile), 1));
ALTER TABLE student_profile ALTER COLUMN id SET DEFAULT nextval('student_profile_id_seq');

-- One profile per user, once user_id is populated.
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profile_user_id ON student_profile (user_id);

-- NOTE: if you created a test profile in Phase 0 (id=1, user_id NULL), it is
-- now "orphaned" — no user owns it. Simplest fix for a student project:
-- delete it and re-create your profile after logging in.
--   DELETE FROM student_profile WHERE user_id IS NULL;
