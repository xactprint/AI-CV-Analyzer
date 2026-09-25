const fs = require("fs");
const path = require("path");
const Resume = require("../models/Resume");
const Analysis = require("../models/Analysis");
const Match = require("../models/Match");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { getExtension, UPLOAD_DIR } = require("../middleware/upload");
const { extractResumeInformation } = require("../services/extractionService");

const removeFile = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    /* a leftover temp file is not worth failing the request over */
  }
};

/**
 * POST /api/resumes/upload
 * Multipart upload, then immediate text extraction so the file is ready for AI.
 */
const uploadResume = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw ApiError.badRequest("No file was uploaded. Choose a PDF, DOCX, PNG or JPG file.");
  }

  const label = req.body.label?.trim() || "General";
  const makePrimary = req.body.isPrimary === "true" || req.body.isPrimary === true;

  const resume = await Resume.create({
    user: req.user._id,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype,
    extension: getExtension(req.file),
    fileSize: req.file.size,
    filePath: req.file.path,
    label,
    status: "extracting",
  });

  if (makePrimary) {
    await Resume.updateMany({ user: req.user._id, _id: { $ne: resume._id } }, { isPrimary: false });
    resume.isPrimary = true;
  }

  try {
    const { text, method } = await extractResumeInformation(req.file);
    resume.extractedText = text;
    resume.textLength = text.length;
    resume.extractionMethod = method;
    resume.status = "extracted";
    await resume.save();
  } catch (err) {
    resume.status = "failed";
    resume.extractionMethod = "failed";
    await resume.save();
    removeFile(resume.filePath);
    // Still report the underlying reason so the UI can explain what happened.
    throw err;
  }

  res.status(201).json({ success: true, resume });
});

/**
 * GET /api/resumes
 */
const listResumes = asyncHandler(async (req, res) => {
  const resumes = await Resume.find({ user: req.user._id })
    .select("-extractedText")
    .sort({ createdAt: -1 })
    .lean();

  const withAnalysis = await Analysis.aggregate([
    { $match: { user: req.user._id, resume: { $in: resumes.map((r) => r._id) } } },
    { $sort: { createdAt: -1 } },
    { $group: { _id: "$resume", overallScore: { $first: "$overallScore" }, createdAt: { $first: "$createdAt" } } },
  ]);
  const scoreMap = new Map(withAnalysis.map((a) => [String(a._id), a.overallScore]));

  res.json({
    success: true,
    count: resumes.length,
    resumes: resumes.map((r) => ({ ...r, latestScore: scoreMap.get(String(r._id)) ?? null })),
  });
});

/**
 * GET /api/resumes/:id
 */
const getResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
  if (!resume) throw ApiError.notFound("That CV does not exist or is not yours.");

  const analysis = await Analysis.findOne({ resume: resume._id, user: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  const matchCount = await Match.countDocuments({ resume: resume._id, user: req.user._id });

  res.json({ success: true, resume, analysis: analysis || null, matchCount });
});

/**
 * PATCH /api/resumes/:id  — rename / label / set primary
 */
const updateResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
  if (!resume) throw ApiError.notFound("That CV does not exist or is not yours.");

  if (req.body.label !== undefined) {
    const label = req.body.label.trim();
    if (!label) throw ApiError.badRequest("Label cannot be empty.");
    resume.label = label;
  }

  if (req.body.isPrimary === true) {
    await Resume.updateMany({ user: req.user._id }, { isPrimary: false });
    resume.isPrimary = true;
  }

  await resume.save();
  res.json({ success: true, resume });
});

/**
 * DELETE /api/resumes/:id
 */
const deleteResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id });
  if (!resume) throw ApiError.notFound("That CV does not exist or is not yours.");

  await Promise.all([
    Analysis.deleteMany({ resume: resume._id, user: req.user._id }),
    Match.deleteMany({ resume: resume._id, user: req.user._id }),
  ]);

  removeFile(resume.filePath);
  await resume.deleteOne();

  res.json({ success: true, message: "CV deleted.", id: resume._id });
});

/**
 * GET /api/resumes/:id/file — streams the original document back.
 */
const downloadResume = asyncHandler(async (req, res) => {
  const resume = await Resume.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!resume) throw ApiError.notFound("That CV does not exist or is not yours.");

  const absolute = path.isAbsolute(resume.filePath)
    ? resume.filePath
    : path.join(UPLOAD_DIR, resume.filePath);

  if (!fs.existsSync(absolute)) {
    throw ApiError.notFound("The original file is no longer stored on the server.");
  }

  res.setHeader("Content-Type", resume.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${resume.originalName}"`);
  fs.createReadStream(absolute).pipe(res);
});

module.exports = {
  uploadResume,
  listResumes,
  getResume,
  updateResume,
  deleteResume,
  downloadResume,
};
