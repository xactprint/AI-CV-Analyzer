const mongoose = require("mongoose");

const ALLOWED_EXTENSIONS = ["pdf", "docx", "png", "jpg", "jpeg"];

const resumeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    extension: { type: String, required: true, enum: ALLOWED_EXTENSIONS },
    fileSize: { type: Number, required: true },
    filePath: { type: String, required: true },
    label: {
      type: String,
      trim: true,
      default: "General",
      maxlength: [60, "Label cannot exceed 60 characters"],
    },
    version: { type: Number, default: 1 },
    isPrimary: { type: Boolean, default: false },
    extractedText: { type: String, default: "" },
    textLength: { type: Number, default: 0 },
    extractionMethod: {
      type: String,
      enum: ["pdf-text", "docx-text", "ocr", "pending", "failed"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["uploaded", "extracting", "extracted", "analyzing", "analyzed", "failed"],
      default: "uploaded",
    },
  },
  { timestamps: true }
);

resumeSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("Resume", resumeSchema);
module.exports.ALLOWED_EXTENSIONS = ALLOWED_EXTENSIONS;
