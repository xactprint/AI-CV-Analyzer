const express = require("express");
const {
  createJob,
  listJobs,
  getJob,
  updateJob,
  deleteJob,
} = require("../controllers/jobController");
const { createMatch, getJobMatches } = require("../controllers/matchController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

router.post("/", createJob);
router.get("/", listJobs);
router.get("/:id", getJob);
router.put("/:id", updateJob);
router.delete("/:id", deleteJob);

// Matching
router.post("/:jobId/match/:resumeId", createMatch);
router.get("/:jobId/matches", getJobMatches);

module.exports = router;
