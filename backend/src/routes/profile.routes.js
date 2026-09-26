// profile.routes.js
// A "router" maps HTTP method + URL path -> a controller function.
// It does not contain business logic itself — it just wires things together.

const express = require("express");
const {
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
} = require("../controllers/profile.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

// Phase 1: every profile route now requires a logged-in user, since
// profiles are per-user rather than a single shared row.
router.use(requireAuth);

router.get("/", getProfile);
router.post("/", createProfile);
router.put("/", updateProfile);
router.delete("/", deleteProfile);

module.exports = router;
