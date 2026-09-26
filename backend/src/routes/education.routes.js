const express = require("express");
const {
  listEducation,
  getCurrentEducation,
  createEducation,
  updateEducation,
  deleteEducation,
} = require("../controllers/education.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(requireAuth);

router.get("/", listEducation);
router.get("/current", getCurrentEducation);
router.post("/", createEducation);
router.put("/:id", updateEducation);
router.delete("/:id", deleteEducation);

module.exports = router;
