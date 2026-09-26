import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const AI_SOURCE_LABELS = {
  groq: "Groq",
  xai: "xAI Grok",
};

/** Human label for the engine that produced an analysis or a match. */
export function aiSourceLabel(source) {
  return AI_SOURCE_LABELS[source] || "Built-in heuristic engine";
}

/** True when a real language model produced the result. */
export function isAiSource(source) {
  return Boolean(AI_SOURCE_LABELS[source]);
}
