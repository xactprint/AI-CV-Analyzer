const Resume = require("../models/Resume");
const Analysis = require("../models/Analysis");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const {
  analyzeResume,
  calculateResumeInsights,
  improveResume,
  extractText,
} = require("../services/aiService");

const ensureResume = asyncHandler(async (req, res, next) => {
  const resume = await Resume.findOne({ _id: req.params.resumeId, user: req.user._id });
  if (!resume) throw ApiError.notFound("That CV does not exist or is not yours.");
  req.cvResume = resume;
  return next();
});

/**
 * POST /api/analysis/:resumeId
 * Runs the full AI pipeline and stores (or replaces) the analysis.
 */
const createAnalysis = asyncHandler(async (req, res) => {
  const resume = req.cvResume;
  const startedAt = Date.now();

  resume.status = "analyzing";
  await resume.save();

  try {
    // Re-extract if the stored text is missing (e.g. server restarted mid-upload).
    if (!resume.extractedText || resume.extractedText.length < 20) {
      const { text, method } = await extractText({
        path: resume.filePath,
        originalname: resume.originalName,
        mimetype: resume.mimeType,
      });
      resume.extractedText = text;
      resume.textLength = text.length;
      resume.extractionMethod = method;
    }

    const result = await analyzeResume(resume.extractedText);
    const insights = calculateResumeInsights(result);

    const analysis = await Analysis.findOneAndUpdate(
      { user: req.user._id, resume: resume._id },
      {
        $set: {
          overallScore: insights.overallScore,
          summary: result.summary || "",
          profile: result.profile || {},
          skills: result.skills || { technical: [], soft: [], categories: [] },
          experience: result.experience || [],
          education: result.education || [],
          projects: result.projects || [],
          certifications: result.certifications || [],
          languages: result.languages || [],
          keywords: result.keywords || [],
          strengths: insights.strengths,
          weaknesses: insights.weaknesses,
          scoreBreakdown: insights.scoreBreakdown,
          recommendations: insights.recommendations,
          analysisSource: result.analysisSource,
          durationMs: Date.now() - startedAt,
        },
      },
      { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
    );

    resume.status = "analyzed";
    await resume.save();

    res.status(201).json({ success: true, analysis, durationMs: analysis.durationMs });
  } catch (err) {
    resume.status = resume.extractedText ? "extracted" : "failed";
    await resume.save();
    throw err;
  }
});

/**
 * GET /api/analysis/:resumeId — returns the latest analysis for a CV.
 */
const getAnalysis = asyncHandler(async (req, res) => {
  const analysis = await Analysis.findOne({
    user: req.user._id,
    resume: req.params.resumeId,
  })
    .sort({ createdAt: -1 })
    .populate("resume", "originalName label extension createdAt");

  if (!analysis) {
    throw ApiError.notFound("This CV has not been analysed yet. Run an analysis first.");
  }

  res.json({ success: true, analysis });
});

/**
 * GET /api/analysis — recent analyses across all of the user's CVs.
 */
const listAnalyses = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const analyses = await Analysis.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("resume", "originalName label extension")
    .lean();

  res.json({ success: true, count: analyses.length, analyses });
});

/**
 * POST /api/analysis/:resumeId/improve — AI rewrite suggestions.
 * These are recommendations for the user to review, never applied silently.
 */
const improveResumeEndpoint = asyncHandler(async (req, res) => {
  const resume = req.cvResume;

  if (!resume.extractedText || resume.extractedText.length < 20) {
    throw ApiError.unprocessable("We need the CV text before we can suggest improvements.");
  }

  const analysis = await Analysis.findOne({ user: req.user._id, resume: resume._id })
    .sort({ createdAt: -1 })
    .lean();

  const weaknesses = analysis?.weaknesses?.length
    ? analysis.weaknesses
    : ["The professional summary is generic or missing measurable results"];

  const improvement = await improveResume({
    resumeText: resume.extractedText,
    weaknesses,
  });

  const updated = await Analysis.findOneAndUpdate(
    { user: req.user._id, resume: resume._id },
    { $set: { improvement } },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  );

  res.json({
    success: true,
    improvement,
    disclaimer:
      "AI suggestions are recommendations only. Review and rewrite them in your own voice before adding them to your CV.",
    analysis: updated,
  });
});

/**
 * GET /api/analysis/compare?a=<id>&b=<id> — CV version comparison (bonus).
 */
const compareAnalyses = asyncHandler(async (req, res) => {
  const { a, b } = req.query;

  if (!a || !b) {
    throw ApiError.badRequest("Two CV ids are required: ?a=<resumeId>&b=<resumeId>");
  }

  const analyses = await Analysis.find({
    user: req.user._id,
    resume: { $in: [a, b] },
  })
    .populate("resume", "originalName label")
    .lean();

  if (analyses.length < 2) {
    throw ApiError.notFound(
      "Both CVs must be analysed before they can be compared. Analyse each one first."
    );
  }

  const order = [a, b].map((id) => analyses.find((x) => String(x.resume._id) === String(id)));
  const [left, right] = order;

  res.json({
    success: true,
    left,
    right,
    delta: {
      overall: right.overallScore - left.overallScore,
      skills: right.scoreBreakdown.skills - left.scoreBreakdown.skills,
      experience: right.scoreBreakdown.experience - left.scoreBreakdown.experience,
      education: right.scoreBreakdown.education - left.scoreBreakdown.education,
      structure: right.scoreBreakdown.structure - left.scoreBreakdown.structure,
      keywords: right.scoreBreakdown.keywords - left.scoreBreakdown.keywords,
    },
  });
});

module.exports = {
  createAnalysis,
  getAnalysis,
  listAnalyses,
  improveResumeEndpoint,
  compareAnalyses,
  ensureResume,
};
