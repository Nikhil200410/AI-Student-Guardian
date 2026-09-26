// userLinking.js
// Bridges a verified Supabase identity (UUID + email) to our local,
// integer-keyed `users` table that every Phase 2 table's foreign keys
// point at. Used by both the /session endpoint (first login/signup) and
// requireAuth (in case a session cookie exists for a user not yet linked
// locally — defensive, shouldn't normally happen since /session always
// runs first, but keeps requireAuth correct on its own).

const db = require("../db");

async function findOrCreateLocalUser(supabaseUserId, email) {
  const existing = await db.query("SELECT id FROM users WHERE supabase_user_id = $1", [supabaseUserId]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  // Not found by supabase_user_id yet. Guard against a rare edge case:
  // the same email already exists locally (e.g. leftover Phase 1 test
  // data) but without a supabase_user_id link. We do NOT silently adopt
  // that row — see schema_auth_migration.sql's note on this. We only
  // create a fresh row here.
  const { rows } = await db.query(
    `INSERT INTO users (supabase_user_id, email) VALUES ($1, $2)
     RETURNING id`,
    [supabaseUserId, email]
  );
  return rows[0].id;
}

module.exports = { findOrCreateLocalUser };
