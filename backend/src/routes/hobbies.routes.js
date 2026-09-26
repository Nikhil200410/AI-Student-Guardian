const express = require("express");
const { listHobbies, createHobby, updateHobby, deleteHobby } = require("../controllers/hobbies.controller");
const { requireAuth } = require("../middleware/auth.middleware");

const router = express.Router();
router.use(requireAuth);

router.get("/", listHobbies);
router.post("/", createHobby);
router.put("/:id", updateHobby);
router.delete("/:id", deleteHobby);

module.exports = router;
