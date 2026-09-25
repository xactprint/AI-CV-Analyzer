/**
 * Operational error with an HTTP status code.
 * Anything thrown as an ApiError is considered "expected" and is sent to the
 * client as a readable message instead of a bare 500.
 */
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(msg = "Bad request", details) {
    return new ApiError(400, msg, details);
  }

  static unauthorized(msg = "Not authenticated") {
    return new ApiError(401, msg);
  }

  static forbidden(msg = "Not allowed to access this resource") {
    return new ApiError(403, msg);
  }

  static notFound(msg = "Resource not found") {
    return new ApiError(404, msg);
  }

  static conflict(msg = "Resource already exists") {
    return new ApiError(409, msg);
  }

  static payloadTooLarge(msg = "File is too large") {
    return new ApiError(413, msg);
  }

  static unsupportedMedia(msg = "Unsupported file format") {
    return new ApiError(415, msg);
  }

  static unprocessable(msg = "Unprocessable request", details) {
    return new ApiError(422, msg, details);
  }

  static internal(msg = "Something went wrong on our side") {
    return new ApiError(500, msg);
  }

  static badGateway(msg = "Upstream service failed") {
    return new ApiError(502, msg);
  }
}

module.exports = ApiError;
