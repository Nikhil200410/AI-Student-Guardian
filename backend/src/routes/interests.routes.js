const express = require("express");
const { listInterests, createInterest, deleteInterest } = require("../controllers/interests.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(requireAuth);

router.get("/", listInterests);
router.post("/", createInterest);
router.delete("/:id", deleteInterest);

module.exports = router;
