# Project Decision Log

## Phase 0

### Product decisions (made by you)
- **Single profile record**, not a multi-profile list — since login doesn't
  exist yet, only one "my profile" row is stored (Phase 1 will migrate this
  to per-user rows).
- **Card-based UI** for the profile screen.

### Architecture decisions
- **Frontend build tool: Vite**, not Create React App — CRA is unmaintained;
  Vite is the current standard, faster dev server, same React code.
- **Database: hosted Postgres** (Supabase or Neon — you asked me to set you
  up with a free hosted option) instead of a local Postgres install, to
  avoid local setup friction and keep the connection string portable.
- Backend split into `routes/` (URL → function mapping) and `controllers/`
  (the actual logic) from the start, even though Phase 0 is small — this
  matches how the project will need to be organized once more modules
  (academics, skills, coding, etc.) are added.

### Resolved from Phase 0
- Phase 0's single-profile design **did** migrate to per-user rows as part
  of Phase 1 (see `schema_phase1.sql`), rather than as a separate step.
- Hosted Postgres provider: your choice of Supabase or Neon both work
  unchanged with this code.

## Phase 1

### Product/architecture decisions
- **Auth method: Email OTP + JWT**, per the master spec (not
  password-based, not third-party OAuth).
- **Email provider: Resend** — you hadn't specified, so I picked this as
  the simplest modern option (plain HTTPS API call, generous free tier, no
  Gmail app-password setup). Easy to swap: only `backend/src/utils/email.js`
  would need to change.
- **JWT storage: httpOnly cookie**, not localStorage — you hadn't
  specified, so I went with the more secure default. A cookie set as
  `httpOnly` can't be read by JavaScript via `document.cookie`, so it
  blocks one specific attack: an XSS script exfiltrating the raw token to
  an attacker's server. It does **not** make the app immune to XSS more
  broadly — injected script running on the page could still trigger
  authenticated requests (the browser attaches the cookie automatically),
  so XSS prevention (input sanitization, output escaping, a sane CSP) is
  still necessary on its own. The cost of the httpOnly approach is needing
  `credentials: true` on both the CORS config and every frontend request,
  which is already wired up.
- **OTP security choices:** 6-digit numeric code, bcrypt-hashed at rest,
  10-minute expiry, max 5 wrong attempts before the code is invalidated,
  60-second cooldown between resend requests to the same email.
- **No "sign up" step** — verifying an OTP for a new email creates the
  user automatically. Simpler flow, standard for OTP-based auth.

### Unresolved decisions
- Whether to ever add a "remember me" / longer session option, or refresh
  tokens — current JWT just expires after 7 days and the user re-logs-in.
- Whether the orphaned Phase 0 test profile (if any) should be manually
  cleaned up or handled with a proper migration script — noted in
  `schema_phase1.sql` for now.
