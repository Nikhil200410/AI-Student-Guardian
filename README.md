# AI Student Guardian

A longitudinal AI-based student digital twin for academic, skill, and career
development. See `AI_Student_Guardian_Master_Development_Prompt.docx` for the
full product vision and phase roadmap (kept unchanged, outside this repo's
code folders).

## Architecture

```
React (Vite) SPA  --->  Supabase Auth (identity, passwords, email)
       |
       +--->  Express backend  --->  local PostgreSQL (all Student Guardian data)
```

Supabase Auth owns signup, email verification, login, password reset,
password change, and logout — the frontend talks to Supabase directly for
all of that via `supabase-js`. Express only bridges the resulting Supabase
session into an httpOnly cookie and serves the actual application data
(profile, education, goals, skills, etc.) from local PostgreSQL, which
Supabase has no involvement in. Later phases add a Python/FastAPI AI
service and the Groq API for natural-language explanations — nothing
AI-related exists yet.

## Features

**Foundation (Phase 0/2):**
- Student Digital Twin: basic profile (name), education, goals, skills
  (with claimed vs. demonstrated evidence), interests, preferences, weekly
  availability, hobbies & commitments — all per-user, structured
  relational data, no AI.
- Sidebar Digital Twin dashboard alongside a basic Profile page.

**Authentication (Supabase Auth):**
- Signup with email verification, email/password login, forgot/reset
  password (email-link based), change password (with genuine
  reauthentication), logout.
- Sessions transported as httpOnly cookies (not `localStorage`), with a
  proactive, race-safe refresh-token lifecycle.
- Every API request's identity is derived from a cryptographically
  verified Supabase token — never trusted from anything the frontend sends.

## Technologies

- Frontend: React 18, Vite, Axios, `@supabase/supabase-js`
- Backend: Node.js, Express, `@supabase/supabase-js` (server-side token verification)
- Database: local PostgreSQL (all application data — Supabase is Auth-only)
- Auth/Email: Supabase Auth, using Supabase's default email service for now

## Installation

### 1. Database

Run the migration files **in this exact order** against your local Postgres:

```bash
psql "$DATABASE_URL" -f backend/src/db/schema.sql
psql "$DATABASE_URL" -f backend/src/db/schema_phase1.sql
psql "$DATABASE_URL" -f backend/src/db/schema_phase2.sql
psql "$DATABASE_URL" -f backend/src/db/schema_auth_migration.sql
```

**Before running the last one:** read the comment block at the top of
`schema_auth_migration.sql`. It adds a `NOT NULL` column that any
pre-existing `users` row (e.g. old Phase 1 test data) cannot satisfy —
you need to either start from an empty `users` table or handle those
rows first.

### 2. Supabase project setup

In your Supabase project dashboard:
- **Authentication → Providers → Email**: note your project URL and anon
  key (Settings → API) for the `.env` files below.
- **Authentication → Policies/Settings**: set minimum password length to 8.
- **Authentication → URL Configuration**: add `http://localhost:5173/auth/callback`
  and `http://localhost:5173/auth/reset-password` as allowed redirect URLs.
- Leave the default email provider as-is for now (development/testing
  only — see `docs/PROJECT_DECISION_LOG.md` for its limits and when
  you'll need custom SMTP).

### 3. Backend

```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY
npm install
npm run dev
```

Backend runs at http://localhost:5000

### 4. Frontend

```bash
cd frontend
cp .env.example .env      # fill in VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

Frontend runs at http://localhost:5173

## Current development status

Student Digital Twin foundation and the Supabase Auth migration are both
**implemented and syntax-checked only** — neither has been run against a
real database, a real Supabase project, or a real browser yet. See
`docs/PROJECT_PROGRESS.md` for the precise list of what is and isn't verified.

## Testing this locally

1. Complete Installation steps 1–4 above.
2. Sign up with a real email you can check — confirm the verification
   email arrives, click it, confirm you land back in the app logged in.
3. Log out, log back in with your password.
4. Open DevTools → Application → Cookies — confirm `sb_access_token` and
   `sb_refresh_token` are `HttpOnly`, and `localStorage` is empty.
5. Go to Profile — confirm it's name-only and saves correctly.
6. Go to Digital Twin → Education — add your degree/discipline/etc. there.
7. Try Change Password with the wrong current password — confirm it's
   rejected and the password is unchanged (verify by logging out and back
   in with the old password).
8. Try Change Password with the correct current password — confirm it
   works, and the new password logs you in afterward.
9. Use Forgot Password → click the emailed link → set a new password →
   confirm you land in the app.
10. Exercise the rest of the Digital Twin sections (goals, skills +
    evidence gate, interests, preferences, availability, hobbies) as
    normal CRUD.
11. Report back exactly what worked and what didn't, with any error
    messages — especially anything about the PKCE vs. implicit auth flow
    assumption flagged in `AuthCallback.jsx`/`ResetPasswordPage.jsx`.
