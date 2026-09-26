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

## Phase 1 — VERIFIED (locally tested, see PROJECT_PROGRESS.md)

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
- **Database: local PostgreSQL for development** — Phase 1 was set up and
  tested against a local Postgres instance (`ai_student_guardian`
  database) rather than a hosted provider. The code doesn't care either
  way; only `DATABASE_URL` in `.env` changes if this switches to hosted
  Postgres later.
- **Resend kept in testing mode for now** — OTP emails currently only
  deliver to the Resend account's own email address, since no sending
  domain has been verified. This is sufficient for local development and
  testing. Verifying a domain (needed to email arbitrary students) is
  explicitly postponed until deployment prep, not required for Phase 1.

### Unresolved decisions
- Whether to ever add a "remember me" / longer session option, or refresh
  tokens — current JWT just expires after 7 days and the user re-logs-in.
- Whether the orphaned Phase 0 test profile (if any) should be manually
  cleaned up or handled with a proper migration script — noted in
  `schema_phase1.sql` for now.

## Phase 2 — Student Digital Twin Foundation

### Product/architecture decisions (approved by you before implementation)
- **`student_profile` narrowed** to `id, user_id, name, created_at, updated_at`.
  `degree`/`department`/`semester` moved to a new `education_records`
  table, migrated safely (data copied before columns dropped — see
  `DATABASE_DESIGN.md`).
- **Education:** structured fields, one current record enforced via a
  partial unique index, architecture supports multiple records later with
  no schema change.
- **Goals:** one `goals` table with a `goal_type` column, multiple goals
  per user, `priority` (low/medium/high) and `status`
  (active/completed/paused/abandoned) as requested.
- **Skills:** claimed vs. demonstrated as a `status` column on `skills`,
  with a separate `skill_evidence` table. A skill can only move to
  `demonstrated` if at least one evidence row exists — enforced in
  `skills.controller.js`, never automatic.
- **Skill categories:** a `skill_categories` lookup table (not a hardcoded
  `CHECK` enum), seeded with your 14 categories, extensible later via
  plain `INSERT` — no migration needed to add a category.
- **Interests:** one table serves both predefined-list picks and custom
  entries — no separate "categories" concept needed.
- **Preferences:** the four dropdown fields (`learning_style`,
  `progression_style`, `preferred_study_time`, `recommendation_frequency`)
  are validated in **both** the controller (`preferenceOptions.js` — clear
  API errors) and the database (`CHECK` constraints — data integrity even
  if a future client skips the app check), per your explicit decision.
  Both places must be updated together if the allowed values change later.
- **Availability:** `availability_slots`, one row per day/time-range
  entry, plus the optional `weekly_available_hours` summary field on
  `student_preferences`. No overlap-prevention constraint (would need a
  Postgres exclusion constraint — more machinery than this foundation
  needs).
- **Hobbies/commitments:** structured (`name`, `description`,
  `time_commitment`), informational only — not read by any other logic
  yet, since no scheduling/recommendation system exists.
- **Digital Twin Overview:** implemented as a single read-only aggregate
  endpoint (`GET /api/digital-twin/overview`) that queries each resource
  table directly on every request — never a second copy of the data.
- **UI:** sidebar dashboard (`DigitalTwinPage.jsx`), reusing Phase 1's
  card styling and view-first/edit-mode pattern throughout. Added as a
  second nav tab alongside the existing Profile page — Phase 1's
  `ProfilePage` is unchanged and still the default view.
- **Evidence deletion does not auto-revert skill status:** if deleting a
  skill's last piece of evidence drops its evidence count to zero, a
  skill already marked `demonstrated` stays `demonstrated` rather than
  silently reverting — this wasn't explicitly specified, so I chose to
  keep the student in control of status rather than have the system
  change it behind their back. Flagging this as a judgment call, not
  something you asked for directly — happy to change it to auto-revert if
  you'd rather.

### Unresolved / for a future phase
- Whether `education_records` should ever support true multi-record
  editing in the UI (currently only the backend supports multiple rows;
  the frontend only ever shows the current one).
- Whether availability slots should eventually get overlap validation.

## Supabase Auth Migration

### Architecture decisions (approved by you before implementation)
- **Option A confirmed:** local PostgreSQL keeps all Student Guardian
  application data; Supabase is Auth-only. No Phase 2 table's foreign key
  type changed.
- **`users` repurposed** as an identity-linking table:
  `supabase_user_id UUID UNIQUE NOT NULL` added, `otp_codes` dropped.
  Every Phase 2 controller/route is unchanged — they only ever see
  `req.userId`, and how that gets set is now the only thing that's different.
- **Token verification: `getClaims()`**, not `getUser()` (avoids a network
  round-trip on Supabase's newer asymmetric-key projects) and never
  `getSession()` (explicitly spoofable server-side — never used as a
  security check anywhere in this codebase).
- **Session transport: Express-mediated httpOnly cookies**, not
  `localStorage` and not `@supabase/ssr`. `supabase-js` on the frontend
  runs with `persistSession: false` — it's used only to *perform* auth
  actions; the resulting tokens are immediately handed to
  `POST /api/auth/session` and live only in httpOnly cookies from then on.
  This was the more complex option compared to a plain `Authorization`
  header, chosen specifically to preserve Phase 1's original
  XSS-token-theft protection goal, per your explicit instruction.
- **Refresh-token lifecycle:** proactive (checked before a request fails,
  not reactively on 401) and single-flighted (`refreshLock.js`'s
  in-memory `Map` keyed by refresh token) to prevent two concurrent
  requests from both trying to rotate the same one-time-use refresh
  token. Full cookie replacement on success, full clearing on failure —
  never a half-valid state. Documented limitation: the single-flight lock
  is in-process only; would need a distributed lock (e.g. Redis) if this
  ever ran as multiple server instances behind a load balancer — not
  relevant at the current single-instance scale.
- **Change password: genuine reauthentication**, not a session-is-enough
  check. `signInWithPassword` with the current password is what actually
  proves it — if that fails, `updateUser` is never called.
- **Password minimum length: 8** — set as a Supabase dashboard
  configuration, not application code (no duplicate custom strength
  system, per your instruction).
- **Email verification and password recovery treated as separate flows**
  (`AuthCallback.jsx` vs. `ResetPasswordPage.jsx`) rather than one shared
  handler, per your explicit instruction not to assume they behave
  identically — both currently assume Supabase's PKCE (`?code=`) flow,
  flagged as needing local verification against the actual project config.
- **Migration file naming:** `schema_auth_migration.sql`, deliberately not
  `schema_phase3.sql`, to avoid colliding with the master roadmap's own
  Phase 3 (Academic Guardian).
- **Old OTP/JWT/email auth files left on disk, unmounted but not
  deleted** — per your instruction to remove them only "once fully
  implemented and verified." `index.js` no longer routes to them; they're
  inert dead code pending your local verification pass.

### Unresolved / requires your decision (unchanged from before implementation)
- What to do with any pre-existing `users` row from Phase 1 testing before
  running `schema_auth_migration.sql` (see `DATABASE_DESIGN.md`).
- Whether your specific Supabase project uses the PKCE or implicit auth
  flow for email links — code assumes PKCE, needs local confirmation.

## Education Redesign (multi-level, multi-record)

### Decisions (approved by you before implementation)
- **`education_levels` lookup table added** (School, Intermediate /
  Higher Secondary, Diploma, Undergraduate, Postgraduate, Doctorate,
  Other) — same extensible pattern as `skill_categories`, so the system
  never assumes every student is on a B.Tech path.
- **`degree_type` stays free text**, not tied to a fixed list — it needs
  to hold values as varied as "Class 11" and "M.Tech," which a fixed enum
  can't represent cleanly alongside a separate broad "level."
- **`discipline` changed from required to optional** — not every level
  has one (e.g. School, before a stream is chosen). `current_year` and
  `current_semester` were already optional in the original schema; no
  change was needed there.
- **Multiple records per student, fully supported**, e.g. Intermediate
  (completed) + B.Tech (current), or longer chains as a student
  progresses over years. Enforced entirely by the existing partial unique
  index (`is_current = true`, at most one per user) — no new constraint
  needed for this part.
- **Editing a record's details vs. switching which one is current kept as
  two separate operations** (`PUT /:id` vs. `POST /:id/set-current`), so
  "I finished X, starting Y now" doesn't get conflated with "I fixed a typo."
- **Migrated Phase 0/1 rows default to "Undergraduate"** — a reasonable
  best-effort default given those fields were always framed around a
  single college program, not a guess about any individual student; the
  student can correct it afterward like any other field.
- **Incorporated directly into `schema_phase2.sql`**, not a follow-up
  migration, since it had not been executed yet (cheapest point to change
  DDL) — per your explicit instruction.

### Unresolved
- None specific to this redesign — the two questions raised during
  inspection (fixed lookup table vs. free text for level, and approval of
  the minimum-change plan) were both resolved by your approval message.
