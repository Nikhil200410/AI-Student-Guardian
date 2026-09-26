# API Documentation

## Authentication (Phase 1)

All `/api/profile` routes below now require a valid session — send requests
with `withCredentials: true` (frontend already does this) so the `token`
httpOnly cookie is included. Without it, they return `401`.

### POST /api/auth/request-otp
Sends a 6-digit code to the given email.
- **Request body:** `{ "email": "you@college.edu" }`
- **Response 200:** `{ "message": "Code sent. Check your email." }`
- **Response 400:** `{ "error": "A valid email is required." }`
- **Response 429:** `{ "error": "Please wait Ns before requesting another code." }`

### POST /api/auth/verify-otp
Verifies the code and logs the user in (creates the user if this is their
first time). Sets the `token` cookie on success.
- **Request body:** `{ "email": "you@college.edu", "code": "123456" }`
- **Response 200:** `{ "user": { "id": 1, "email": "you@college.edu" } }`
- **Response 400:** wrong/expired/missing code
- **Response 429:** too many wrong attempts — request a new code

### POST /api/auth/logout
Clears the session cookie.
- **Response 204:** no body

### GET /api/auth/me
Returns the logged-in user, or 401 if not logged in.
- **Response 200:** `{ "user": { "id": 1, "email": "..." } }`
- **Response 401:** `{ "error": "Not logged in." }`

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
Returns the logged-in user's stored student profile.
- **Auth:** required (`requireAuth` — see Authentication section above)
- **Response 200:**
```json
{
  "id": 1,
  "name": "Priya Sharma",
  "degree": "B.Tech",
  "department": "Computer Science",
  "semester": 5,
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
{ "name": "Priya Sharma", "degree": "B.Tech", "department": "Computer Science", "semester": 5 }
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
