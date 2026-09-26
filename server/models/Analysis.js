const mongoose = require("mongoose");

const scoreBreakdownSchema = new mongoose.Schema(
  {
    skills: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    education: { type: Number, default: 0 },
    structure: { type: Number, default: 0 },
    keywords: { type: Number, default: 0 },
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    category: { type: String, default: "General" },
    title: { type: String, required: true },
    detail: { type: String, default: "" },
    impact: { type: String, enum: ["high", "medium", "low"], default: "medium" },
  },
  { _id: false }
);

const analysisSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    resume: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Resume",
      required: true,
      index: true,
    },
    overallScore: { type: Number, default: 0, min: 0, max: 100 },
    summary: { type: String, default: "" },
    profile: {
      fullName: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      location: { type: String, default: "" },
      links: { type: [String], default: [] },
      headline: { type: String, default: "" },
    },
    skills: {
      technical: { type: [String], default: [] },
      soft: { type: [String], default: [] },
      categories: {
        type: [
          {
            _id: false,
            name: String,
            level: Number,
          },
        ],
        default: [],
      },
    },
    experience: {
      type: [
        {
          _id: false,
          title: String,
          company: String,
          location: String,
          startDate: String,
          endDate: String,
          duration: String,
          current: { type: Boolean, default: false },
          description: String,
          highlights: [String],
        },
      ],
      default: [],
    },
    education: {
      type: [
        {
          _id: false,
          degree: String,
          institution: String,
          field: String,
          startYear: String,
          endYear: String,
          grade: String,
        },
      ],
      default: [],
    },
    projects: {
      type: [
        {
          _id: false,
          name: String,
          description: String,
          technologies: [String],
          link: String,
        },
      ],
      default: [],
    },
    certifications: {
      type: [
        {
          _id: false,
          name: String,
          issuer: String,
          date: String,
          credentialId: String,
        },
      ],
      default: [],
    },
    languages: {
      type: [
        {
          _id: false,
          name: String,
          level: String,
        },
      ],
      default: [],
    },
    keywords: { type: [String], default: [] },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    scoreBreakdown: { type: scoreBreakdownSchema, default: () => ({}) },
    recommendations: { type: [recommendationSchema], default: [] },
    improvement: {
      summary: { type: String, default: "" },
      original: { type: String, default: "" },
      rewritten: { type: String, default: "" },
      tips: { type: [String], default: [] },
    },
    strengthsHighlight: { type: [String], default: [] },
    analysisSource: { type: String, enum: ["groq", "xai", "heuristic"], default: "heuristic" },
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

analysisSchema.index({ user: 1, resume: 1, createdAt: -1 });

module.exports = mongoose.model("Analysis", analysisSchema);
