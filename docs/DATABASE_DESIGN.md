# Database Design

## Provider (Phase 0 decision)

Recommended: a free hosted PostgreSQL instance, so no local install is
needed and the connection string works the same on any machine.

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

### `users` (Phase 1)

| Column       | Type          | Notes                                   |
|--------------|---------------|------------------------------------------|
| id           | SERIAL PK     |                                          |
| email        | VARCHAR(255)  | Unique, lowercased before storing       |
| created_at   | TIMESTAMPTZ   | Set automatically                       |

Created the first time someone verifies an OTP for a new email address —
there's no separate "sign up" step; verifying a code IS the sign-up.

### `otp_codes` (Phase 1)

| Column       | Type          | Notes                                   |
|--------------|---------------|------------------------------------------|
| id           | SERIAL PK     |                                          |
| email        | VARCHAR(255)  | Not unique — a new row per code sent    |
| code_hash    | VARCHAR(255)  | bcrypt hash of the 6-digit code         |
| attempts     | INTEGER       | Wrong-guess counter, max 5              |
| expires_at   | TIMESTAMPTZ   | 10 minutes after creation, by default   |
| created_at   | TIMESTAMPTZ   | Also used for the resend cooldown       |

The raw code is never stored — only its bcrypt hash — same principle as
password hashing. Old rows just accumulate for now (fine for a student
project); a cleanup job could delete expired rows later if it matters.

### `student_profile` (Phase 0, migrated in Phase 1)

| Column       | Type          | Notes                                   |
|--------------|---------------|------------------------------------------|
| id           | SERIAL PK     | No longer pinned to 1                   |
| user_id      | INTEGER FK    | → users.id, unique (one profile/user)   |
| name         | VARCHAR(120)  | Required                                |
| degree       | VARCHAR(120)  | Required, e.g. "B.Tech"                 |
| department   | VARCHAR(120)  | Required, e.g. "Computer Science"       |
| semester     | INTEGER       | Required, 1–12                          |
| created_at   | TIMESTAMPTZ   | Set automatically                       |
| updated_at   | TIMESTAMPTZ   | Updated on every PUT                    |

**What changed from Phase 0:** the `CHECK (id = 1)` single-row constraint
is gone (see `schema_phase1.sql`). Every profile row now belongs to a real
user via `user_id`, and a unique index enforces one profile per user.

## Relationships

`student_profile.user_id → users.id` (one-to-one, so far). Future phases
will add more tables (academics, skills, coding activity, projects, career
goals) that also reference `users.id`.
