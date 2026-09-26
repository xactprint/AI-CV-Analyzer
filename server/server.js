const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const connectDB = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");
const { getProviderInfo } = require("./services/aiService");

const authRoutes = require("./routes/authRoutes");
const resumeRoutes = require("./routes/resumeRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const jobRoutes = require("./routes/jobRoutes");
const matchRoutes = require("./routes/matchRoutes");

const app = express();

/* ---------------------------- security ---------------------------- */

// CORS is locked to the client origin only. The value never comes from a
// request header, so a random site cannot use this API.
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// Basic hardening headers (no external dependency required).
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

/* ----------------------------- routes ----------------------------- */

app.get("/api/health", (req, res) => {
  const { provider, model, label } = getProviderInfo();
  res.json({
    success: true,
    message: "AI CV Analyzer API is running",
    aiProvider: provider === "heuristic" ? label : `${label} (${model})`,
    aiModel: model || null,
    uptime: Math.round(process.uptime()),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/matches", matchRoutes);

// Serve the built React app in production if it exists.
const clientDist = path.join(__dirname, "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/^\/(?!api).*/, (req, res, next) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) next();
  });
});

app.use(notFound);
app.use(errorHandler);

/* ----------------------------- startup ---------------------------- */

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    await connectDB();
  } catch (err) {
    console.error(`[mongodb] ${err.message}`);
    process.exit(1);
  }

  app.listen(PORT, () => {
    const { provider, model, label } = getProviderInfo();
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Allowed client origin: ${CLIENT_URL}`);
    console.log(
      provider === "heuristic"
        ? `AI provider: heuristic fallback (set GROQ_API_KEY or XAI_API_KEY to enable a model)`
        : `AI provider: ${label} / ${model}`
    );
  });
};

// Ignore the browser-only noise for the optional SPA catch-all.
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

if (require.main === module) start();

module.exports = app;
