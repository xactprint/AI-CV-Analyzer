const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const ApiError = require("../utils/ApiError");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/png",
  "image/jpeg",
]);

const EXTENSION_BY_MIME = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "image/png": "png",
  "image/jpeg": "jpg",
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (file.originalname.split(".").pop() || "").toLowerCase();
    // Random name so we never trust the client filename on disk.
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = (file.originalname.split(".").pop() || "").toLowerCase();
  const mimeOk = ALLOWED_MIME_TYPES.has(file.mimetype);
  const extOk = EXTENSION_BY_MIME[file.mimetype] === ext || (file.mimetype === "image/jpeg" && ext === "jpeg");

  if (!mimeOk || !extOk) {
    return cb(
      ApiError.unsupportedMedia(
        "Unsupported file format. Please upload a PDF, DOCX, PNG or JPG file."
      )
    );
  }
  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
});

/** Wraps multer so its errors become friendly ApiError responses. */
const uploadSingle = (field = "file") => (req, res, next) => {
  upload.single(field)(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return next(ApiError.payloadTooLarge("That file is larger than the 10 MB limit."));
      }
      return next(ApiError.badRequest(`Upload failed: ${err.message}`));
    }
    return next(err);
  });
};

const getExtension = (file) =>
  (file.originalname.split(".").pop() || "").toLowerCase();

module.exports = {
  uploadSingle,
  UPLOAD_DIR,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  getExtension,
};
