const express = require("express");
const {
  createAnalysis,
  getAnalysis,
  listAnalyses,
  improveResumeEndpoint,
  compareAnalyses,
  ensureResume,
} = require("../controllers/analysisController");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.use(protect);

// Static paths must be declared before the /:resumeId patterns.
router.get("/", listAnalyses);
router.get("/compare", compareAnalyses);

router.post("/:resumeId", ensureResume, createAnalysis);
router.post("/:resumeId/improve", ensureResume, improveResumeEndpoint);
router.get("/:resumeId", getAnalysis);

module.exports = router;
