const Job = require("../models/Job");
const Resume = require("../models/Resume");
const Analysis = require("../models/Analysis");
const Match = require("../models/Match");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { matchResumeWithJob, extractText } = require("../services/aiService");

/**
 * POST /api/jobs/:jobId/match/:resumeId
 * Runs the AI comparison and stores the result for the history list.
 */
const createMatch = asyncHandler(async (req, res) => {
  const { jobId, resumeId } = req.params;
  const startedAt = Date.now();

  const [job, resume] = await Promise.all([
    Job.findOne({ _id: jobId, user: req.user._id }),
    Resume.findOne({ _id: resumeId, user: req.user._id }),
  ]);

  if (!job) throw ApiError.notFound("That job does not exist or is not yours.");
  if (!resume) throw ApiError.notFound("That CV does not exist or is not yours.");

  let resumeText = resume.extractedText;

  if (!resumeText || resumeText.length < 20) {
    const extracted = await extractText({
      path: resume.filePath,
      originalname: resume.originalName,
      mimetype: resume.mimeType,
    });
    resumeText = extracted.text;
    resume.extractedText = extracted.text;
    resume.textLength = extracted.text.length;
    resume.extractionMethod = extracted.method;
    await resume.save();
  }

  const result = await matchResumeWithJob({ resumeText, job });
  const latestAnalysis = await Analysis.findOne({ user: req.user._id, resume: resume._id })
    .sort({ createdAt: -1 })
    .select("_id")
    .lean();

  const match = await Match.findOneAndUpdate(
    { user: req.user._id, job: job._id, resume: resume._id },
    {
      $set: {
        analysis: latestAnalysis?._id || null,
        overallScore: result.overallScore,
        verdict: result.verdict,
        matchingSkills: result.matchingSkills,
        missingSkills: result.missingSkills,
        matchingExperience: result.matchingExperience,
        missingExperience: result.missingExperience,
        matchingEducation: result.matchingEducation,
        matchingProjects: result.matchingProjects,
        matchingKeywords: result.matchingKeywords,
        missingKeywords: result.missingKeywords,
        scoreBreakdown: result.scoreBreakdown,
        explanation: result.explanation,
        recommendations: result.recommendations,
        analysisSource: result.analysisSource,
        durationMs: Date.now() - startedAt,
      },
    },
    { returnDocument: "after", upsert: true, setDefaultsOnInsert: true }
  )
    .populate("job", "title company location")
    .populate("resume", "originalName label extension");

  res.status(201).json({
    success: true,
    match,
    disclaimer:
      "AI match results are recommendations for your review, not a hiring decision.",
  });
});

/**
 * GET /api/jobs/:jobId/matches — all matches for one job (sortable/filterable).
 */
const getJobMatches = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.jobId, user: req.user._id }).lean();
  if (!job) throw ApiError.notFound("That job does not exist or is not yours.");

  const { sort = "recent", minScore } = req.query;
  const filter = { user: req.user._id, job: job._id };
  if (minScore) filter.overallScore = { $gte: Number(minScore) };

  const sortMap = {
    recent: { createdAt: -1 },
    oldest: { createdAt: 1 },
    scoreDesc: { overallScore: -1 },
    scoreAsc: { overallScore: 1 },
  };

  const matches = await Match.find(filter)
    .sort(sortMap[sort] || sortMap.recent)
    .populate("resume", "originalName label extension")
    .lean();

  res.json({ success: true, job, count: matches.length, matches });
});

/**
 * GET /api/matches — the global, sortable/filterable "My Job Matches" history.
 */
const listMatches = asyncHandler(async (req, res) => {
  const { sort = "recent", verdict, search, minScore } = req.query;
  const filter = { user: req.user._id };

  if (verdict) filter.verdict = verdict;
  if (minScore) filter.overallScore = { $gte: Number(minScore) };

  let matches = await Match.find(filter)
    .sort({ createdAt: -1 })
    .populate("job", "title company location employmentType")
    .populate("resume", "originalName label extension")
    .lean();

  if (search) {
    const needle = String(search).toLowerCase();
    matches = matches.filter(
      (m) =>
        m.job?.title?.toLowerCase().includes(needle) ||
        m.job?.company?.toLowerCase().includes(needle) ||
        m.resume?.label?.toLowerCase().includes(needle)
    );
  }

  const sortMap = {
    recent: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    oldest: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    scoreDesc: (a, b) => b.overallScore - a.overallScore,
    scoreAsc: (a, b) => a.overallScore - b.overallScore,
  };
  matches.sort(sortMap[sort] || sortMap.recent);

  const stats = matches.reduce(
    (acc, m) => {
      acc.count += 1;
      acc.total += m.overallScore;
      acc.best = Math.max(acc.best, m.overallScore);
      return acc;
    },
    { count: 0, total: 0, best: 0 }
  );

  res.json({
    success: true,
    count: matches.length,
    matches,
    stats: {
      count: stats.count,
      averageScore: stats.count ? Math.round(stats.total / stats.count) : 0,
      bestScore: stats.best,
    },
  });
});

/**
 * GET /api/matches/:id
 */
const getMatch = asyncHandler(async (req, res) => {
  const match = await Match.findOne({ _id: req.params.id, user: req.user._id })
    .populate("job")
    .populate("resume", "originalName label extension")
    .lean();

  if (!match) throw ApiError.notFound("That match result does not exist or is not yours.");
  res.json({ success: true, match });
});

/**
 * DELETE /api/matches/:id
 */
const deleteMatch = asyncHandler(async (req, res) => {
  const match = await Match.findOne({ _id: req.params.id, user: req.user._id });
  if (!match) throw ApiError.notFound("That match result does not exist or is not yours.");
  await match.deleteOne();
  res.json({ success: true, message: "Match result deleted.", id: match._id });
});

module.exports = { createMatch, getJobMatches, listMatches, getMatch, deleteMatch };
