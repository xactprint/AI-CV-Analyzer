const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { signToken } = require("../middleware/auth");

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  jobTitle: user.jobTitle,
  role: user.role,
  theme: user.preferences?.theme || "system",
  createdAt: user.createdAt,
});

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password, jobTitle } = req.body;

  if (!name || !email || !password) {
    throw ApiError.badRequest("Name, email and password are all required.");
  }

  const existing = await User.findOne({ email: String(email).toLowerCase() });
  if (existing) {
    throw ApiError.conflict("An account with that email already exists.");
  }

  const user = await User.create({ name, email, password, jobTitle: jobTitle || "" });

  res.status(201).json({
    success: true,
    token: signToken(user._id),
    user: publicUser(user),
  });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest("Email and password are both required.");
  }

  const user = await User.findOne({ email: String(email).toLowerCase() }).select("+password");

  // Same message for both cases so we never leak which emails exist.
  if (!user) {
    throw ApiError.unauthorized("Incorrect email or password.");
  }

  const ok = await user.comparePassword(password);
  if (!ok) {
    throw ApiError.unauthorized("Incorrect email or password.");
  }

  res.json({
    success: true,
    token: signToken(user._id),
    user: publicUser(user),
  });
});

/**
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

/**
 * PUT /api/auth/profile  (bonus: settings)
 */
const updateProfile = asyncHandler(async (req, res) => {
  const { name, jobTitle, theme } = req.body;

  if (name !== undefined) {
    if (!name.trim()) throw ApiError.badRequest("Name cannot be empty.");
    req.user.name = name.trim();
  }
  if (jobTitle !== undefined) req.user.jobTitle = jobTitle.trim();
  if (theme !== undefined) {
    if (!["light", "dark", "system"].includes(theme)) {
      throw ApiError.badRequest("Theme must be light, dark or system.");
    }
    req.user.preferences.theme = theme;
  }

  await req.user.save();

  res.json({ success: true, user: publicUser(req.user) });
});

/**
 * PUT /api/auth/password
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw ApiError.badRequest("Your current password and a new password are required.");
  }
  if (newPassword.length < 8) {
    throw ApiError.badRequest("The new password must be at least 8 characters long.");
  }

  const user = await User.findById(req.user._id).select("+password");
  const ok = await user.comparePassword(currentPassword);
  if (!ok) throw ApiError.unauthorized("Your current password is incorrect.");

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: "Password updated successfully." });
});

module.exports = { register, login, getMe, updateProfile, changePassword, publicUser };
