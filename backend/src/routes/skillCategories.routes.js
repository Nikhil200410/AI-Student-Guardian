const express = require("express");
const { listSkillCategories } = require("../controllers/skillCategories.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(requireAuth);

router.get("/", listSkillCategories);

module.exports = router;
