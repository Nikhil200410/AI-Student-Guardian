const express = require("express");
const {
  listSkills,
  createSkill,
  updateSkill,
  deleteSkill,
  listEvidence,
  addEvidence,
  deleteEvidence,
} = require("../controllers/skills.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(requireAuth);

router.get("/", listSkills);
router.post("/", createSkill);
router.put("/:id", updateSkill);
router.delete("/:id", deleteSkill);

router.get("/:id/evidence", listEvidence);
router.post("/:id/evidence", addEvidence);
router.delete("/:id/evidence/:evidenceId", deleteEvidence);

module.exports = router;
