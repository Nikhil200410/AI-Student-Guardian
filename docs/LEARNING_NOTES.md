# Learning Notes

## Concepts learned (Phase 0)

**Routes vs. Controllers**
A *route* just says "when a GET request comes in for `/api/profile`, call
this function." A *controller* is that function — it does the actual work
(read the request, talk to the database, send a response). Splitting them
keeps each file small and focused.

**Connection pool**
`db.js` creates one `Pool` object, shared by the whole app, instead of
opening a new database connection for every request. Connections are
expensive to create, so the pool keeps a few open and reuses them.

**async/await**
Talking to a database takes time (it's a network call). `async function`
and `await` let the code "pause" at `await db.query(...)` without blocking
the whole server — other requests can still be handled while this one
waits.

**Middleware**
`app.use(cors(...))` and `app.use(express.json())` are *middleware* —
functions that run on every request before it reaches your route handlers.
`express.json()` specifically is what turns the raw request body into the
JavaScript object you access as `req.body`.

**Controlled React inputs**
In `ProfileForm.jsx`, every `<input>`'s value comes from React state
(`values`), and `onChange` updates that state. This is a "controlled
component" — React is the single source of truth for what's in the box,
not the browser's own DOM state.

**Loading / empty / error states**
`ProfilePage.jsx` explicitly handles: still loading (`profile === undefined`),
no profile yet (`profile === null`), and a network/server error (`error`).
This is deliberate — real apps almost always need all three, not just the
"happy path" of data being there.

## Concepts learned (Phase 1)

**Why hash the OTP code at all?**
If your database were ever read by someone unauthorized (a leak, a
misconfigured backup), stored plaintext codes would let them log in as
anyone who'd recently requested one. Hashing means even the database
owner can't recover the original code — only *verify* a guess against it,
via `bcrypt.compare`. This is the same reason passwords are hashed, never
stored as-is.

**What a JWT actually is**
A JWT (JSON Web Token) is just a signed, tamper-proof piece of text — here,
it contains `{ userId: 5 }` plus an expiry, signed with `JWT_SECRET`. The
server doesn't need to look anything up to "check" it — it just verifies
the signature matches, which proves the payload hasn't been altered since
the server issued it. That's why `requireAuth` can trust `payload.userId`
without a database call: the signature is the guarantee, not a lookup.

**The `users` ↔ `student_profile` relationship**
`student_profile.user_id` is a foreign key pointing at `users.id`, with a
unique index so each user has at most one profile. This is the standard
"one owns the other" pattern in a relational database: the profile can't
exist without a user, and every profile query filters `WHERE user_id = $1`
using the id taken from the verified JWT — never from anything the client
sends — so one user can never read or edit another user's profile.

**REST CRUD, in this project's terms**
"CRUD" = Create, Read, Update, Delete. The Student Profile resource maps
directly onto HTTP methods: `POST /api/profile` (create), `GET
/api/profile` (read), `PUT /api/profile` (update), `DELETE /api/profile`
(delete) — all under one URL, distinguished only by HTTP method. This
pattern will repeat for every future resource (academics, skills, etc.).

**How the React frontend talks to the Express backend**
The frontend never touches the database directly — it can't, and
shouldn't. `frontend/src/api/*.js` files wrap `axios` calls to the
backend's HTTP endpoints; components call those functions and get plain
JavaScript objects back. This separation is why the backend can be tested
independently (e.g. with `curl`) even before the frontend exists, and why
swapping the frontend's UI later won't require touching the backend at
all.

**httpOnly cookies vs. localStorage**
`localStorage` is readable by any JavaScript running on your page —
including malicious code injected via an XSS bug (e.g. from a dependency
or a bad third-party script). An `httpOnly` cookie is invisible to
JavaScript entirely; only the browser attaches it to requests
automatically. That's why `req.cookies.token` works server-side but
`document.cookie` wouldn't show it in the browser console.

Important nuance: this blocks token *theft* (an attacker's script reading
and exfiltrating the token), but it doesn't make XSS harmless. Injected
script can still make authenticated requests from the victim's browser —
the cookie gets attached automatically, so the attacker doesn't need to
read it to abuse it. httpOnly cookies remove one specific risk; they're
not a substitute for actually preventing XSS in the first place.

**Why CORS needs `credentials: true` on *both* sides**
By default, browsers won't send cookies on cross-origin requests (frontend
on :5173, backend on :5000 counts as cross-origin even on localhost).
`withCredentials: true` on the frontend's axios instance says "please
attach cookies"; `credentials: true` in the backend's `cors()` config says
"I'll accept cookies from that origin." Both are required — either one
alone silently fails.

**Migrations, not just "editing the schema"**
`schema_phase1.sql` doesn't rewrite `schema.sql` — it's a *new* file that
`ALTER`s the existing table. This mirrors how real projects evolve a
production database: you can't just redefine a table from scratch once it
might have real data in it: you write a migration that transforms what's
already there.

**Middleware chaining (`router.use(requireAuth)`)**
Instead of adding `requireAuth` to every single route handler in
`profile.routes.js`, `router.use(requireAuth)` applies it to every route
defined after that line on this router. One line protects the whole
resource.

## Concepts learned (Phase 2)

**Lookup tables vs. hardcoded enums**
`skill_categories` is a real table with rows, not a `CHECK (category IN
(...))` constraint. The difference matters: adding a new category to a
`CHECK` constraint requires a schema migration (an `ALTER TABLE`); adding
one to a lookup table is just `INSERT INTO skill_categories (name) VALUES
(...)` — no migration, no downtime, no code deploy even. Meanwhile
`student_preferences` *does* use `CHECK` constraints, because those
dropdown values are simpler and less likely to need runtime extension —
different tradeoffs for different fields, chosen deliberately rather than
applying one pattern everywhere.

**Enforcing a business rule in the backend, not the database**
"A skill can't become `demonstrated` without evidence" is checked in
`skills.controller.js` with a plain `SELECT ... LIMIT 1` before the
`UPDATE` runs — not a database trigger. Triggers are powerful but harder
to read, test, and debug than an if-statement in a controller you can
step through. For a rule this specific to one API action, the simpler
tool (application code) usually beats the more powerful one (a trigger).

**Defense in depth: validating the same rule twice**
Preferences are checked against an allow-list in JavaScript *and* by a
`CHECK` constraint in Postgres. This looks redundant but isn't: the JS
check gives a fast, friendly error message back to the API caller; the
database check is what actually guarantees no bad data can ever get in,
even from a bug in the controller or a completely different client
talking to the same database later. Losing either one weakens a different
part of the system.

**A safe column migration: copy, verify, then drop**
`schema_phase2.sql` moves `degree`/`department`/`semester` out of
`student_profile` in three ordered steps: (1) create the new table, (2)
`INSERT ... SELECT` the existing data into it, (3) only then `ALTER TABLE
... DROP COLUMN`. Reordering these — dropping first — would permanently
destroy data with no way to recover it. This "copy before you remove" shape
is the standard way real applications evolve schemas that already hold data.

**Partial unique indexes (`WHERE is_current = true`)**
A normal `UNIQUE` constraint on `user_id` in `education_records` would
only ever allow one row per user, period — blocking the "multiple
education records later" requirement entirely. `CREATE UNIQUE INDEX ...
WHERE is_current = true` instead says "at most one row per user *among
rows where this condition holds*" — so a user can have many
non-current rows, but never two marked current at once. This is what lets
Phase 2 stay simple today while leaving room for history later.

**Aggregating several queries into one API response**
`GET /api/digital-twin/overview` runs several small, independent queries
(via `Promise.all`, so they run concurrently rather than one after
another) and combines the results into one small JSON object for the
dashboard. It intentionally does **not** become a second place where
detailed goal/skill/etc. data lives — it recomputes the summary from the
real tables on every request, so there's only ever one source of truth to
keep correct.

## Concepts learned (Supabase Auth migration)

**Identity provider vs. application database — two different jobs**
Supabase Auth now owns "who is this person and do they know their
password" — signup, verification, password hashing, reset. Your local
PostgreSQL still owns "what does this student's digital twin look like" —
goals, skills, education. These are genuinely different concerns, and
keeping them in separate systems (linked by one UUID column) is a common,
deliberate pattern — not a compromise. It's *why* almost none of Phase 2
had to change: the application-data half of the system never cared how
identity was proven, only that `req.userId` could be trusted.

**Verified claims vs. a stored session — `getClaims()` vs. `getSession()`**
`getSession()` just reads whatever's sitting in local/cookie storage — on
a server, that's attacker-controllable input, exactly like trusting a
`userId` the frontend sent you. `getClaims()` cryptographically verifies
the token's signature before trusting anything inside it. The rule this
project follows: server-side authorization decisions use verified data
only, never a bare read.

**Why refresh tokens need a lock, not just a retry**
A refresh token is like a single-use coupon — once redeemed, Supabase
issues a new one and the old one stops working. If your code just says
"got a 401? try refreshing," two nearly-simultaneous requests can both
grab the *same* coupon and try to redeem it — only one wins, and the
other now looks like an attack (reusing an already-spent token) even
though it's just your own app racing itself. The single-flight
`Map<refreshToken, Promise>` in `refreshLock.js` makes every concurrent
caller await the *same* in-flight refresh instead of starting a second
one — the race is prevented rather than handled after the fact.

**Reauthentication vs. "the session is proof enough"**
`updateUser({password})` will happily change your password just because
you're logged in — it doesn't ask you to re-prove you know the *old* one.
`ChangePasswordPage.jsx` adds that proof back deliberately, by calling
`signInWithPassword` with the claimed current password first. If someone
walks up to your unlocked laptop with your app open, "just logged in" is
not the same guarantee as "just typed the current password correctly" —
this is why the extra step matters even though Supabase doesn't force it.

**Two different email-link flows, not one**
An email confirmation link and a password recovery link look similar (both
land the browser back on your site with a code to exchange) but represent
different intentions — one activates an account, the other authorizes a
one-time password change. Treating them as the same handler risks a
confirmation link accidentally landing someone in a "set new password"
flow, or vice versa. `AuthCallback.jsx` and `ResetPasswordPage.jsx` are
separate components on purpose, even though today their code looks similar.

## Practice tasks
1. Change the `semester` validation range (currently 1–12) to something
   else and confirm both the backend (400 error) and the frontend (form
   error) reject an out-of-range value.
2. Add a new read-only field to the profile, e.g. `college` — you'll need
   to touch: `schema.sql`, the controller's `validateProfileInput` +
   SQL statements, `ProfileForm.jsx`, and `ProfileCard.jsx`. This exercises
   the full stack in one small change.
3. Temporarily stop the backend server while the frontend is running, then
   reload the page — confirm you see "Backend unreachable" and "Could not
   reach the server" rather than a blank crash.

### Phase 2 practice tasks
7. Try to mark a skill "demonstrated" via `PUT /api/skills/:id` with no
   evidence added yet (e.g. with `curl` or a REST client) — confirm you
   get a 400 error, then add one evidence entry and retry successfully.
8. Add a new predefined skill category directly in the database
   (`INSERT INTO skill_categories (name) VALUES ('Blockchain');`), then
   refresh the Skills section's "add skill" form — confirm the new option
   appears with zero code changes.
9. Try to fetch or delete another user's goal by guessing its numeric id
   while logged in as yourself — confirm you get a 404, not their data
   (every Phase 2 query filters by `req.userId`, never the id alone).

### Supabase Auth practice tasks
10. Sign up, then open DevTools → Application → Cookies — confirm
    `sb_access_token`/`sb_refresh_token` are `HttpOnly`, and confirm
    `localStorage` is empty (nothing from Supabase persisted there).
11. In Change Password, deliberately enter the wrong current password —
    confirm the new password is rejected and never actually applied
    (check by logging out and logging back in with the OLD password).
12. Open two tabs logged in as the same user, wait until the access token
    is near expiry, then trigger an API call in both tabs at nearly the
    same time — confirm both succeed (the single-flight lock prevented a
    double-refresh race) rather than one of them getting logged out.

## Errors and solutions
(Empty for now — fill this in as you hit real errors while running the
project; that's what this file is for.)
