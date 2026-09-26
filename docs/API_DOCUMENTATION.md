# API Documentation

## Authentication (Supabase Auth)

Signup, login, email verification, password reset/change, and logout all
happen **client-side**, directly against Supabase (via `supabase-js`) —
not through this Express API. This API only bridges the resulting
Supabase session into an httpOnly cookie session, and verifies that
cookie on every protected request.

All `/api/profile`, `/api/education`, `/api/goals`, etc. routes require a
valid session — send requests with `withCredentials: true` (frontend
already does this everywhere) so the `sb_access_token` cookie is
included. Without it, they return `401`.

### POST /api/auth/session
Called by the frontend immediately after any successful Supabase auth
action (signup, login, email-link verification, password reset/change) —
never called directly by a user.
- **Request body:** `{ "access_token": "...", "refresh_token": "..." }`
- Verifies `access_token` with Supabase's `getClaims()`, finds-or-creates
  the matching local `users` row (linked by `supabase_user_id`), and sets
  `sb_access_token` + `sb_refresh_token` as httpOnly cookies.
- **Response 200:** `{ "user": { "id": 1, "email": "..." } }`
- **Response 400:** missing tokens
- **Response 401:** token failed verification
- **Response 409:** an old local account with this email exists but isn't
  linked to a Supabase identity yet (see `schema_auth_migration.sql`)

### POST /api/auth/logout
Clears both session cookies. (The frontend also calls `supabase.auth.signOut()`
separately — both are needed, since we hold our own copy of the tokens.)
- **Response 204:** no body

### GET /api/auth/me
Returns the logged-in user, or 401 if not logged in. On every call,
`requireAuth` transparently refreshes the access token first if it's
near/past expiry (single-flight — see `refreshLock.js` — so concurrent
requests never race to rotate the same refresh token).
- **Response 200:** `{ "user": { "id": 1, "email": "..." } }`
- **Response 401:** `{ "error": "Not logged in." }` or `{ "error": "Session expired. Please log in again." }`

---

## GET /api/health
Checks that the server is running and can reach the database.
- **Auth:** none
- **Response 200:**
```json
{ "status": "ok", "database": "connected" }
```
- **Response 500:**
```json
{ "status": "error", "database": "unreachable" }
```

---

## GET /api/profile
Returns the logged-in user's stored student profile (basic identity only
as of Phase 2 — see Education below for degree/discipline/etc).
- **Auth:** required (`requireAuth` — see Authentication section above)
- **Response 200:**
```json
{
  "id": 1,
  "name": "Priya Sharma",
  "created_at": "2026-09-18T10:00:00.000Z",
  "updated_at": "2026-09-18T10:00:00.000Z"
}
```
- **Response 401:** not logged in
- **Response 404:** `{ "error": "No profile has been created yet." }`

---

## POST /api/profile
Creates the logged-in user's profile. Fails if they already have one.
- **Auth:** required
- **Request body:**
```json
{ "name": "Priya Sharma" }
```
- **Response 201:** the created profile (same shape as GET)
- **Response 400:** `{ "error": "Validation failed", "details": ["..."] }`
- **Response 401:** not logged in
- **Response 409:** `{ "error": "A profile already exists. Use PUT /api/profile to update it instead." }`

---

## PUT /api/profile
Updates the logged-in user's existing profile.
- **Auth:** required
- **Request body:** same shape as POST
- **Response 200:** the updated profile
- **Response 400:** validation errors (same shape as POST)
- **Response 401:** not logged in
- **Response 404:** `{ "error": "No profile exists yet. Use POST /api/profile to create one." }`

---

## DELETE /api/profile
Deletes the logged-in user's profile.
- **Auth:** required
- **Response 204:** no body
- **Response 401:** not logged in
- **Response 404:** `{ "error": "No profile exists to delete." }`

---

# Phase 2 — Student Digital Twin Foundation

All endpoints below require authentication (`requireAuth`) and are scoped
to the logged-in user — every query filters by the local `userId` derived
from the verified Supabase identity, never from anything the client
sends. Ownership is checked before any read, update, or delete of a
specific record.

## Education

A student can have any number of education records (e.g. Intermediate,
completed, plus B.Tech, current) — not just one. `education_level_id`
categorizes each record into a small, extensible set of levels (not
B.Tech-specific); `degree_type` holds the actual qualification/class name
as free text (e.g. "Class 11", "B.Tech", "M.Tech").

### GET /api/education/levels
Read-only list of `{ id, name }` for the level dropdown (School,
Intermediate / Higher Secondary, Diploma, Undergraduate, Postgraduate,
Doctorate, Other). No write endpoints — managed directly in the database,
same as skill categories.

### GET /api/education
Lists **all** of the user's education records — current first, then most
recently added — each with `education_level_name` joined in.

### GET /api/education/current
Returns just the current (`is_current = true`) record, or 404 if none exists yet.

### POST /api/education
Creates a new education record. Unlike before, this does **not** fail if
the student already has a current record — it just adds another one.
- **Body:** `{ "education_level_id", "degree_type", "discipline"?, "institution"?, "current_year"?, "current_semester"?, "is_current"? }`
- If `is_current: true` is sent (or this is the student's very first
  record ever), any existing current record is atomically un-marked
  first — the database is never left with zero or two current records.
- Otherwise the new record is added as historical (`is_current: false`).
- 400 if `education_level_id` doesn't match a known level.

### PUT /api/education/:id
Edits a record's own fields (level, degree_type, discipline, institution,
year, semester). Does **not** change which record is current — use
`set-current` below for that. 404 if not found/not owned.

### POST /api/education/:id/set-current
Atomically makes this record current and un-marks whatever was current
before, in one transaction — never leaves zero or two current records,
even under concurrent requests. 404 if not found/not owned.

### DELETE /api/education/:id
Deletes an education record owned by the user.

---

## Goals

### GET /api/goals?type=short_term|long_term
Lists the user's goals, optionally filtered by type.

### POST /api/goals
- **Body:** `{ "goal_type", "title", "description"?, "priority"?, "status"?, "target_date"? }`
- `goal_type`: `short_term` | `long_term`. `priority`: `low`|`medium`|`high` (default `medium`).
  `status`: `active`|`completed`|`paused`|`abandoned` (default `active`).

### PUT /api/goals/:id · DELETE /api/goals/:id
Standard update/delete, ownership-checked.

---

## Skill Categories

### GET /api/skill-categories
Read-only list of `{ id, name }` for the skill-add dropdown. No write
endpoints in Phase 2 — categories are managed directly in the database.

---

## Skills & Evidence

### GET /api/skills
Lists the user's skills with their category name joined in.

### POST /api/skills
Always creates as `status: "claimed"`.
- **Body:** `{ "name", "category_id", "custom_category_label"? }`
- 400 if `category_id` doesn't match a known category. 409 on duplicate name.

### PUT /api/skills/:id
Updates name/category and/or status.
- **Skill rule:** changing `status` to `"demonstrated"` is rejected with
  400 unless at least one `skill_evidence` row already exists for that
  skill. Never happens automatically.

### DELETE /api/skills/:id
Deletes the skill and all its evidence (cascade).

### GET /api/skills/:id/evidence
Lists evidence for a skill owned by the user. 404 if the skill isn't theirs.

### POST /api/skills/:id/evidence
- **Body:** `{ "evidence_type", "description", "link"? }`
- `evidence_type`: `project`|`certificate`|`coding_problem`|`other`

### DELETE /api/skills/:id/evidence/:evidenceId
Removes one piece of evidence. (Does not automatically revert the skill's
status back to `claimed` if this drops the evidence count to zero — the
student remains in control of status.)

---

## Interests

### GET /api/interests · POST /api/interests · DELETE /api/interests/:id
- POST body: `{ "name" }`. 409 on duplicate name for this user.

---

## Preferences

### GET /api/preferences
404 if not yet configured.

### POST /api/preferences
Creates the single preferences row. 409 if it already exists (use PUT).

### PUT /api/preferences
- **Body:** `{ "learning_style"?, "progression_style"?, "preferred_study_time"?, "recommendation_frequency"?, "weekly_available_hours"? }`
- Allowed values (enforced both here and by the database):
  - `learning_style`: visual, hands_on, reading, mixed
  - `progression_style`: gradual, challenge_first
  - `preferred_study_time`: morning, afternoon, evening, night
  - `recommendation_frequency`: daily, weekly, biweekly

---

## Availability

### GET /api/availability · POST /api/availability · DELETE /api/availability/:id
- POST body: `{ "day_of_week", "start_time", "end_time" }` — times as `"HH:MM"` 24-hour.
- `day_of_week`: monday–sunday. 400 if `end_time` isn't after `start_time`.

---

## Hobbies & Commitments

### GET /api/hobbies · POST /api/hobbies · PUT /api/hobbies/:id · DELETE /api/hobbies/:id
- Body: `{ "name", "description"?, "time_commitment"? }`

---

## Digital Twin Overview

### GET /api/digital-twin/overview
Lightweight dashboard summary — **not** a duplicate data store; each field
is read fresh from its own resource table on every request.
```json
{
  "profileName": "Nikhil",
  "currentEducation": { "degree_type": "...", "discipline": "...", "current_year": null, "current_semester": 8 },
  "goalCounts": { "active": 2, "completed": 1, "paused": 0, "abandoned": 0 },
  "skillCounts": { "claimed": 4, "demonstrated": 1 },
  "interestCount": 3,
  "preferencesConfigured": true,
  "weeklyAvailableHoursFromPreferences": 10,
  "weeklyAvailabilityHoursFromSlots": 6,
  "hobbyCount": 2
}
```
