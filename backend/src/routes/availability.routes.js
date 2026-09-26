const express = require("express");
const { listAvailability, createSlot, deleteSlot } = require("../controllers/availability.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(requireAuth);

router.get("/", listAvailability);
router.post("/", createSlot);
router.delete("/:id", deleteSlot);

module.exports = router;
