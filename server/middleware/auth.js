const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw ApiError.internal("JWT_SECRET is not configured on the server.");
  }
  return secret;
};

const signToken = (userId) =>
  jwt.sign({ sub: userId }, getSecret(), { expiresIn: "7d" });

const readToken = (req) => {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) return header.slice(7).trim();
  return null;
};

/**
 * Verifies the JWT on protected routes and attaches the user document to req.
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = readToken(req);
  if (!token) throw ApiError.unauthorized("You are not logged in. Please sign in.");

  let payload;
  try {
    payload = jwt.verify(token, getSecret());
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw ApiError.unauthorized("Your session has expired. Please sign in again.");
    }
    throw ApiError.unauthorized("Invalid authentication token.");
  }

  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized("This account no longer exists.");

  req.user = user;
  return next();
});

/** Restricts a route to a set of roles. */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(ApiError.forbidden("You do not have permission to do that."));
  }
  return next();
};

module.exports = { protect, authorize, signToken };
