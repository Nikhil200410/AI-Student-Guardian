const express = require("express");
const { listGoals, createGoal, updateGoal, deleteGoal } = require("../controllers/goals.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(requireAuth);

router.get("/", listGoals);
router.post("/", createGoal);
router.put("/:id", updateGoal);
router.delete("/:id", deleteGoal);

module.exports = router;
