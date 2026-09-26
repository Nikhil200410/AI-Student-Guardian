-- schema_auth_migration.sql
-- Run this AFTER schema.sql, schema_phase1.sql, and schema_phase2.sql.
--
-- Purpose: link the local application `users` table to Supabase Auth, and
-- remove the database structures that existed only to support the old
-- custom OTP authentication (Supabase now owns all of that).
--
-- Named "auth_migration" rather than "phase3" deliberately — this is an
-- authentication infrastructure change, not the master roadmap's Phase 3
-- (Academic Guardian). Numbering it "phase3" would collide with that.
--
-- IMPORTANT — read before running:
-- This adds `supabase_user_id UUID UNIQUE NOT NULL` to `users`. Any
-- existing row in `users` (e.g. a Phase 1 test account created via the old
-- OTP flow) has no corresponding Supabase identity and CANNOT be safely
-- backfilled — there is no way to know which Supabase account, if any,
-- should own it. This migration does not attempt to guess. Before running
-- it, either:
--   (a) start from an empty `users` table (simplest — drop and recreate
--       your local database, then re-run schema.sql -> schema_phase1.sql
--       -> schema_phase2.sql -> this file), or
--   (b) manually decide what to do with existing rows (delete them, or
--       hand-link them to a Supabase user you create for testing) BEFORE
--       running the ALTER TABLE below, since it will fail on any existing
--       row otherwise.
-- This is a real decision left to you — see the accompanying report.

-- ============================================================
-- 1. Link users to Supabase Auth identities
-- ============================================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_user_id UUID UNIQUE NOT NULL;

-- users.email was already UNIQUE NOT NULL from schema_phase1.sql — unchanged,
-- kept here as a convenience copy of the Supabase account's email so the
-- backend doesn't need to call out to Supabase just to know who a user is.

-- ============================================================
-- 2. Drop OTP-specific structures — Supabase now owns all OTP/token/email
--    verification logic for authentication.
-- ============================================================
DROP TABLE IF EXISTS otp_codes;
