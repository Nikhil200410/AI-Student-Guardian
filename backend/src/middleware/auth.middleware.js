// auth.middleware.js
// Protects routes: reads the Supabase access token from our httpOnly
// cookie, proactively refreshes it via refreshLock.js if it's near/past
// expiry (single-flight, so concurrent requests can't double-rotate the
// refresh token), verifies the (possibly just-refreshed) token with
// Supabase's getClaims() — cryptographic verification, NOT the spoofable
// getSession() — and attaches req.userId for controllers to use.

const { supabase } = require("../utils/supabase");
const { findOrCreateLocalUser } = require("../utils/userLinking");
const { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies } = require("../utils/authCookies");
const { ensureFreshAccessToken } = require("../utils/refreshLock");

async function requireAuth(req, res, next) {
  const accessToken = req.cookies?.[ACCESS_COOKIE];
  const refreshToken = req.cookies?.[REFRESH_COOKIE];

  if (!accessToken && !refreshToken) {
    return res.status(401).json({ error: "Not logged in." });
  }

  let freshAccessToken;
  try {
    freshAccessToken = await ensureFreshAccessToken(req, res, accessToken, refreshToken);
  } catch (err) {
    // Refresh token itself is dead/invalid — clean failure, no half-valid
    // cookie state left behind.
    clearSessionCookies(res);
    return res.status(401).json({ error: "Session expired. Please log in again." });
  }

  try {
    const { data, error } = await supabase.auth.getClaims(freshAccessToken);
    if (error || !data?.claims) {
      clearSessionCookies(res);
      return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
    }

    const supabaseUserId = data.claims.sub;
    const email = data.claims.email;

    // Defensive: normally /api/auth/session already created this link on
    // login. If it's somehow missing, create it now rather than fail.
    const localUserId = await findOrCreateLocalUser(supabaseUserId, email);

    req.userId = localUserId;
    req.userEmail = email;
    next();
  } catch (err) {
    console.error("requireAuth error:", err);
    return res.status(401).json({ error: "Session expired or invalid. Please log in again." });
  }
}

module.exports = { requireAuth };
