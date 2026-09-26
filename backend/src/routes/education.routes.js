const express = require("express");
const {
  listEducationLevels,
  listEducation,
  getCurrentEducation,
  createEducation,
  updateEducation,
  setCurrentEducation,
  deleteEducation,
} = require("../controllers/education.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(requireAuth);

router.get("/levels", listEducationLevels);
router.get("/current", getCurrentEducation);
router.get("/", listEducation);
router.post("/", createEducation);
router.put("/:id", updateEducation);
router.post("/:id/set-current", setCurrentEducation);
router.delete("/:id", deleteEducation);

module.exports = router;
