const axios = require("axios");
const ApiError = require("../utils/ApiError");
const { parseJson, asStringArray, clampScore } = require("../utils/json");
const { extractResumeInformation } = require("./extractionService");

const MAX_TOKENS = 8000;

/**
 * Supported providers. Both expose an OpenAI-compatible
 * `/chat/completions` endpoint, so only the base URL, the default model
 * and the environment variable names differ.
 */
const PROVIDERS = {
  groq: {
    id: "groq",
    label: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "openai/gpt-oss-120b",
    keyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
  },
  xai: {
    id: "xai",
    label: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4",
    keyEnv: "XAI_API_KEY",
    modelEnv: "XAI_MODEL",
  },
};

// Checked in this order when AI_PROVIDER is "auto".
const PROVIDER_ORDER = ["groq", "xai"];

/* ------------------------------------------------------------------ *
 * HTTP transport
 * ------------------------------------------------------------------ */

// Values copied straight from .env.example must not count as a real key,
// otherwise every AI call fails with an authentication error instead of
// falling back to the local heuristic analysis.
const PLACEHOLDER_KEY = /^(your[_-]|changeme|replace[_-]|xxx+$)/i;

const getConfig = () => {
  const requested = (process.env.AI_PROVIDER || "auto").trim().toLowerCase();
  const order =
    requested !== "auto" && PROVIDERS[requested] ? [requested] : PROVIDER_ORDER;

  for (const id of order) {
    const provider = PROVIDERS[id];
    const raw = (process.env[provider.keyEnv] || "").trim();
    if (raw && !PLACEHOLDER_KEY.test(raw)) {
      return {
        provider: provider.id,
        apiKey: raw,
        model: (process.env[provider.modelEnv] || "").trim() || provider.defaultModel,
        baseUrl: provider.baseUrl,
        label: provider.label,
        keyEnv: provider.keyEnv,
        modelEnv: provider.modelEnv,
      };
    }
  }

  return {
    provider: "heuristic",
    apiKey: "",
    model: "",
    baseUrl: "",
    label: `heuristic (no API key set)`,
    keyEnv: "GROQ_API_KEY / XAI_API_KEY",
    modelEnv: "",
  };
};

const isConfigured = () => getConfig().provider !== "heuristic";

/** Provider details for the health endpoint and the startup banner. */
const getProviderInfo = () => {
  const { provider, model, label } = getConfig();
  return { provider, model, label };
};

/**
 * Single chat-completion call to the configured provider (Groq or xAI).
 * Always asks for a JSON object back.
 */
const callModel = async ({ system, prompt, maxTokens = MAX_TOKENS }) => {
  const { apiKey, model, baseUrl, label, keyEnv, modelEnv } = getConfig();

  const payload = {
    model,
    temperature: 0.2,
    max_tokens: maxTokens,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
  };

  try {
    const { data } = await axios.post(
      `${baseUrl}/chat/completions`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        timeout: 120000,
      }
    );

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(`${label} returned an empty response.`);
    }
    return parseJson(content);
  } catch (err) {
    if (err instanceof ApiError) throw err;

    if (err.response) {
      const status = err.response.status;
      if (status === 401 || status === 403) {
        throw ApiError.badGateway(
          `The AI service rejected our API key. Check ${keyEnv} on the server.`
        );
      }
      if (status === 429) {
        throw ApiError.badGateway("The AI service is rate limiting requests. Please try again in a moment.");
      }
      if (status === 404) {
        throw ApiError.badGateway(
          `The AI model "${model}" was not found on ${label}. Set a valid ${modelEnv} on the server.`
        );
      }
      throw ApiError.badGateway(`The AI service returned an error (${status}). Please try again.`);
    }

    if (err.code === "ECONNABORTED") {
      throw ApiError.badGateway("The AI service took too long to respond. Please try again.");
    }

    throw ApiError.badGateway(
      `We could not reach the AI service. Check your internet connection or ${keyEnv}.`
    );
  }
};

/* ------------------------------------------------------------------ *
 * Prompts
 * ------------------------------------------------------------------ */

const RESUME_SYSTEM_PROMPT = `You are an expert resume analysis assistant used inside a career SaaS product.
You read resumes and return accurate, strictly structured JSON.

Rules:
- Return ONLY valid JSON. No markdown, no commentary, no trailing commas.
- Never invent facts. If a field is absent use "" or [].
- Keep every string concise and professional.
- Scores are integers from 0 to 100.`;

const resumePrompt = (resumeText) => `Analyze the following resume.

Extract structured information about:
- candidate profile (full name, email, phone, location, links, headline)
- skills (technical skills, soft skills, and category proficiency percentages)
- experience (title, company, location, dates, duration, description, highlights)
- education (degree, institution, field, years, grade)
- projects (name, description, technologies, link)
- certifications (name, issuer, date, credential id)
- languages (name, proficiency level)
- keywords that a recruiter or an ATS would look for

Evaluate the resume structure and completeness and give:
- an overall score (0-100) and a one-paragraph summary
- a score breakdown for skills, experience, education, structure and keywords (each 0-100)
- strengths, weaknesses and 3 to 6 actionable recommendations
- the main skill categories with a proficiency percentage between 0 and 100

Return JSON with exactly this shape:
{
  "summary": "string",
  "profile": { "fullName": "", "email": "", "phone": "", "location": "", "links": [], "headline": "" },
  "skills": { "technical": [], "soft": [], "categories": [ { "name": "", "level": 0 } ] },
  "experience": [ { "title": "", "company": "", "location": "", "startDate": "", "endDate": "", "duration": "", "current": false, "description": "", "highlights": [] } ],
  "education": [ { "degree": "", "institution": "", "field": "", "startYear": "", "endYear": "", "grade": "" } ],
  "projects": [ { "name": "", "description": "", "technologies": [], "link": "" } ],
  "certifications": [ { "name": "", "issuer": "", "date": "", "credentialId": "" } ],
  "languages": [ { "name": "", "level": "" } ],
  "keywords": [],
  "strengths": [],
  "weaknesses": [],
  "scoreBreakdown": { "skills": 0, "experience": 0, "education": 0, "structure": 0, "keywords": 0 },
  "recommendations": [ { "category": "", "title": "", "detail": "", "impact": "high" } ],
  "overallScore": 0
}

Resume:
${resumeText}`;

const matchSystemPrompt = `You are an AI career matching assistant inside a professional job-intelligence tool.
You compare a candidate resume against a job description and return strictly structured JSON.

Rules:
- Return ONLY valid JSON. No markdown, no commentary, no trailing commas.
- Be honest. A low match must look like a low match.
- Scores are integers from 0 to 100.`;

const matchPrompt = ({ resumeText, job }) => `Compare the candidate resume against the job description below.

Analyze technical skills, soft skills, experience, education, projects, certifications and keywords.

Return JSON with exactly this shape:
{
  "overallScore": 0,
  "verdict": "excellent | strong | moderate | weak | poor",
  "scoreBreakdown": { "skills": 0, "experience": 0, "education": 0, "projects": 0, "keywords": 0 },
  "matchingSkills": [],
  "missingSkills": [],
  "matchingExperience": [],
  "missingExperience": [],
  "matchingEducation": [],
  "matchingProjects": [],
  "matchingKeywords": [],
  "missingKeywords": [],
  "explanation": "A 2-4 sentence narrative explaining exactly WHY this score was given. Name concrete evidence from the resume.",
  "recommendations": ["Concrete steps the candidate can take to close the gap for THIS job"]
}

JOB TITLE: ${job.title}
COMPANY: ${job.company}
LOCATION: ${job.location}
EMPLOYMENT TYPE: ${job.employmentType}

JOB DESCRIPTION:
${job.description}

${job.requirements?.length ? `LISTED REQUIREMENTS:\n- ${job.requirements.join("\n- ")}\n` : ""}
CANDIDATE RESUME:
${resumeText}`;

const improveSystemPrompt = `You are a professional resume writer.
You rewrite weak resume lines into sharp, specific, achievement-oriented alternatives.
Return ONLY valid JSON.`;

const improvePrompt = (resumeText, weakPoints) => `Rewrite weak parts of the resume below.

Weak areas to target:
${weakPoints.map((w) => `- ${w}`).join("\n")}

Return JSON:
{
  "summary": "A short critique of the current professional summary.",
  "original": "The weakest, most generic line found in the resume.",
  "rewritten": "A sharper, quantified rewrite of that line.",
  "tips": ["Actionable advice the candidate should review before using."]
}

Resume:
${resumeText}`;

/* ------------------------------------------------------------------ *
 * Normalisers
 * ------------------------------------------------------------------ */

const normaliseText = (v) => (typeof v === "string" ? v.trim() : "");
const toBool = (v) => Boolean(v);

const normaliseCategories = (raw) => {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map((c) => ({
      name: normaliseText(c?.name),
      level: clampScore(c?.level, 50),
    }))
    .filter((c) => c.name)
    .slice(0, 12);
};

const normaliseExperience = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((e) => ({
      title: normaliseText(e?.title),
      company: normaliseText(e?.company),
      location: normaliseText(e?.location),
      startDate: normaliseText(e?.startDate),
      endDate: normaliseText(e?.endDate),
      duration: normaliseText(e?.duration),
      current: toBool(e?.current),
      description: normaliseText(e?.description),
      highlights: asStringArray(e?.highlights),
    }))
    .filter((e) => e.title || e.company)
    .slice(0, 15);

const normaliseEducation = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((e) => ({
      degree: normaliseText(e?.degree),
      institution: normaliseText(e?.institution),
      field: normaliseText(e?.field),
      startYear: normaliseText(e?.startYear),
      endYear: normaliseText(e?.endYear),
      grade: normaliseText(e?.grade),
    }))
    .filter((e) => e.degree || e.institution)
    .slice(0, 10);

const normaliseProjects = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((p) => ({
      name: normaliseText(p?.name),
      description: normaliseText(p?.description),
      technologies: asStringArray(p?.technologies),
      link: normaliseText(p?.link),
    }))
    .filter((p) => p.name)
    .slice(0, 12);

const normaliseCertifications = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((c) => ({
      name: normaliseText(c?.name),
      issuer: normaliseText(c?.issuer),
      date: normaliseText(c?.date),
      credentialId: normaliseText(c?.credentialId),
    }))
    .filter((c) => c.name)
    .slice(0, 15);

const normaliseLanguages = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((l) => ({ name: normaliseText(l?.name), level: normaliseText(l?.level) }))
    .filter((l) => l.name)
    .slice(0, 10);

const normaliseRecommendations = (raw) =>
  (Array.isArray(raw) ? raw : [])
    .map((r) =>
      typeof r === "string"
        ? { category: "General", title: r, detail: "", impact: "medium" }
        : {
            category: normaliseText(r?.category) || "General",
            title: normaliseText(r?.title) || normaliseText(r?.detail),
            detail: normaliseText(r?.detail),
            impact: ["high", "medium", "low"].includes(r?.impact) ? r.impact : "medium",
          }
    )
    .filter((r) => r.title)
    .slice(0, 8);

/* ------------------------------------------------------------------ *
 * Heuristic fallback (used when no AI API key is configured)
 * ------------------------------------------------------------------ */

const SKILL_DICTIONARY = {
  Frontend: ["react", "next.js", "nextjs", "vue", "angular", "svelte", "html", "css", "tailwind", "redux", "typescript", "javascript"],
  Backend: ["node", "node.js", "express", "nest", "django", "flask", "spring", "php", "laravel", "java", "c#", ".net", "graphql", "rest", "api"],
  Database: ["mongodb", "mongoose", "postgres", "postgresql", "mysql", "sqlite", "sql", "redis", "firebase", "prisma"],
  DevOps: ["docker", "kubernetes", "aws", "azure", "gcp", "cicd", "jenkins", "terraform", "linux", "nginx", "github actions", "vercel"],
  "AI / ML": ["machine learning", "deep learning", "tensorflow", "pytorch", "pandas", "numpy", "llm", "openai", "grok", "computer vision", "nlp"],
};

const countOccurrences = (text, term) => {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matches = text.match(new RegExp(`\\b${escaped}\\b`, "gi"));
  return matches ? matches.length : 0;
};

/* ------------------------------------------------------------------ *
 * Deterministic CV section parser (used by the heuristic fallback)
 * ------------------------------------------------------------------ */

const SECTION_ALIASES = {
  summary: ["summary", "professional summary", "profile", "professional profile", "objective", "career objective", "about me", "about"],
  experience: ["experience", "experiences", "work experience", "professional experience", "work history", "employment", "employment history", "career history", "professional background"],
  education: ["education", "academic background", "academics", "academic qualifications", "qualifications", "education and training", "education & training"],
  projects: ["projects", "selected projects", "personal projects", "academic projects", "portfolio"],
  certifications: ["certifications", "certification", "certificates", "licenses", "licences", "courses", "training", "awards and certifications"],
  languages: ["languages", "language", "spoken languages", "language skills"],
  skills: ["skills", "technical skills", "core skills", "key skills", "technical competencies", "technologies", "tech stack", "tools"],
};

const SOFT_SKILL_DICTIONARY = [
  "leadership",
  "communication",
  "collaboration",
  "teamwork",
  "problem solving",
  "problem-solving",
  "critical thinking",
  "adaptability",
  "time management",
  "ownership",
  "mentoring",
  "presentation",
  "stakeholder",
  "cross-functional",
  "autonomy",
  "attention to detail",
  "detail-oriented",
  "self-starter",
  "customer focus",
  "empathy",
  "flexibility",
  "prioritization",
  "written communication",
  "public speaking",
  "conflict resolution",
];

const LANGUAGE_DICTIONARY = [
  "english", "french", "spanish", "german", "italian", "portuguese", "dutch", "arabic",
  "russian", "chinese", "mandarin", "cantonese", "japanese", "korean", "hindi", "turkish",
  "polish", "swedish", "danish", "norwegian", "finnish", "czech", "greek", "hebrew",
  "urdu", "romanian", "hungarian", "ukrainian", "vietnamese", "thai", "indonesian",
  "swahili", "catalan", "basque", "persian", "bengali", "tamil", "telugu",
];

const PROFICIENCY_TOKENS = [
  "native", "fluent", "professional", "advanced", "upper intermediate", "intermediate",
  "conversational", "business", "basic", "elementary", "beginner", "c2", "c1", "b2", "b1", "a2", "a1",
];

const MONTH_TOKEN =
  "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t)?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE_TOKEN = `(?:${MONTH_TOKEN}\\.?\\s*'?(?:\\d{2}|\\d{4})?|\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4}|(?:19|20)\\d{2})`;
const DATE_RANGE_RE = new RegExp(
  `(${DATE_TOKEN})\\s*(?:-|–|—|to|until|through)\\s*(${DATE_TOKEN}|present|current|now|ongoing)`,
  "i"
);
const YEAR_RE = /\b(?:19|20)\d{2}\b/;
const DEGREE_RE = /\b(?:b\.?sc\.?|b\.?s\.?|b\.?a\.?|b\.?fa|m\.?sc\.?|m\.?s\.?|m\.?a\.?|m\.?b\.?a|ph\.?d|doctorate|master(?:'s)?|bachelor(?:'s)?|associate(?:'s)?|diploma|postgraduate|undergraduate|foundation|certificate|bootcamp)\b/i;
const INSTITUTION_RE = /\b(?:university|college|institute|school|academy|polytechnic)\b/i;
const ROLE_SEPARATOR_RE = /\s+(?:at|@)\s+|\s+[|–—]\s+|\s+-\s+|\s*\|\s*|,\s+(?=[A-Z])/;
const ONGOING_RE = /present|current|now|ongoing/i;
const BULLET_RE = /^[•\-‣▪*]\s*/;
const LINK_RE = /https?:\/\/\S+/g;

const cleanSegment = (value) =>
  String(value || "")
    .replace(BULLET_RE, "")
    .replace(/^[•\-‣▪*]\s*/, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:.\-–—|]+/, "")
    .replace(/[\s,;:.\-–—|]+$/, "")
    .trim();

const canonicalHeader = (line) => {
  const cleaned = cleanSegment(String(line || "").replace(/[*#`_]/g, "")).toLowerCase();
  if (!cleaned || cleaned.length > 60) return "";
  const key = Object.keys(SECTION_ALIASES).find((section) =>
    SECTION_ALIASES[section].includes(cleaned)
  );
  return key || "";
};

const splitCvSections = (resumeText) => {
  const lines = String(resumeText || "").split(/\r?\n/);
  const sections = {};
  let current = "";
  for (const line of lines) {
    const header = canonicalHeader(line);
    if (header) {
      current = header;
      if (!sections[current]) sections[current] = [];
      continue;
    }
    if (current) sections[current].push(line);
  }
  return { lines, sections };
};

const cleanDate = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.]+$/, "")
    .replace(/^[^0-9a-z]+|[^0-9a-z]+$/gi, "");

const yearsBetween = (start, end) => {
  const from = Number(String(start).match(YEAR_RE)?.[0]);
  const to = Number(String(end).match(YEAR_RE)?.[0]);
  if (!from || !to || to < from || to - from > 40) return "";
  return formatMonths((to - from) * 12);
};

const formatMonths = (months) => {
  if (months <= 0) return "";
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return rest ? `${years} yr${years > 1 ? "s" : ""} ${rest} mo` : `${years} yr${years > 1 ? "s" : ""}`;
};

const ongoingDuration = (startDate) => {
  const start = cleanDate(String(startDate).replace(/\s*-.*$/, ""));
  const year = Number(start.match(YEAR_RE)?.[0]);
  if (!year || nowYear - year > 40) return "";
  const monthToken = start.match(new RegExp(MONTH_TOKEN, "i"))?.[0];
  const monthIndex = monthToken ? MONTHS.indexOf(monthToken.slice(0, 3).toLowerCase()) : -1;
  const months = (nowYear - year) * 12 + (monthIndex >= 0 ? nowMonth - monthIndex : 6);
  return formatMonths(months);
};

const nowDate = new Date();
const nowYear = nowDate.getFullYear();
const nowMonth = nowDate.getMonth() + 1;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const parseDateRange = (text) => {
  const range = String(text || "").match(DATE_RANGE_RE);
  if (range) {
    const endDate = cleanDate(range[2]);
    const current = ONGOING_RE.test(endDate);
    return { startDate: cleanDate(range[1]), endDate: current ? "Present" : endDate, current };
  }
  const years = String(text || "").match(new RegExp(YEAR_RE, "g")) || [];
  if (years.length >= 2) return { startDate: years[0], endDate: years[1], current: false };
  if (years.length === 1) return { startDate: years[0], endDate: "", current: false };
  return { startDate: "", endDate: "", current: false };
};

const isExperienceHeaderLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 110) return false;
  if (BULLET_RE.test(trimmed)) return false;
  return ONGOING_RE.test(trimmed) || YEAR_RE.test(trimmed) || ROLE_SEPARATOR_RE.test(trimmed);
};

const parseExperienceEntries = (lines) => {
  const entries = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (isExperienceHeaderLine(trimmed)) {
      if (current) entries.push(current);
      const dates = parseDateRange(trimmed);
      const heading = trimmed.replace(/\s*[([][^)\]]*(?:19|20)\d{2}[^)\]]*[)\]]\s*$/, "").trim();
      const separator = heading.match(ROLE_SEPARATOR_RE);
      const cut = separator?.index ?? -1;
      const locationMatch = heading.match(
        /[([]\s*([A-Z][\w\s.'-]{2,40})\s*[)\]](?:\s*$|,\s)/
      );
      current = {
        title: cleanSegment(cut > 0 ? heading.slice(0, cut) : heading),
        company: cleanSegment(
          (cut > 0 ? heading.slice(cut + separator[0].length) : "").replace(
            /[([][^)\]]*[)\]]/g,
            ""
          )
        ),
        location: locationMatch ? cleanSegment(locationMatch[1]) : "",
        startDate: dates.startDate,
        endDate: dates.endDate,
        duration: dates.current
          ? ongoingDuration(dates.startDate)
          : yearsBetween(dates.startDate, dates.endDate),
        current: dates.current,
        description: "",
        highlights: [],
      };
      continue;
    }

    if (!current) continue;
    const bullet = trimmed.replace(BULLET_RE, "").trim();
    if (BULLET_RE.test(trimmed) && bullet) {
      if (current.highlights.length < 8) current.highlights.push(bullet);
    } else if (!current.description) {
      current.description = bullet;
    } else {
      current.description = `${current.description} ${bullet}`;
    }
  }
  if (current) entries.push(current);

  return entries
    .map((entry) => ({
      ...entry,
      description: entry.description.slice(0, 900),
    }))
    .filter((entry) => entry.title || entry.company);
};

const INSTITUTION_PHRASE_RE =
  /(?:graduated?\s+from\s+)?(?:[A-Z][\w.'-]+\s+){0,4}(?:University|College|Institute|School|Academy|Polytechnic)(?:\s+of\s+[A-Z][\w.'-]+(?:\s+[A-Z][\w.'-]+){0,2})?/;
const FIELD_SEPARATOR_RE = /\s(?:in|of)\s+(?=[A-Z])/;
const DEGREE_NOUNS =
  /^(?:science|arts?|engineering|business|technology|computing|computer science|management|marketing|design|mathematics|law|medicine|education|psychology|economics|informatics|technology|pharmacy|architecture)$/i;

const splitDegreeAndField = (chunk, degreeMatch) => {
  const tail = chunk.slice(degreeMatch.index);
  const asField = (cut) => cleanSegment(chunk.slice(cut)).replace(/^(?:in|of)\s+/i, "");
  const inMatch = tail.match(/\s+in(?=\s+[A-Z])/);
  if (inMatch) {
    const cut = degreeMatch.index + inMatch.index;
    return { cut, field: asField(cut) };
  }
  const ofMatch = tail.match(/\s+of(?=\s+[A-Z])/);
  if (ofMatch) {
    const cut = degreeMatch.index + ofMatch.index;
    const afterOf = chunk.slice(cut);
    if (!DEGREE_NOUNS.test(cleanSegment(afterOf))) return { cut, field: asField(cut) };
  }
  // "BSc Computer Science - University of Tunis" -> degree "BSc", field "Computer Science".
  const rest = cleanSegment(
    chunk.slice(degreeMatch.index + degreeMatch[0].length).split(/\s+[–—-]\s+|\s*[,;|]\s*|\s*[([]/)[0]
  );
  if (rest && rest.split(/\s+/).length >= 2 && !DEGREE_NOUNS.test(rest)) {
    return { cut: degreeMatch.index + degreeMatch[0].length, field: rest };
  }
  return { cut: degreeMatch.index + degreeMatch[0].length, field: "" };
};

const parseEducationEntries = (lines) => {
  const entries = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (DEGREE_RE.test(trimmed) || INSTITUTION_RE.test(trimmed)) {
      if (current) entries.push(current);
      const chunks = trimmed
        .split(/\s*[;|]\s*|\s*,\s*/)
        .map((chunk) => cleanSegment(chunk))
        .filter(Boolean);
      const degreeChunk = chunks.find((chunk) => DEGREE_RE.test(chunk)) || "";
      const institutionChunk = chunks.find((chunk) => INSTITUTION_RE.test(chunk)) || "";
      const degreeMatch = degreeChunk.match(DEGREE_RE);
      const split = degreeMatch ? splitDegreeAndField(degreeChunk, degreeMatch) : null;
      const dates = parseDateRange(trimmed);
      const years = trimmed.match(new RegExp(YEAR_RE, "g")) || [];

      current = {
        degree: cleanSegment(split ? degreeChunk.slice(0, split.cut) : degreeChunk || chunks[0] || ""),
        institution: cleanSegment(
          institutionChunk.match(INSTITUTION_PHRASE_RE)?.[0] || institutionChunk
        ),
        field: split ? cleanSegment(split.field) : "",
        startYear: dates.startDate.match(YEAR_RE)?.[0] || years[0] || "",
        endYear:
          dates.endDate === "Present" ? "Present" : dates.endDate.match(YEAR_RE)?.[0] || years[years.length - 1] || "",
        grade: cleanSegment(trimmed.match(/\b(?:gpa|grade|honou?rs|cum laude|distinction)\b.*/i)?.[0] || ""),
      };
      continue;
    }

    if (!current) continue;
    const years = trimmed.match(new RegExp(YEAR_RE, "g"));
    if (years && !current.endYear) current.endYear = years[years.length - 1];
    if (!current.institution && INSTITUTION_RE.test(trimmed)) {
      current.institution = cleanSegment(trimmed.match(INSTITUTION_PHRASE_RE)?.[0] || trimmed);
    }
    if (!current.grade) current.grade = cleanSegment(trimmed);
  }
  if (current) entries.push(current);

  return entries.filter((entry) => entry.degree || entry.institution);
};

const parseProjectEntries = (lines, technicalTerms) => {
  const entries = [];
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const isBullet = BULLET_RE.test(trimmed);
    const body = trimmed.replace(BULLET_RE, "").trim();
    const lineLink = body.match(LINK_RE)?.[0] || "";
    const lineText = cleanSegment(body.replace(LINK_RE, ""));

    // A short non-bullet line either opens a new project or continues the
    // current one when it reads like a sentence.
    if (!isBullet && lineText.length <= 90) {
      const isSentence = /[.!?]$/.test(lineText) || lineText.split(/\s+/).length >= 7;
      if (current && isSentence && !current.description) {
        current.description = lineText;
        if (lineLink) current.link = current.link || lineLink;
        continue;
      }
      if (current) entries.push(current);
      current = { name: lineText, description: "", technologies: [], link: lineLink };
      continue;
    }

    if (!current) {
      current = { name: lineText, description: "", technologies: [], link: lineLink };
      continue;
    }

    if (lineLink && !current.link) current.link = lineLink;
    if (lineText) current.description = current.description ? `${current.description} ${lineText}` : lineText;
  }
  if (current) entries.push(current);

  return entries
    .map((project) => {
      const haystack = `${project.name} ${project.description}`.toLowerCase();
      return {
        ...project,
        description: project.description.slice(0, 700),
        technologies: technicalTerms.filter((term) => countOccurrences(haystack, term) > 0),
      };
    })
    .filter((project) => project.name);
};

const parseCertificationEntries = (lines) => {
  const entries = [];

  for (const line of lines) {
    const trimmed = line.replace(BULLET_RE, "").trim();
    if (!trimmed) continue;
    const parts = trimmed
      .split(/\s+[|–—-]\s+|\s*[;,]\s*|\s{2,}/)
      .map((part) => cleanSegment(part))
      .filter(Boolean);
    const year = trimmed.match(YEAR_RE)?.[0] || "";
    entries.push({
      name: parts[0] || trimmed,
      issuer: parts[1] && !YEAR_RE.test(parts[1]) ? parts[1] : "",
      date: year,
      credentialId: trimmed.match(/\b(?:id|no|number|code)\s*[:#]?\s*([A-Za-z0-9-]{4,})/i)?.[1] || "",
    });
  }

  return entries.filter((entry) => entry.name);
};

const normaliseProficiency = (token) => {
  const value = String(token).toLowerCase();
  if (value.includes("native")) return "Native";
  if (value.includes("fluent") || value.includes("professional") || value === "c2") return "Fluent";
  if (value.includes("advanced") || value === "c1" || value === "b2") return "Advanced";
  if (value.includes("intermediate") || value === "b1") return "Intermediate";
  if (value.includes("basic") || value.includes("elementary") || value.includes("beginner") || value === "a2" || value === "a1")
    return "Basic";
  return "";
};

const parseLanguageEntries = (lines) => {
  const found = new Map();

  for (const line of lines) {
    const chunks = line
      .split(/[,;|•]|\s+-\s+|\s+–\s+|\s+—\s+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    const pending = [];
    const seen = [];

    for (const chunk of chunks) {
      const token = PROFICIENCY_TOKENS.find((candidate) =>
        new RegExp(`\\b${candidate.replace(/\s+/g, "\\s+")}\\b`, "i").test(chunk)
      );
      const level = token ? normaliseProficiency(token) : "";
      const language = LANGUAGE_DICTIONARY.find((name) =>
        new RegExp(`\\b${name}\\b`).test(chunk.toLowerCase())
      );

      if (!language) {
        if (level) pending.push(level);
        continue;
      }

      const entry = { name: language.charAt(0).toUpperCase() + language.slice(1), level };
      seen.push(entry);
      const existing = found.get(language);
      if (!existing || (entry.level && !existing.level)) found.set(language, entry);
    }

    // "English - Native" / "English, French (Fluent)" put the level in a later chunk.
    for (const entry of seen) {
      if (!entry.level && pending.length) entry.level = pending[0];
      if (!entry.level) continue;
      const existing = found.get(entry.name.toLowerCase());
      if (existing && !existing.level) existing.level = entry.level;
    }
  }

  return [...found.values()];
};

const guessFullName = (lines) => {
  const namePattern = /^[A-Z][a-zA-Z'’-]+(?:\s+[A-Z][a-zA-Z'’-]+){1,3}$/;
  for (const line of lines.slice(0, 12)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 40) continue;
    if (canonicalHeader(trimmed)) continue;
    if (/[@\d(),:;/|]/.test(trimmed)) continue;
    if (namePattern.test(trimmed)) return trimmed;
  }
  return "";
};

const guessLocation = (lines) => {
  for (const line of lines.slice(0, 12)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 60 || canonicalHeader(trimmed)) continue;
    if (/[@\d]/.test(trimmed) || !trimmed.includes(",")) continue;
    const parts = trimmed.split(",").map((part) => cleanSegment(part));
    if (parts.length === 2 && parts.every((part) => /^[A-Z][\w.'-]*(?:\s[\w.'-]+){0,3}$/.test(part))) {
      return parts.join(", ");
    }
  }
  return "";
};

/**
 * Deterministic, non-AI analysis used when no AI API key is set, so the
 * product still demonstrates the full pipeline end to end.
 */
const heuristicResumeAnalysis = (resumeText) => {
  const lower = resumeText.toLowerCase();
  const words = resumeText.split(/\s+/).filter(Boolean);
  const sentences = resumeText.split(/[.!?\n]+/).map((s) => s.trim()).filter((s) => s.length > 25);

  const categories = Object.entries(SKILL_DICTIONARY).map(([name, terms]) => {
    const hits = terms.reduce((sum, t) => sum + countOccurrences(lower, t), 0);
    return { name, level: clampScore(Math.min(98, 25 + hits * 7), 25) };
  });

  const technical = [
    ...new Set(
      Object.values(SKILL_DICTIONARY)
        .flat()
        .filter((t) => countOccurrences(lower, t) > 0)
    ),
  ];

  const keywordHits = technical.filter((t) => countOccurrences(lower, t) >= 2);

  const hasEmail = /[\w.-]+@[\w.-]+\.\w+/.test(resumeText);
  const hasPhone = /(\+?\d[\d\s().-]{7,}\d)/.test(resumeText);
  const hasSections = ["experience", "education", "skills", "project"].filter((s) =>
    lower.includes(s)
  ).length;

  const bullets = resumeText.split(/[•\-*‣▪]/).filter((b) => b.trim().length > 25).length;
  const actionVerbs =
    resumeText.match(/\b(led|built|developed|designed|improved|increased|reduced|implemented|managed|created|delivered|launched|optimized|automated)\b/gi) || [];
  const quantified = resumeText.match(/\b\d+\s?%|\$\s?\d|\b\d{2,}\b/g) || [];

  const skillsScore = clampScore(Math.min(98, 45 + technical.length * 3 + keywordHits.length * 2));
  const experienceScore = clampScore(Math.min(96, 30 + bullets * 2 + actionVerbs.length * 6 + sentences.length * 0.4));
  const educationScore = lower.includes("university") || lower.includes("bachelor") || lower.includes("master") || lower.includes("school") ? 78 : 40;
  const structureScore = clampScore(Math.min(98, 30 + hasSections * 12 + (hasEmail ? 8 : 0) + (hasPhone ? 8 : 0)));
  const keywordsScore = clampScore(Math.min(98, 30 + keywordHits.length * 6 + quantified.length * 3));

  const overallScore = clampScore(
    Math.round(
      skillsScore * 0.3 +
        experienceScore * 0.3 +
        educationScore * 0.15 +
        structureScore * 0.15 +
        keywordsScore * 0.1
    )
  );

  const nameLine = guessFullName(resumeText.split(/\r?\n/));
  const emailMatch = resumeText.match(/[\w.-]+@[\w.-]+\.\w+/);
  const phoneMatch = resumeText.match(/(\+?\d[\d\s().-]{8,}\d)/);
  const locationMatch = resumeText.match(/^\s*(?:location|address|city)\s*[:\-]\s*(.+)$/im);
  const location = locationMatch
    ? cleanSegment(locationMatch[1])
    : guessLocation(resumeText.split(/\r?\n/));

  const { sections } = splitCvSections(resumeText);
  const experience = normaliseExperience(parseExperienceEntries(sections.experience || []));
  const education = normaliseEducation(parseEducationEntries(sections.education || []));
  const projects = normaliseProjects(parseProjectEntries(sections.projects || [], technical));
  const certifications = normaliseCertifications(parseCertificationEntries(sections.certifications || []));
  const languages = normaliseLanguages(parseLanguageEntries(sections.languages || []));
  const soft = SOFT_SKILL_DICTIONARY.filter((term) => countOccurrences(lower, term) > 0);
  const foundSections = [
    experience.length && `${experience.length} role${experience.length > 1 ? "s" : ""}`,
    education.length && `${education.length} qualification${education.length > 1 ? "s" : ""}`,
    projects.length && `${projects.length} project${projects.length > 1 ? "s" : ""}`,
    certifications.length && `${certifications.length} certification${certifications.length > 1 ? "s" : ""}`,
    languages.length && `${languages.length} language${languages.length > 1 ? "s" : ""}`,
  ].filter(Boolean);

  const recommendations = [];
  if (technical.length < 8) {
    recommendations.push({
      category: "Skills",
      title: "Expand your skills section",
      detail: "List the specific technologies you have actually used, including tools and libraries.",
      impact: "high",
    });
  }
  if (quantified.length < 3) {
    recommendations.push({
      category: "Impact",
      title: "Quantify your achievements",
      detail: "Rewrite bullets to include measurable results (percentages, users, revenue, time saved).",
      impact: "high",
    });
  }
  if (bullets < 4) {
    recommendations.push({
      category: "Structure",
      title: "Use action-oriented bullet points",
      detail: "Start each bullet with a strong action verb and keep it to one or two lines.",
      impact: "medium",
    });
  }
  if (!hasPhone) {
    recommendations.push({
      category: "Contact",
      title: "Add a phone number",
      detail: "Most recruiters and ATS filters expect a reachable phone number.",
      impact: "medium",
    });
  }
  if (!(sections.summary || []).some((line) => line.trim().length > 30)) {
    recommendations.push({
      category: "Content",
      title: "Open with a professional summary",
      detail: "Two or three lines covering your role, years of experience and one measurable result.",
      impact: "high",
    });
  }
  if (!experience.length) {
    recommendations.push({
      category: "Content",
      title: "Add a work experience section",
      detail: "No role could be parsed. Use 'Job Title - Company (2022 - present)' headings so the section is machine readable.",
      impact: "high",
    });
  }
  if (!languages.length) {
    recommendations.push({
      category: "Content",
      title: "List your languages",
      detail: "EU and international employers often screen for language level, for example 'German - Fluent'.",
      impact: "low",
    });
  }
  if (!projects.length && !certifications.length) {
    recommendations.push({
      category: "Content",
      title: "Show projects or certifications",
      detail: "A short projects section with a link, or relevant certificates, strengthens a thin CV.",
      impact: "medium",
    });
  }
  recommendations.push({
    category: "Keyword coverage",
    title: "Mirror the job description vocabulary",
    detail: "Reuse the exact terms recruiters use for the roles you are targeting.",
    impact: "medium",
  });

  return {
    summary: `This resume was analysed locally (no AI API key configured). It contains ${words.length} words, ${technical.length} recognisable technologies and an estimated ${overallScore}% overall quality.${foundSections.length ? ` Parsed ${foundSections.join(", ")} from the document structure.` : ""} Configure GROQ_API_KEY (or XAI_API_KEY) on the server to switch to model-written analysis.`,
    profile: {
      fullName: nameLine,
      email: emailMatch ? emailMatch[0] : "",
      phone: phoneMatch ? phoneMatch[0].trim() : "",
      location,
      links: (resumeText.match(/https?:\/\/[^\s)]+/g) || []).slice(0, 5),
      headline: technical.slice(0, 4).join(" • "),
    },
    skills: { technical, soft, categories },
    experience,
    education,
    projects,
    certifications,
    languages,
    keywords: keywordHits,
    strengths: [...new Set([...technical.slice(0, 3), ...soft.slice(0, 2)])].slice(0, 5),
    weaknesses: [
      ...(quantified.length < 3 ? ["No measurable results found"] : []),
      ...(bullets < 4 ? ["Few action-oriented bullet points"] : []),
      ...(experience.length ? [] : ["No parsable work experience section"]),
      ...(education.length ? [] : ["No parsable education section"]),
      "Run an AI analysis for a deeper narrative rewrite of each bullet",
    ].slice(0, 6),
    scoreBreakdown: {
      skills: skillsScore,
      experience: experienceScore,
      education: educationScore,
      structure: structureScore,
      keywords: keywordsScore,
    },
    recommendations,
    overallScore,
  };
};

const heuristicMatch = ({ resumeText, job }) => {
  const resumeLower = resumeText.toLowerCase();
  const jobLower = `${job.title} ${job.description} ${(job.requirements || []).join(" ")}`.toLowerCase();

  const allTerms = [...new Set(Object.values(SKILL_DICTIONARY).flat())];
  const jobSkills = allTerms.filter((t) => countOccurrences(jobLower, t) > 0);
  const resumeSkills = allTerms.filter((t) => countOccurrences(resumeLower, t) > 0);

  const matchingSkills = jobSkills.filter((t) => resumeSkills.includes(t));
  const missingSkills = jobSkills.filter((t) => !resumeSkills.includes(t));

  const skillsScore = jobSkills.length
    ? clampScore((matchingSkills.length / jobSkills.length) * 100, 40)
    : 65;

  const yearsMatch = jobLower.match(/(\d+)\+?\s*(?:-\s*(\d+)?\s*)?years?/);
  const yearsRequired = yearsMatch ? Number(yearsMatch[1]) : 0;
  const yearsCandidate = Math.min(
    12,
    (resumeText.match(/(\d{4})\s*-\s*(?:\d{4}|present|current)/gi) || []).length * 1.5
  );
  const experienceScore = yearsRequired
    ? clampScore((Math.min(yearsCandidate, yearsRequired) / yearsRequired) * 100, 50)
    : 70;

  const educationScore = ["degree", "bachelor", "master", "university", "diploma"].some((k) =>
    resumeLower.includes(k)
  )
    ? 80
    : 45;

  const hasProjects = resumeLower.includes("project");
  const projectsScore = hasProjects ? 75 : 50;
  const keywordsScore = clampScore(skillsScore * 0.8 + 20, 40);

  const overallScore = clampScore(
    skillsScore * 0.4 + experienceScore * 0.25 + educationScore * 0.15 + projectsScore * 0.1 + keywordsScore * 0.1
  );

  const verdict =
    overallScore >= 85 ? "excellent" : overallScore >= 70 ? "strong" : overallScore >= 55 ? "moderate" : overallScore >= 40 ? "weak" : "poor";

  return {
    overallScore,
    verdict,
    scoreBreakdown: {
      skills: skillsScore,
      experience: experienceScore,
      education: educationScore,
      projects: projectsScore,
      keywords: keywordsScore,
    },
    matchingSkills,
    missingSkills,
    matchingExperience: yearsRequired
      ? [`Resume shows roughly ${yearsCandidate.toFixed(0)} years of experience against ${yearsRequired}+ required`]
      : ["No explicit years of experience requirement detected"],
    missingExperience: missingSkills.slice(0, 3).map((s) => `No evidence of ${s} in the resume`),
    matchingEducation: educationScore >= 70 ? ["Academic background detected in the resume"] : [],
    matchingProjects: hasProjects ? ["Projects section present"] : [],
    matchingKeywords: matchingSkills.slice(0, 10),
    missingKeywords: missingSkills.slice(0, 10),
    explanation: `This match was calculated locally (no AI API key configured). You match ${matchingSkills.length} of the ${jobSkills.length} technologies detected in the job description. ${missingSkills.length ? `The main gaps are ${missingSkills.slice(0, 3).join(", ")}.` : "No major technology gaps were detected."}`,
    recommendations: missingSkills.length
      ? [
          `Add concrete evidence of ${missingSkills.slice(0, 2).join(" and ")} to your experience or projects.`,
          "Tailor your professional summary to the exact job title.",
          "Mirror the job description keywords in your skills section.",
        ]
      : ["Highlight your strongest achievements with measurable results."],
  };
};

/* ------------------------------------------------------------------ *
 * Public service API
 * ------------------------------------------------------------------ */

/** Extracts raw text from an uploaded file (thin, stable wrapper). */
const extractText = extractResumeInformation;

/**
 * Turns a resume text blob into the full structured analysis payload.
 * Uses the configured provider (Groq or xAI) when a key is present, otherwise a local heuristic pass.
 */
const analyzeResume = async (resumeText) => {
  if (!resumeText || resumeText.trim().length < 20) {
    throw ApiError.unprocessable(
      "The CV text is empty or too short to analyse. Please upload a CV that contains readable text."
    );
  }

  if (!isConfigured()) {
    return { ...heuristicResumeAnalysis(resumeText), analysisSource: "heuristic" };
  }

  const raw = await callModel({ system: RESUME_SYSTEM_PROMPT, prompt: resumePrompt(resumeText) });

  const scoreBreakdown = {
    skills: clampScore(raw?.scoreBreakdown?.skills, 0),
    experience: clampScore(raw?.scoreBreakdown?.experience, 0),
    education: clampScore(raw?.scoreBreakdown?.education, 0),
    structure: clampScore(raw?.scoreBreakdown?.structure, 0),
    keywords: clampScore(raw?.scoreBreakdown?.keywords, 0),
  };

  return {
    summary: normaliseText(raw?.summary),
    profile: {
      fullName: normaliseText(raw?.profile?.fullName),
      email: normaliseText(raw?.profile?.email),
      phone: normaliseText(raw?.profile?.phone),
      location: normaliseText(raw?.profile?.location),
      links: asStringArray(raw?.profile?.links),
      headline: normaliseText(raw?.profile?.headline),
    },
    skills: {
      technical: asStringArray(raw?.skills?.technical),
      soft: asStringArray(raw?.skills?.soft),
      categories: normaliseCategories(raw?.skills?.categories),
    },
    experience: normaliseExperience(raw?.experience),
    education: normaliseEducation(raw?.education),
    projects: normaliseProjects(raw?.projects),
    certifications: normaliseCertifications(raw?.certifications),
    languages: normaliseLanguages(raw?.languages),
    keywords: asStringArray(raw?.keywords),
    strengths: asStringArray(raw?.strengths),
    weaknesses: asStringArray(raw?.weaknesses),
    scoreBreakdown,
    recommendations: normaliseRecommendations(raw?.recommendations),
    overallScore: clampScore(raw?.overallScore, 0),
    analysisSource: getConfig().provider,
  };
};

/**
 * Derives scores and section ratings from an existing analysis.
 * Guarantees every analysis carries a consistent 0-100 breakdown.
 */
const calculateResumeInsights = (analysis) => {
  const breakdown = {
    skills: clampScore(analysis?.scoreBreakdown?.skills, 0),
    experience: clampScore(analysis?.scoreBreakdown?.experience, 0),
    education: clampScore(analysis?.scoreBreakdown?.education, 0),
    structure: clampScore(analysis?.scoreBreakdown?.structure, 0),
    keywords: clampScore(analysis?.scoreBreakdown?.keywords, 0),
  };

  const overall =
    analysis?.overallScore ??
    clampScore(
      breakdown.skills * 0.3 +
        breakdown.experience * 0.3 +
        breakdown.education * 0.15 +
        breakdown.structure * 0.15 +
        breakdown.keywords * 0.1
    );

  return {
    overallScore: clampScore(overall, 0),
    scoreBreakdown: breakdown,
    strengths: asStringArray(analysis?.strengths),
    weaknesses: asStringArray(analysis?.weaknesses),
    recommendations: Array.isArray(analysis?.recommendations) ? analysis.recommendations : [],
  };
};

/** Compares a resume against a job and returns the full match payload. */
const matchResumeWithJob = async ({ resumeText, job }) => {
  if (!job?.description || job.description.trim().length < 40) {
    throw ApiError.unprocessable(
      "The job description is missing or too short to compare against. Paste the full job description and try again."
    );
  }

  if (!isConfigured()) {
    return { ...heuristicMatch({ resumeText, job }), analysisSource: "heuristic" };
  }

  const raw = await callModel({
    system: matchSystemPrompt,
    prompt: matchPrompt({ resumeText, job }),
  });

  return {
    overallScore: clampScore(raw?.overallScore, 0),
    verdict: ["excellent", "strong", "moderate", "weak", "poor"].includes(raw?.verdict)
      ? raw.verdict
      : "moderate",
    scoreBreakdown: {
      skills: clampScore(raw?.scoreBreakdown?.skills, 0),
      experience: clampScore(raw?.scoreBreakdown?.experience, 0),
      education: clampScore(raw?.scoreBreakdown?.education, 0),
      projects: clampScore(raw?.scoreBreakdown?.projects, 0),
      keywords: clampScore(raw?.scoreBreakdown?.keywords, 0),
    },
    matchingSkills: asStringArray(raw?.matchingSkills),
    missingSkills: asStringArray(raw?.missingSkills),
    matchingExperience: asStringArray(raw?.matchingExperience),
    missingExperience: asStringArray(raw?.missingExperience),
    matchingEducation: asStringArray(raw?.matchingEducation),
    matchingProjects: asStringArray(raw?.matchingProjects),
    matchingKeywords: asStringArray(raw?.matchingKeywords),
    missingKeywords: asStringArray(raw?.missingKeywords),
    explanation: normaliseText(raw?.explanation),
    recommendations: asStringArray(raw?.recommendations),
    analysisSource: getConfig().provider,
  };
};

/**
 * "Improve My CV" — returns rewrite suggestions.
 * These are AI recommendations that the user must review before using.
 */
const improveResume = async ({ resumeText, weaknesses = [] }) => {
  if (!isConfigured()) {
    const { sections } = splitCvSections(resumeText || "");
    const summaryLines = (sections.summary || []).map((l) => l.trim()).filter(Boolean);
    const firstBullet = String(resumeText || "")
      .split(/\r?\n/)
      .map((l) => l.replace(BULLET_RE, "").trim())
      .find((l) => l.length > 40);
    const original = cleanSegment(summaryLines[0] || firstBullet || "");
    const quantified = (String(resumeText || "").match(/\b\d+\s?%|\$\s?\d|\b\d{2,}\b/g) || []).length;

    return {
      summary:
        "AI rewrite suggestions are unavailable because no AI API key is configured on the server. The tips below are the same rules the model applies.",
      original: original.slice(0, 400),
      rewritten: original
        ? `Rewrite "${original.slice(0, 140)}" so it starts with a strong action verb, names the technology used, and ends with a measurable result (for example "cut load time by 35%"). Keep one idea per line.`
        : "No summary or achievement line was detected. Add a three-line professional summary: role, years of experience, and one measurable result.",
      tips: [
        ...weaknesses.map((w) => `Fix this weakness: ${cleanSegment(w)}`),
        ...(quantified ? [] : ["Add numbers everywhere: percentages, users, revenue, time saved."]),
        "Configure GROQ_API_KEY (or XAI_API_KEY) in server/.env to unlock model-written rewrites.",
      ].slice(0, 6),
      analysisSource: "heuristic",
    };
  }

  const raw = await callModel({
    system: improveSystemPrompt,
    prompt: improvePrompt(resumeText, weaknesses.length ? weaknesses : ["Vague professional summary"]),
    maxTokens: 2000,
  });

  return {
    summary: normaliseText(raw?.summary),
    original: normaliseText(raw?.original),
    rewritten: normaliseText(raw?.rewritten),
    tips: asStringArray(raw?.tips),
    analysisSource: getConfig().provider,
  };
};

module.exports = {
  analyzeResume,
  extractResumeInformation: extractText,
  extractText,
  calculateResumeInsights,
  matchResumeWithJob,
  improveResume,
  isConfigured,
  getProviderInfo,
};
