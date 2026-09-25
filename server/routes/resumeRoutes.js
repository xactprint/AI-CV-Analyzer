const express = require("express");
const {
  uploadResume,
  listResumes,
  getResume,
  updateResume,
  deleteResume,
  downloadResume,
} = require("../controllers/resumeController");
const { protect } = require("../middleware/auth");
const { uploadSingle } = require("../middleware/upload");

const router = express.Router();

router.use(protect);

router.post("/upload", uploadSingle("file"), uploadResume);
router.get("/", listResumes);
router.get("/:id", getResume);
router.get("/:id/file", downloadResume);
router.patch("/:id", updateResume);
router.delete("/:id", deleteResume);

module.exports = router;
