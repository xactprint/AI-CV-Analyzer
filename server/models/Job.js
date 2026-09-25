const mongoose = require("mongoose");

/**
 * A job description the user pasted manually or imported from a public
 * source. No automated scraping of LinkedIn or any other site is performed —
 * the user always supplies the description text.
 */
const jobSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Job title is required"],
      trim: true,
      maxlength: [160, "Job title cannot exceed 160 characters"],
    },
    company: {
      type: String,
      trim: true,
      default: "Unknown company",
      maxlength: [160, "Company cannot exceed 160 characters"],
    },
    location: {
      type: String,
      trim: true,
      default: "Remote",
      maxlength: [160, "Location cannot exceed 160 characters"],
    },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "internship", "contract", "freelance", "other"],
      default: "full-time",
    },
    description: {
      type: String,
      required: [true, "Job description is required"],
      trim: true,
      minlength: [40, "Job description must be at least 40 characters long"],
    },
    requirements: { type: [String], default: [] },
    sourceUrl: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      enum: ["manual", "pasted", "imported"],
      default: "manual",
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

jobSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Job", jobSchema);
