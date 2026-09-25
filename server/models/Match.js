const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
      index: true,
    },
    analysis: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Analysis",
      default: null,
    },
    overallScore: { type: Number, default: 0, min: 0, max: 100 },
    verdict: {
      type: String,
      enum: ["excellent", "strong", "moderate", "weak", "poor"],
      default: "moderate",
    },
    matchingSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    matchingExperience: { type: [String], default: [] },
    missingExperience: { type: [String], default: [] },
    matchingEducation: { type: [String], default: [] },
    matchingProjects: { type: [String], default: [] },
    matchingKeywords: { type: [String], default: [] },
    missingKeywords: { type: [String], default: [] },
    scoreBreakdown: {
      type: {
        skills: { type: Number, default: 0 },
        experience: { type: Number, default: 0 },
        education: { type: Number, default: 0 },
        projects: { type: Number, default: 0 },
        keywords: { type: Number, default: 0 },
      },
      default: () => ({}),
      _id: false,
    },
    explanation: { type: String, default: "" },
    recommendations: { type: [String], default: [] },
    analysisSource: { type: String, enum: ["xai", "heuristic"], default: "xai" },
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// A user should only have one stored result per resume/job pair; re-running the
// match overwrites the previous score.
matchSchema.index({ user: 1, job: 1, resume: 1 }, { unique: true });
matchSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Match", matchSchema);
