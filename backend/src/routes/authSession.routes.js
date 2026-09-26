const express = require("express");
const { createSession, logout, me } = require("../controllers/authSession.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// No requireAuth on /session — that's the whole point, it's how a
// session gets established in the first place from a freshly-issued
// Supabase token.
router.post("/session", createSession);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

module.exports = router;
