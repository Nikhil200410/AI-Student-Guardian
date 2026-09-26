// authCookies.js
// Shared constants so the cookie names/options can't drift out of sync
// between authSession.controller.js, auth.middleware.js, and refreshLock.js.

const ACCESS_COOKIE = "sb_access_token";
const REFRESH_COOKIE = "sb_refresh_token";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function accessCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: 60 * 60 * 1000, // 1 hour — matches Supabase's default access token lifetime
  };
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days — Supabase refresh tokens are long-lived until rotated/revoked
  };
}

// Sets both cookies from a Supabase session object ({ access_token, refresh_token }).
function setSessionCookies(res, session) {
  res.cookie(ACCESS_COOKIE, session.access_token, accessCookieOptions());
  res.cookie(REFRESH_COOKIE, session.refresh_token, refreshCookieOptions());
}

function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE, accessCookieOptions());
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
}

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  accessCookieOptions,
  refreshCookieOptions,
  setSessionCookies,
  clearSessionCookies,
};
