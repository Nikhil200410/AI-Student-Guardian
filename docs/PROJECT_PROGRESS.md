# Project Progress

## Completed phases
- **Phase 0 — Project Foundation**: React + Vite frontend, Express backend,
  PostgreSQL connection, health-check API, basic single-record Student
  Profile CRUD (card-based UI). Tested successfully by the student.
- **Phase 1 — Authentication (custom OTP)**: originally locally tested and
  verified, but **fully replaced by the Supabase Auth migration below.**
  Kept here for history only — this flow no longer runs.
- **Phase 2 — Student Digital Twin Foundation**: `education_records`,
  `goals`, `skill_categories`, `skills`, `skill_evidence`, `interests`,
  `student_preferences`, `availability_slots`, `hobbies_commitments`
  tables; full REST CRUD for every resource; the claimed→demonstrated
  skill-evidence gate; a sidebar `DigitalTwinPage` with 8 sections. A real
  bug from the original Phase 2 delivery — `profile.controller.js` and the
  Profile frontend still referencing `degree`/`department`/`semester`
  after `schema_phase2.sql` drops those columns — was found and fixed in
  this round (see "Supabase Auth Migration" below). **Education was
  subsequently redesigned** to support multiple education levels and
  multiple records per student (e.g. Intermediate → B.Tech, not just a
  single B.Tech-shaped record) — see "Education Redesign" below. **Built
  and syntax-checked, still NOT executed against a real database or browser.**
- **Education Redesign**: `education_levels` lookup table added (School,
  Intermediate / Higher Secondary, Diploma, Undergraduate, Postgraduate,
  Doctorate, Other); `education_records` now references it via
  `education_level_id`, `discipline` changed from required to optional,
  and the resource now supports any number of records per student with
  at most one current (`POST /api/education/:id/set-current` added as an
  atomic operation). Frontend `EducationSection.jsx` rewritten from a
  single-record view to a full history list. Folded directly into
  `schema_phase2.sql` since it had not yet been executed. **Built and
  syntax-checked only — not yet run against a real database.**
- **Supabase Auth Migration**: custom OTP/JWT/email authentication
  replaced with Supabase Auth (signup, email verification, login, forgot/
  reset/change password, logout, rate limiting all Supabase-owned). Local
  PostgreSQL kept for all application data (Option A) — `users` table
  repurposed as an identity-linking table (`supabase_user_id UUID UNIQUE
  NOT NULL`), every Phase 2 table's foreign key unchanged. Session
  transport: Express-mediated httpOnly cookies (not `localStorage`, not
  `@supabase/ssr`) to preserve the original httpOnly security goal.
  Token verification via `getClaims()` (never the spoofable
  `getSession()`). Refresh-token lifecycle: proactive + single-flight
  locked, to prevent two concurrent requests from racing to rotate the
  same one-time-use refresh token. Change-password requires genuine
  reauthentication (`signInWithPassword` with the current password),
  not a bare "session exists" check. **Built and syntax-checked only —
  see "Not yet verified" below; this is a large, security-sensitive
  change that has not touched a real Supabase project, a real database,
  or a real browser.**

## Current phase
Supabase Auth Migration — awaiting your local testing and approval.

## Pending phases (master roadmap — unaffected by this auth work)
3. Academic Guardian
4. Skill-Gap Analyzer
5. Coding Guardian
6. External Coding Platform Integration
7. Mistake Intelligence
8. Groq AI Integration
9. Project Guardian
10. Career Guardian
11. Resume and Portfolio Intelligence
12. Interview Guardian
13. Context-Aware Personal Planner
14. Next-Best-Action Engine
15. Final Integration

## Working features (pending your local verification)
- `POST /api/auth/session`, `POST /api/auth/logout`, `GET /api/auth/me`
  — Supabase session bridge (see API_DOCUMENTATION.md)
- `GET/POST/PUT/DELETE /api/profile` — name-only as of this round's fix
- All Phase 2 resource endpoints — unchanged, still `req.userId`-scoped
- Frontend: Signup, Login, Forgot Password, Reset Password (email-link
  callback), Change Password (with reauthentication), email verification
  callback, Profile page, Digital Twin dashboard

## Known bugs — fixed this round
- `profile.controller.js` and `ProfileForm.jsx`/`ProfileCard.jsx` still
  referenced `degree`/`department`/`semester` after `schema_phase2.sql`
  drops those columns — would have broken the Profile page the moment the
  migration ran. Fixed: profile is now name-only everywhere.

## Known bugs — open / unverified
None found, but also none ruled out — nothing in this round has actually
run yet. See "Not yet verified" below.

## Not yet verified (be precise: static checks only, not execution)
- `schema_auth_migration.sql` has not been run against any database.
- No Supabase project has actually issued or verified a real token
  against this code.
- No signup/login/logout/reset/change-password flow has been exercised
  in a browser.
- The refresh-token single-flight lock has not been exercised under a
  real concurrent race.
- Whether your specific Supabase project's email links use the PKCE
  (`?code=`) flow this code assumes, vs. the older implicit flow, has not
  been confirmed.
- What (if anything) exists in your local `users` table from earlier
  Phase 1 testing, and how that interacts with the new `NOT NULL`
  `supabase_user_id` column, has not been resolved.

## Next task
Run `schema_auth_migration.sql`, configure your Supabase project
(minimum password length 8, redirect URLs for `/auth/callback` and
`/auth/reset-password`), fill in both `.env` files, and work through the
full local test list before this is considered verified. See the report
at the end of this implementation message for exact steps.
