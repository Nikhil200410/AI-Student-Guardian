// authSession.controller.js
// This is NOT a replacement for Supabase's own signup/login/reset logic —
// those happen client-side, directly against Supabase, using supabase-js.
// This controller only does one job: take the tokens Supabase just issued
// the browser, verify them, link them to our local `users` table, and
// re-host them as httpOnly cookies so the rest of our API (every Phase 2
// route) keeps working exactly like it did with our own JWT in Phase 1.

const { supabase } = require("../utils/supabase");
const { findOrCreateLocalUser } = require("../utils/userLinking");
const { setSessionCookies, clearSessionCookies } = require("../utils/authCookies");

// POST /api/auth/session
// Body: { access_token, refresh_token } — exactly what supabase-js returns
// from signUp/signInWithPassword/an email-link exchange.
async function createSession(req, res) {
  const { access_token, refresh_token } = req.body;
  if (!access_token || !refresh_token) {
    return res.status(400).json({ error: "access_token and refresh_token are required." });
  }

  try {
    // Verify the access token is real and unexpired — never trust it just
    // because the frontend sent it.
    const { data, error } = await supabase.auth.getClaims(access_token);
    if (error || !data?.claims) {
      return res.status(401).json({ error: "Invalid or expired session." });
    }

    const supabaseUserId = data.claims.sub;
    const email = data.claims.email;
    if (!supabaseUserId || !email) {
      return res.status(401).json({ error: "Session token is missing required claims." });
    }

    const localUserId = await findOrCreateLocalUser(supabaseUserId, email);

    setSessionCookies(res, { access_token, refresh_token });
    return res.status(200).json({ user: { id: localUserId, email } });
  } catch (err) {
    if (err.code === "23505") {
      // Most likely: an old local `users` row already has this email from
      // before the Supabase migration, with no supabase_user_id link.
      console.error("createSession conflict:", err);
      return res.status(409).json({
        error: "An account with this email already exists locally but isn't linked to Supabase yet. See schema_auth_migration.sql.",
      });
    }
    console.error("createSession error:", err);
    return res.status(500).json({ error: "Could not establish a session." });
  }
}

// POST /api/auth/logout
function logout(req, res) {
  clearSessionCookies(res);
  return res.status(204).send();
}

// GET /api/auth/me — requireAuth already ran, req.userId and req.userEmail are set.
function me(req, res) {
  return res.json({ user: { id: req.userId, email: req.userEmail } });
}

module.exports = { createSession, logout, me };
