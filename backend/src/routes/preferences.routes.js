const express = require("express");
const { getPreferences, createPreferences, updatePreferences } = require("../controllers/preferences.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(requireAuth);

router.get("/", getPreferences);
router.post("/", createPreferences);
router.put("/", updatePreferences);

module.exports = router;
