// refreshLock.js
// Implements the refresh-token lifecycle designed before coding (see chat):
//   - proactive refresh (checked before a request fails, not reactively on 401)
//   - single-flight locking so concurrent requests never both try to
//     rotate the same one-time-use refresh token
//   - full cookie replacement on success, full clearing on failure

const { supabase } = require("./supabase");
const { setSessionCookies, clearSessionCookies } = require("./authCookies");

// Keyed by the refresh token currently in flight, so two requests racing
// on the SAME session share one in-progress refresh instead of each
// calling Supabase separately (which would have one of them consume an
// already-rotated, now-dead refresh token).
const inFlightRefreshes = new Map();

// Peeks at a JWT's `exp` claim WITHOUT verifying it — only used to decide
// whether a proactive refresh is worth attempting. The actual trust
// decision always comes from getClaims() (real, verified) afterward, both
// on this token before we bothered, and on whatever token replaces it.
function peekExpiryUnsafe(jwt) {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
    return payload.exp ? payload.exp * 1000 : null; // ms epoch
  } catch {
    return null;
  }
}

const REFRESH_BUFFER_MS = 60 * 1000; // refresh if within 60s of expiry

function isNearOrPastExpiry(accessToken) {
  const expMs = peekExpiryUnsafe(accessToken);
  if (expMs === null) return true; // can't tell — safer to attempt a refresh
  return Date.now() >= expMs - REFRESH_BUFFER_MS;
}

// Performs the actual refresh, single-flight per refresh token. Returns
// the new { access_token, refresh_token } session on success, throws on
// failure. Callers are responsible for setting/clearing cookies (kept
// here anyway for the common case — see refreshAndSetCookies below).
async function singleFlightRefresh(refreshToken) {
  if (inFlightRefreshes.has(refreshToken)) {
    return inFlightRefreshes.get(refreshToken);
  }

  const refreshPromise = supabase.auth
    .refreshSession({ refresh_token: refreshToken })
    .then(({ data, error }) => {
      if (error || !data?.session) {
        throw error || new Error("Refresh returned no session.");
      }
      return data.session;
    })
    .finally(() => {
      // Whether it succeeded or failed, this specific refresh token's
      // attempt is over — stop sharing it with new callers.
      inFlightRefreshes.delete(refreshToken);
    });

  inFlightRefreshes.set(refreshToken, refreshPromise);
  return refreshPromise;
}

// High-level helper for requireAuth: given the current cookies, returns a
// valid access token (refreshing + re-setting cookies if needed), or
// throws (caller should clear cookies and 401) if the refresh token is
// itself no longer valid.
async function ensureFreshAccessToken(req, res, currentAccessToken, currentRefreshToken) {
  if (currentAccessToken && !isNearOrPastExpiry(currentAccessToken)) {
    return currentAccessToken; // still good, no refresh needed
  }

  if (!currentRefreshToken) {
    throw new Error("No refresh token available.");
  }

  const newSession = await singleFlightRefresh(currentRefreshToken);
  // Full replacement — the old refresh token is now dead, never reused.
  setSessionCookies(res, newSession);
  return newSession.access_token;
}

module.exports = { ensureFreshAccessToken, singleFlightRefresh, clearSessionCookies };
