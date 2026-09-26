# AI Student Guardian

A longitudinal AI-based student digital twin for academic, skill, and career
development. See `AI_Student_Guardian_Master_Development_Prompt.docx` for the
full product vision and phase roadmap (kept unchanged, outside this repo's
code folders).

## Architecture (current: Phase 0)

```
React (Vite) frontend  --->  Express backend  --->  PostgreSQL
```

Later phases add a Python/FastAPI AI service and the Groq API for
natural-language explanations. Nothing AI-related exists yet — Phase 0 is
pure CRUD plumbing on purpose.

## Features

**Phase 0:**
- Health-check API (`GET /api/health`) that also confirms the database is reachable.
- Basic Student Profile CRUD (name, degree, department, semester).
- Card-based frontend UI for viewing/creating/editing/deleting that profile.

**Phase 1:**
- Email OTP + JWT login (no passwords).
- Student Profile is now per-user, protected behind login.
- Frontend: login screen, session-aware routing, logout button.

## Technologies

- Frontend: React 18, Vite, Axios
- Backend: Node.js, Express, jsonwebtoken, bcryptjs
- Database: PostgreSQL (hosted — Supabase or Neon recommended)
- Email: Resend (for OTP codes)

## Installation

### 1. Database

Create a free Postgres database (see `docs/DATABASE_DESIGN.md` for the
recommended providers and setup steps), then run both schema files, in order:

```bash
psql "$DATABASE_URL" -f backend/src/db/schema.sql
psql "$DATABASE_URL" -f backend/src/db/schema_phase1.sql
```

### 2. Email (Resend)

Sign up at resend.com (free tier), create an API key. For quick local
testing you can send from their default `onboarding@resend.dev` address —
no domain verification needed yet.

### 3. Backend

```bash
cd backend
cp .env.example .env      # fill in DATABASE_URL, RESEND_API_KEY, and JWT_SECRET
npm install
npm run dev
```

Generate a `JWT_SECRET` with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Backend runs at http://localhost:5000

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173. Open it, enter your email, check
your inbox for the code, and log in.

## Current development status

Phase 0 (Project Foundation) and Phase 1 (Authentication) — complete,
Phase 1 pending your review/testing. See `docs/PROJECT_PROGRESS.md` for
details.
