const Job = require("../models/Job");
const Match = require("../models/Match");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

/**
 * POST /api/jobs
 * Manual entry or import of a job description the user is allowed to use.
 * No automated scraping is performed anywhere in this project.
 */
const createJob = asyncHandler(async (req, res) => {
  const {
    title,
    company,
    location,
    employmentType,
    description,
    requirements,
    sourceUrl,
    source,
  } = req.body;

  if (!title?.trim()) throw ApiError.badRequest("A job title is required.");
  if (!description?.trim() || description.trim().length < 40) {
    throw ApiError.badRequest(
      "The job description is required and must be at least 40 characters long."
    );
  }

  const job = await Job.create({
    user: req.user._id,
    title: title.trim(),
    company: company?.trim() || "Unknown company",
    location: location?.trim() || "Remote",
    employmentType: employmentType || "full-time",
    description: description.trim(),
    requirements: Array.isArray(requirements)
      ? requirements.map((r) => String(r).trim()).filter(Boolean)
      : typeof requirements === "string"
        ? requirements.split(/\n|[-•]/).map((r) => r.trim()).filter(Boolean)
        : [],
    sourceUrl: sourceUrl?.trim() || "",
    source: source || "manual",
  });

  res.status(201).json({ success: true, job });
});

/**
 * GET /api/jobs?search=&company=&sort=
 */
const listJobs = asyncHandler(async (req, res) => {
  const { search, company, sort = "recent" } = req.query;
  const filter = { user: req.user._id };

  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: rx }, { company: rx }, { description: rx }];
  }
  if (company) {
    filter.company = new RegExp(String(company).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  const sortMap = {
    recent: { createdAt: -1 },
    oldest: { createdAt: 1 },
    title: { title: 1 },
    company: { company: 1 },
  };

  const jobs = await Job.find(filter)
    .sort(sortMap[sort] || sortMap.recent)
    .select("-description")
    .lean();

  const bestScores = await Match.aggregate([
    { $match: { user: req.user._id, job: { $in: jobs.map((j) => j._id) } } },
    { $group: { _id: "$job", bestScore: { $max: "$overallScore" }, matchCount: { $sum: 1 } } },
  ]);
  const scoreMap = new Map(bestScores.map((s) => [String(s._id), s]));

  res.json({
    success: true,
    count: jobs.length,
    jobs: jobs.map((j) => ({
      ...j,
      bestScore: scoreMap.get(String(j._id))?.bestScore ?? null,
      matchCount: scoreMap.get(String(j._id))?.matchCount ?? 0,
    })),
  });
});

/**
 * GET /api/jobs/:id
 */
const getJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, user: req.user._id }).lean();
  if (!job) throw ApiError.notFound("That job does not exist or is not yours.");

  const matches = await Match.find({ job: job._id, user: req.user._id })
    .sort({ overallScore: -1 })
    .populate("resume", "originalName label extension")
    .lean();

  res.json({ success: true, job, matches });
});

/**
 * PUT /api/jobs/:id
 */
const updateJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, user: req.user._id });
  if (!job) throw ApiError.notFound("That job does not exist or is not yours.");

  const fields = ["title", "company", "location", "employmentType", "description", "sourceUrl", "isActive"];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) job[f] = req.body[f];
  });

  if (req.body.requirements !== undefined) {
    job.requirements = Array.isArray(req.body.requirements)
      ? req.body.requirements.map((r) => String(r).trim()).filter(Boolean)
      : [];
  }

  if (job.description.trim().length < 40) {
    throw ApiError.badRequest("The job description must be at least 40 characters long.");
  }

  await job.save();
  res.json({ success: true, job });
});

/**
 * DELETE /api/jobs/:id
 */
const deleteJob = asyncHandler(async (req, res) => {
  const job = await Job.findOne({ _id: req.params.id, user: req.user._id });
  if (!job) throw ApiError.notFound("That job does not exist or is not yours.");

  await Match.deleteMany({ job: job._id, user: req.user._id });
  await job.deleteOne();

  res.json({ success: true, message: "Job deleted.", id: job._id });
});

module.exports = { createJob, listJobs, getJob, updateJob, deleteJob };
