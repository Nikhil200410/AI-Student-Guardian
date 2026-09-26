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

### Phase 1 practice tasks
4. Log in, then open your browser's DevTools → Application → Cookies.
   Confirm you can see a cookie named `token` but that `document.cookie`
   in the Console does NOT show it — that's `httpOnly` in action.
5. Try requesting a new OTP twice in a row within 60 seconds — confirm you
   get the 429 cooldown error, not a second email.
6. Log in on the frontend, then manually call `DELETE /api/profile` for a
   *different* user's data by guessing a profile — confirm it's impossible,
   since every query filters by `req.userId` from the verified JWT, not
   anything the client can control.

## Errors and solutions
(Empty for now — fill this in as you hit real errors while running the
project; that's what this file is for.)
