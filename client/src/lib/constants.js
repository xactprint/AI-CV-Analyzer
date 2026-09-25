export const SCORE_BANDS = [
  { min: 85, label: "Excellent", variant: "success" },
  { min: 70, label: "Strong", variant: "info" },
  { min: 55, label: "Moderate", variant: "warning" },
  { min: 0, label: "Needs work", variant: "destructive" },
];

export const scoreBand = (score) =>
  SCORE_BANDS.find((b) => (score ?? 0) >= b.min) || SCORE_BANDS[SCORE_BANDS.length - 1];

export const ANALYSIS_STAGES = [
  "Uploading CV...",
  "Extracting content...",
  "Understanding profile...",
  "Analyzing skills...",
  "Evaluating experience...",
  "Generating score...",
  "Preparing recommendations...",
];

export const MATCH_STAGES = [
  "Reading job description...",
  "Comparing skills...",
  "Checking experience...",
  "Matching education...",
  "Calculating match score...",
  "Building recommendations...",
];

/** Formats an ISO date as e.g. "12 Mar 2026". */
export const formatDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
};

export const formatRelative = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
};

export const formatBytes = (bytes) => {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const initials = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("") || "U";

/** Drives the staged progress messages during long AI calls. */
export const useStageMachine = (stages, active) => {
  if (!active) return 0;
  const elapsed = Date.now();
  return Math.min(stages.length - 1, Math.floor(elapsed / 2200) % stages.length);
};
