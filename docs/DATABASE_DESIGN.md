# Database Design

## Provider

**Phase 1 was set up and locally verified against a local PostgreSQL
instance** (database name `ai_student_guardian`). The original Phase 0
recommendation below (a free hosted instance) remains a fine option for
later — e.g. before deployment — since the code only reads `DATABASE_URL`
from `.env` and doesn't care which kind of Postgres is behind it.

Recommended for hosted use: a free hosted PostgreSQL instance, so no local
install is needed and the connection string works the same on any machine.

- **Supabase** (supabase.com) — free tier, includes a dashboard and
  built-in table editor, good if you also plan to explore Supabase Auth
  later (though this project uses its own Email OTP + JWT per the master
  spec, not Supabase Auth).
- **Neon** (neon.tech) — free tier, serverless Postgres, very fast to spin
  up, scales to zero when idle.

Either works fine here — pick whichever signup flow you prefer. After
creating a project, copy its connection string into `backend/.env` as
`DATABASE_URL`.

## Tables

### `users` (Phase 1, changed by the Supabase Auth migration)

| Column             | Type          | Notes                                   |
|--------------------|---------------|------------------------------------------|
| id                 | SERIAL PK     | Unchanged — every Phase 2 table's FK still points here |
| supabase_user_id   | UUID          | **New.** Unique, not null. Links to Supabase Auth's `auth.users.id` |
| email              | VARCHAR(255)  | Unique — a local convenience copy of the Supabase account's email |
| created_at         | TIMESTAMPTZ   | Set automatically                       |

**What changed:** `users` is no longer a credentials table — Supabase Auth
now owns signup, password hashing, email verification, and login entirely.
This table exists purely to link a Supabase identity (a UUID) to the
local integer id that every Phase 2 table's foreign keys already point
at, so none of that other schema had to change. A row is created the
first time a Supabase-authenticated request reaches the backend for a
given `supabase_user_id` — via `POST /api/auth/session` on first
login/signup, or defensively inside `requireAuth` if it's ever missing.

### `otp_codes` — REMOVED

Dropped by `schema_auth_migration.sql`. Supabase Auth now owns OTP/token
generation, hashing, expiry, and attempt-limiting for its own email
flows — this application no longer needs its own copy of any of that.

### `student_profile` (Phase 0, migrated in Phase 1, narrowed in Phase 2)

| Column       | Type          | Notes                                   |
|--------------|---------------|------------------------------------------|
| id           | SERIAL PK     | No longer pinned to 1                   |
| user_id      | INTEGER FK    | → users.id, unique (one profile/user)   |
| name         | VARCHAR(120)  | Required                                |
| created_at   | TIMESTAMPTZ   | Set automatically                       |
| updated_at   | TIMESTAMPTZ   | Updated on every PUT                    |

**What changed from Phase 1:** `degree`, `department`, and `semester` were
**removed** in Phase 2 (see `schema_phase2.sql`) and now live in
`education_records` instead, to avoid the same information being editable
in two places. Existing values were copied into `education_records`
*before* the columns were dropped — see "Phase 1 → Phase 2 data
migration" below.

### `education_levels` (Phase 2 — lookup table, added in the education redesign)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| name | VARCHAR(80) | Unique |
| created_at | TIMESTAMPTZ | |

Seeded with 7 starter levels (School, Intermediate / Higher Secondary,
Diploma, Undergraduate, Postgraduate, Doctorate, Other) — same lookup-table
pattern as `skill_categories`, for the same reason: a new level can be
added later with a plain `INSERT`, no migration required. This is what
keeps the system from assuming every student is on a B.Tech path.

### `education_records` (Phase 2, redesigned for multi-record support)

| Column            | Type          | Notes                                        |
|-------------------|---------------|------------------------------------------------|
| id                | SERIAL PK     |                                                |
| user_id           | INTEGER FK    | → users.id                                    |
| education_level_id | INTEGER FK  | → education_levels.id, required               |
| degree_type       | VARCHAR(120)  | Required — free text on purpose, e.g. "Class 11", "Intermediate", "B.Tech", "M.Tech" (not a fixed list, since the actual qualification name varies too much to enumerate) |
| discipline        | VARCHAR(120)  | **Optional** — e.g. "MPC", "Computer Science and Engineering"; not every level has one (e.g. School, before a stream is chosen) |
| institution       | VARCHAR(200)  | Optional                                      |
| current_year      | INTEGER       | Optional, 1–10                                |
| current_semester  | INTEGER       | Optional, 1–12                                |
| is_current        | BOOLEAN       | Default true                                  |
| created_at / updated_at | TIMESTAMPTZ | |

**A student can have any number of these rows** — e.g. Intermediate
(completed) + B.Tech (current), or a longer chain like Class 11 → Class
12 → Intermediate → B.Tech → Postgraduate as the student progresses over
time. The partial unique index — `UNIQUE (user_id) WHERE is_current =
true` — is what guarantees exactly one of them is ever marked current,
no matter how many historical records exist. Switching which record is
current (`POST /api/education/:id/set-current`) and editing a record's
own details (`PUT /api/education/:id`) are separate operations by
design, so "I finished my Diploma and I'm starting B.Tech now" (a
current-record switch) doesn't get conflated with "I misspelled my
institution name" (a plain edit).

### `goals` (Phase 2)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| user_id | INTEGER FK | → users.id |
| goal_type | VARCHAR(20) | CHECK IN ('short_term','long_term') |
| title | VARCHAR(200) | Required |
| description | TEXT | Optional |
| priority | VARCHAR(10) | CHECK IN ('low','medium','high'), default 'medium' |
| status | VARCHAR(20) | CHECK IN ('active','completed','paused','abandoned'), default 'active' |
| target_date | DATE | Optional |
| created_at / updated_at | TIMESTAMPTZ | |

Multiple goals per user, any mix of short/long-term.

### `skill_categories` (Phase 2 — lookup table)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| name | VARCHAR(80) | Unique |
| created_at | TIMESTAMPTZ | |

Seeded by `schema_phase2.sql` with 14 starter categories (Programming
Languages, Frameworks & Libraries, Databases, Web Development, Mobile
Development, AI & Machine Learning, Data Science, Cloud & DevOps,
Cybersecurity, Data Structures & Algorithms, Tools & Platforms, Soft
Skills, Domain Knowledge, Other). **Why a table instead of a `CHECK`
constraint:** new categories can be added later with a plain `INSERT` —
no migration required, unlike a hard-coded enum.

### `skills` (Phase 2)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| user_id | INTEGER FK | → users.id |
| category_id | INTEGER FK | → skill_categories.id, NOT NULL |
| custom_category_label | VARCHAR(120) | Only meaningful when category = "Other" |
| name | VARCHAR(120) | Required, unique per user |
| status | VARCHAR(20) | CHECK IN ('claimed','demonstrated'), default 'claimed' |
| created_at / updated_at | TIMESTAMPTZ | |

**The claimed vs. demonstrated rule is enforced in the backend
controller** (`skills.controller.js`), not the database: before accepting
a change to `status = 'demonstrated'`, the controller checks that at
least one `skill_evidence` row exists for that skill and rejects the
request with a 400 error otherwise. A skill is always created as
`claimed` — never demonstrated by default.

### `skill_evidence` (Phase 2)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| skill_id | INTEGER FK | → skills.id, `ON DELETE CASCADE` |
| evidence_type | VARCHAR(20) | CHECK IN ('project','certificate','coding_problem','other') |
| description | TEXT | Required |
| link | VARCHAR(500) | Optional |
| created_at | TIMESTAMPTZ | |

Deliberately generic (`evidence_type` is a text bucket, not a foreign key
into a projects/coding-platform table) since those modules don't exist
yet — keeps Phase 2 fully decoupled from future phases.

### `interests` (Phase 2)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| user_id | INTEGER FK | → users.id |
| name | VARCHAR(100) | Unique per user |
| created_at | TIMESTAMPTZ | |

One row per interest, whether picked from a frontend-side suggested list
or typed as a custom value — both are stored identically; no separate
"categories" concept was needed here.

### `student_preferences` (Phase 2)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| user_id | INTEGER FK | → users.id, unique |
| learning_style | VARCHAR(30) | CHECK IN ('visual','hands_on','reading','mixed') |
| progression_style | VARCHAR(30) | CHECK IN ('gradual','challenge_first') |
| preferred_study_time | VARCHAR(30) | CHECK IN ('morning','afternoon','evening','night') |
| recommendation_frequency | VARCHAR(20) | CHECK IN ('daily','weekly','biweekly') |
| weekly_available_hours | INTEGER | Optional, >= 0 |
| created_at / updated_at | TIMESTAMPTZ | |

Validated in **both** places per the approved decision: the controller
checks against `backend/src/utils/preferenceOptions.js` (clear API error
messages), and the database `CHECK` constraints enforce the same values
independently (protection even if a future client skips the app-level
check). Extending the allowed values later needs a small update in both
places — they must stay in sync.

### `availability_slots` (Phase 2)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| user_id | INTEGER FK | → users.id |
| day_of_week | VARCHAR(10) | CHECK IN the 7 weekday names |
| start_time | TIME | Required |
| end_time | TIME | Required, `CHECK (end_time > start_time)` |
| created_at | TIMESTAMPTZ | |

Multiple slots per user (one row per "Monday 6–8 PM"–style entry). No
overlap-prevention constraint — that would need a Postgres exclusion
constraint, more machinery than this foundation needs; left as a
possible future improvement if it matters.

### `hobbies_commitments` (Phase 2)

| Column | Type | Notes |
|---|---|---|
| id | SERIAL PK | |
| user_id | INTEGER FK | → users.id |
| name | VARCHAR(120) | Required |
| description | TEXT | Optional |
| time_commitment | VARCHAR(60) | Optional, free text (e.g. "3 hrs/week") |
| created_at / updated_at | TIMESTAMPTZ | |

Informational only in Phase 2 — not used by any scheduling or
recommendation logic (none exists yet).

## Relationships

`student_profile.user_id → users.id` (one-to-one)
`education_records.user_id → users.id` (one-to-many, one `is_current=true` enforced), `education_records.education_level_id → education_levels.id` (many-to-one)
`goals.user_id → users.id` (one-to-many)
`skills.user_id → users.id` (one-to-many), `skills.category_id → skill_categories.id` (many-to-one)
`skill_evidence.skill_id → skills.id` (one-to-many, cascades on delete)
`interests.user_id → users.id` (one-to-many)
`student_preferences.user_id → users.id` (one-to-one)
`availability_slots.user_id → users.id` (one-to-many)
`hobbies_commitments.user_id → users.id` (one-to-many)

## Phase 1 → Phase 2 data migration

`schema_phase2.sql` copies each user's existing `student_profile.degree` /
`department` / `semester` into a new `education_records` row
(`is_current = true`) **before** dropping those columns from
`student_profile` — implemented as an `INSERT ... SELECT` that only runs
for rows with a non-null `degree`, guarded so it won't create a duplicate
if the migration is ever re-run. `current_year` is left `NULL` for
migrated rows — Phase 0/1 never collected a "year" value, only
"semester," so there is nothing to derive it from; it was **not** guessed
from semester, per instruction. `education_level_id` is set to
"Undergraduate" for migrated rows — a reasonable default given Phase 0/1's
profile fields were always framed around a single college program, not a
guess about any individual student's actual level; correctable afterward
via the Education section like any other field. Future phases will add
more tables (academics, coding activity, projects, career goals) that
also reference `users.id`.

## Supabase Auth migration (`schema_auth_migration.sql`)

Adds `users.supabase_user_id UUID UNIQUE NOT NULL` and drops `otp_codes`.
Run this **after** `schema_phase2.sql`.

**Open issue, not silently resolved:** any pre-existing row in `users`
(e.g. a Phase 1 test account created via the old OTP flow) has no
corresponding Supabase identity and cannot be safely backfilled — there's
no way to know which Supabase account, if any, should own it. The
migration does not guess. Before running it, either start from an empty
`users` table, or manually decide what to do with existing rows. See the
comment block at the top of `schema_auth_migration.sql` for the exact
options.
