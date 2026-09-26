// auth.routes.js
const express = require("express");
const { requestOtp, verifyOtp, logout, me } = require("../controllers/auth.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();

router.post("/request-otp", requestOtp);
router.post("/verify-otp", verifyOtp);
router.post("/logout", logout);
router.get("/me", requireAuth, me);

module.exports = router;
