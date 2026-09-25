/**
 * Small helpers for turning unreliable LLM output into usable data.
 */

/** Strips markdown fences and surrounding prose around a JSON payload. */
const extractJsonBlock = (raw) => {
  if (raw === null || raw === undefined) return "";

  let text = String(raw).trim();

  // ```json ... ``` or ``` ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();

  // Prefer the outermost {...} or [...] block.
  const firstObject = text.indexOf("{");
  const lastObject = text.lastIndexOf("}");
  if (firstObject !== -1 && lastObject > firstObject) {
    text = text.slice(firstObject, lastObject + 1);
  }

  return text;
};

/**
 * Parses JSON from an LLM response. Tolerates trailing commas and
 * single-quoted keys which smaller models sometimes emit.
 */
const parseJson = (raw) => {
  const block = extractJsonBlock(raw);
  if (!block) throw new Error("Empty JSON response from AI provider");

  const candidates = [block, block.replace(/,\s*([}\]])/g, "$1")];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* try next candidate */
    }
  }

  throw new Error("AI provider returned a response that is not valid JSON");
};

/** Returns a string, an array of unique strings, or a safe empty fallback. */
const asStringArray = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((v) => String(v).trim()).filter(Boolean))];
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[,;\n•|]+/)
      .map((v) => v.trim())
      .filter(Boolean);
  }
  return [];
};

/** Clamps any AI-provided number into the 0-100 range. */
const clampScore = (value, fallback = 0) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
};

module.exports = { parseJson, extractJsonBlock, asStringArray, clampScore };
