const express = require("express");
const { getOverview } = require("../controllers/digitalTwin.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(requireAuth);

router.get("/overview", getOverview);

module.exports = router;
