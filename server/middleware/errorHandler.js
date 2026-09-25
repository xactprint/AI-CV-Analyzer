const multer = require("multer");
const ApiError = require("../utils/ApiError");
const { MAX_FILE_SIZE } = require("./upload");

/** 404 handler for unknown API routes. */
const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Central error middleware. Always returns a readable message so the client
 * never has to render a bare 500.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "Something went wrong";
  let details = err.details;

  // Mongoose: bad ObjectId
  if (err.name === "CastError") {
    statusCode = 400;
    message = `Invalid ${err.path} identifier.`;
  }

  // Mongoose: schema validation
  if (err.name === "ValidationError") {
    statusCode = 400;
    details = Object.values(err.errors).map((e) => e.message);
    message = details[0] || "Validation failed.";
  }

  // Mongo: duplicate key
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message =
      field === "email"
        ? "An account with that email already exists."
        : `A record with that ${field} already exists.`;
  }

  // Multer: size limit
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    statusCode = 413;
    message = `That file is larger than the ${Math.round(MAX_FILE_SIZE / 1024 / 1024)} MB limit.`;
  }

  if (statusCode >= 500) {
    console.error("[error]", err);
    // Hide internals of unexpected failures from the client.
    if (!err.isOperational) message = "Something went wrong on our side. Please try again.";
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};

module.exports = { notFound, errorHandler };
