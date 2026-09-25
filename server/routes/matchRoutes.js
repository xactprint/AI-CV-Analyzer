const express = require("express");
const {
  listMatches,
  getMatch,
  deleteMatch,
} = require("../controllers/matchController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.get("/", listMatches);
router.get("/:id", getMatch);
router.delete("/:id", deleteMatch);

module.exports = router;
