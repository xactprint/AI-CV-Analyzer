# AI CV Analyzer

**Understand your CV. Match your career.**

A full-stack CV analysis and job-compatibility workspace. Upload a PDF, DOCX or photo of your CV, the
server extracts the text (OCR for scanned documents), scores the CV, extracts every section into
structured JSON, then compares the CV against any job description you paste in.

> Job descriptions are always supplied by the user. Nothing in this project scrapes LinkedIn or any
> other job board — see [`docs/assignment.md`](docs/assignment.md) for the original brief.

- **Frontend** — React 19 + Vite 8, Tailwind CSS 4, shadcn/ui, Magic UI, Recharts, Framer Motion
- **Backend** — Node.js + Express 5, Multer, JWT auth, Mongoose 9
- **Database** — MongoDB Atlas
- **AI** — xAI Grok (`grok-4` by default), with a deterministic local fallback
- **Status** — lint and production build clean, full API pipeline verified against Atlas

---

## Table of contents

- [Features](#features)
- [Application pages](#application-pages)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [MongoDB Atlas setup](#mongodb-atlas-setup)
- [xAI and Grok setup](#xai-and-grok-setup)
- [npm scripts](#npm-scripts)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Security](#security)
- [Quality checks](#quality-checks)
- [Known limitations](#known-limitations)
- [Troubleshooting](#troubleshooting)
- [Team members](#team-members)

---

## Features

**Accounts and security**

- Register / log in with JWT (7-day tokens) and bcrypt-hashed passwords.
- Every query is scoped to the signed-in user — one account can never read another account's CVs,
  jobs or matches.
- Profile editing, password change and light/dark/system theme in Settings.

**CV upload and extraction**

- Drag-and-drop upload of **PDF, DOCX, PNG, JPG**, 10 MB max, MIME *and* extension validated, one
  file per request.
- Text extraction with `pdf-parse` (PDF), `mammoth` (DOCX) and `tesseract.js` OCR (images, and
  scanned PDFs whose text layer is under 120 characters). The extraction method actually used is
  stored on the document as `extractionMethod`.
- A file that yields fewer than 20 readable characters is rejected with an explicit message instead
  of a blank analysis.
- Multiple CV versions per account with a `label` (*Frontend*, *Full Stack*, *Internship*…), a
  `version` number, one `isPrimary` CV, relabelling and delete (which also removes the analyses and
  the file on disk).

**CV analysis**

- Overall score 0–100 plus a breakdown for skills, experience, education, structure and keywords.
- Structured extraction of profile (name, email, phone, location, links, headline), technical and
  soft skills, skill categories with levels, experience, education, projects, certifications and
  languages.
- Vertical score bar chart, per-category bar chart and a **skill radar chart**.
- Recommendations grouped by category and impact (`high` / `medium` / `low`).
- **Improve My CV** panel: rewrites a weak summary, returns concrete tips, and is always labelled as
  a suggestion to review rather than a final CV.
- Staged progress feedback while the model works: *Uploading CV → Extracting content → Understanding
  profile → Analyzing skills → Evaluating experience → Generating score → Preparing
  recommendations.*

**Job matching**

- Save any job description (title, company, location, employment type, requirements, optional source
  URL).
- Match score with a verdict (`excellent`, `strong`, `moderate`, `weak`, `poor`), matching/missing
  skills, matching/missing experience, matching education, matching projects, matching/missing
  keywords, a per-metric breakdown and a written explanation.
- Sortable and filterable match history (`sort`, `verdict`, `search`, `minScore`).
- CV-versus-CV comparison page (metric by metric, side by side).

**Resilience**

- Skeletons, staged progress and retryable error states instead of a blank screen.
- Specific messages for invalid files, oversized files, unsupported formats, OCR failures, AI API
  failures, database failures, invalid/expired JWTs and too little text.
- Works with **no `XAI_API_KEY` at all**: a deterministic local analyser keeps the whole pipeline
  demonstrable (see [xAI and Grok setup](#xai-and-grok-setup)).

---

## Application pages

| Route        | Page        | Auth | What it does                                                       |
| ------------ | ----------- | ---- | ------------------------------------------------------------------ |
| `/`          | Landing     | no   | Marketing page, feature grid, call to action                        |
| `/login`     | Login       | no   | Sign in                                                             |
| `/register`  | Register    | no   | Create an account                                                    |
| `/dashboard` | Dashboard   | yes  | Score trend, recent analyses, match history snapshot                |
| `/cvs`       | My CVs      | yes  | List, relabel, set primary, analyse, delete                      |
| `/cvs/upload`| Upload CV   | yes  | Drag-and-drop upload with validation feedback                       |
| `/cvs/:id`   | Analysis    | yes  | Full analysis, charts, sections, recommendations, improve panel     |
| `/matcher`   | Job Matcher | yes  | Paste a job, run a match, inspect gaps                              |
| `/history`   | History     | yes  | Filter and sort every match                                          |
| `/compare`   | Compare     | yes  | Compare two analysed CV versions                                    |
| `/settings`  | Settings    | yes  | Name, job title, password, theme                                    |
| `*`          | Not found   | no   | 404 page                                                             |

---

## Tech stack

| Layer        | Technology                                                                       |
| ------------ | -------------------------------------------------------------------------------- |
| Frontend     | React 19, Vite 8, React Router 7, Tailwind CSS 4                                 |
| UI kit       | shadcn/ui on Radix primitives, Magic UI animations, `lucide-react` icons           |
| Charts       | Recharts 3 (bar, grouped bar, radar)                                               |
| Animation    | Framer Motion 13                                                                   |
| State / UX   | `next-themes` (light/dark/system), `axios` (API client)                            |
| Backend      | Node.js 22, Express 5, Multer 2, CORS, `dotenv`, `nodemon`                        |
| Database     | MongoDB Atlas with Mongoose 9                                                      |
| Auth         | `jsonwebtoken`, `bcryptjs`                                                         |
| Documents    | `pdf-parse` 2, `mammoth` 1, `tesseract.js` 7 (OCR)                                |
| AI           | xAI Grok chat-completions API (`https://api.x.ai/v1`)                             |

---

## Architecture

```
React (client)  ──JWT──▶  Express API  ──▶  xAI / Grok
                                 │
                                 ├──▶  Mongoose ──▶ MongoDB Atlas
                                 └──▶  services/extractionService.js   (pdf / docx / OCR)
                                 └──▶  server/uploads/                 (original files)
```

- `server/services/aiService.js` owns every prompt, the JSON normalisation and the scoring maths.
  It exposes `extractResumeInformation`, `analyzeResume`, `calculateResumeInsights`,
  `matchResumeWithJob` and `improveResume`, and transparently falls back to a deterministic local
  pass when no API key is configured.
- `server/services/extractionService.js` owns text extraction and never touches HTTP.
- Controllers stay thin: validate, call a service, persist, respond.
- `server/middleware/` holds JWT protection, upload handling and one central error handler.

---

## Data model

```
User ──┬── Resume ──┬── Analysis
       │            └── (file on disk: server/uploads)
       └── Job ──────── Match ──▶ (Resume + Analysis)
```

**User** — `name`, `email` (unique, lowercase), `password` (bcrypt), `jobTitle`, `role`
(`user` / `admin`), `preferences.theme` (`light` / `dark` / `system`), timestamps.

**Resume** — `user`, `fileName`, `originalName`, `mimeType`, `extension`
(`pdf` / `docx` / `png` / `jpg` / `jpeg`), `fileSize`, `filePath`, `label` (default `General`),
`version`, `isPrimary`, `extractedText`, `textLength`, `extractionMethod`
(`pdf-text` / `docx-text` / `ocr` / `pending` / `failed`), `status` (`uploaded` → `extracting` →
`extracted` → `analyzing` → `analyzed`, or `failed`).

**Analysis** — `user`, `resume`, `overallScore`, `summary`, `profile`, `skills`
(technical / soft / categories), `experience[]`, `education[]`, `projects[]`, `certifications[]`,
`languages[]`, `keywords[]`, `strengths[]`, `weaknesses[]`, `scoreBreakdown`
(skills / experience / education / structure / keywords), `recommendations[]` (category, title,
detail, impact), `improvement` (summary, original, rewritten, tips), `analysisSource`
(`xai` / `heuristic`), `durationMs`. One document per CV; re-analysing replaces it.

**Job** — `user`, `title`, `company`, `location`, `employmentType` (`full-time`, `part-time`,
`internship`, `contract`, `freelance`, `other`), `description`, `requirements[]`, `sourceUrl`,
`source` (`manual` / `pasted` / `imported`), `isActive`.

**Match** — `user`, `job`, `resume`, `analysis`, `overallScore`, `verdict`, `matchingSkills[]`,
`missingSkills[]`, `matchingExperience[]`, `missingExperience[]`, `matchingEducation[]`,
`matchingProjects[]`, `matchingKeywords[]`, `missingKeywords[]`, `scoreBreakdown`
(skills / experience / education / projects / keywords), `explanation`, `recommendations[]`,
`analysisSource`, `durationMs`. Re-running a match on the same pair updates the existing document.

All five collections are created automatically by Mongoose on first write — no migration step.

---

## Quick start

Requirements: **Node.js 20+** (developed on 22) and a MongoDB database. The project was verified
against **MongoDB Atlas**, but any MongoDB works — point `MONGODB_URI` at a local
`mongodb://127.0.0.1:27017/ai_cv_analyzer` if you prefer. An xAI API key is optional.

```bash
# 1. API dependencies and configuration
cd server
npm install
copy .env.example .env        # Windows PowerShell  (macOS/Linux: cp .env.example .env)

# 2. Client dependencies and configuration
cd ../client
npm install
copy .env.example .env        # macOS/Linux: cp .env.example .env
```

Fill in `server/.env` (see [Environment variables](#environment-variables)), then run the two dev
servers in separate terminals:

```bash
# terminal 1 — API on http://localhost:5000
cd server
npm run dev                   # nodemon

# terminal 2 — client on http://localhost:5173
cd client
npm run dev                   # vite
```

Open <http://localhost:5173>, create an account and upload a CV. The landing page works without an
account; everything else is behind the auth guard.

**Single-origin production mode** — build the client once and let Express serve it (no CORS, one
port):

```bash
cd client && npm run build
cd ../server && npm start      # http://localhost:5000 serves the API *and* the built client
```

---

## Environment variables

`server/.env` — copy from `server/.env.example`:

```ini
PORT=5000
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:5173
XAI_API_KEY=
XAI_MODEL=grok-4
MONGO_DNS_SERVERS=
```

| Variable            | Required | Purpose                                                                                                   |
| ------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `PORT`              | no       | API port, default `5000`                                                                                  |
| `MONGODB_URI`       | yes      | MongoDB connection string                                                                                  |
| `JWT_SECRET`        | yes      | Signing secret for access tokens; the server refuses to sign without it                                    |
| `CLIENT_URL`        | yes      | The single CORS origin allowed                                                                             |
| `XAI_API_KEY`       | no       | xAI key. Missing or placeholder → deterministic fallback analyser                                           |
| `XAI_MODEL`         | no       | Model id, default `grok-4`                                                                                 |
| `MONGO_DNS_SERVERS` | no       | Comma separated DNS resolvers for Atlas SRV lookups, e.g. `8.8.8.8,1.1.1.1`. Set it if your network resolver cannot answer `_mongodb._tcp` queries |

`client/.env` — copy from `client/.env.example`:

```ini
VITE_API_URL=http://localhost:5000/api
```

Never commit a real `.env`. Both are git-ignored, and `MONGODB_URI`, `JWT_SECRET` and
`XAI_API_KEY` never leave the server — the React bundle only ever contains `VITE_*` values.

---

## MongoDB Atlas setup

1. Create a free **M0** cluster.
2. **Database Access** → add a user with *Read and write to any database*.
3. **Network Access** → allow your own IP (or `0.0.0.0/0` while demoing).
4. **Deploy** → copy the connection string into `server/.env`:

```ini
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ai_cv_analyzer?retryWrites=true&w=majority
```

Generate a `JWT_SECRET` with any long random string, for example:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

If your network DNS cannot resolve Atlas SRV records, the connection fails with
`querySrv ECONNREFUSED`. Add `MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1` to `server/.env`; the server then
resolves the SRV lookup through those resolvers instead of the system one.

---

## xAI and Grok setup

1. Create an API key at <https://console.x.ai>.
2. Add it to `server/.env`:

```ini
XAI_API_KEY=xai-...
XAI_MODEL=grok-4
```

3. Restart the server and confirm which provider is live:

```bash
curl http://localhost:5000/api/health
# {"success":true,"message":"AI CV Analyzer API is running","aiProvider":"xAI (Grok)","uptime":3}
```

**Without a key** the health endpoint reports `heuristic (XAI_API_KEY not set)` and every response
carries `analysisSource: "heuristic"`. The fallback is not a stub: it is a deterministic analyser
that

- detects section headings (`SUMMARY`, `EXPERIENCE`, `EDUCATION`, `PROJECTS`, `CERTIFICATIONS`,
  `LANGUAGES`, `SKILLS` and common aliases);
- parses role / company / date range / duration, degree / field / institution / years / grade,
  project name / description / technologies / link, certification name / issuer / date, and
  language name / proficiency;
- matches a built-in technology dictionary for skills, keyword coverage and per-category levels;
- derives the five sub-scores, strengths, weaknesses and impact-ranked recommendations;
- produces a match verdict, matching/missing skills and a written explanation.

This keeps the product fully demonstrable (and the API testable) before anyone has an API key. Add
`XAI_API_KEY` to switch the same endpoints to Grok — the response shape does not change, only
`analysisSource` and the depth of the writing.

---

## npm scripts

| Location       | Script          | What it does                                    |
| -------------- | --------------- | ----------------------------------------------- |
| `server`       | `npm run dev`   | `nodemon server.js` with auto-reload            |
| `server`       | `npm start`     | `node server.js`                                |
| `client`       | `npm run dev`   | Vite dev server with HMR on port 5173          |
| `client`       | `npm run build` | Production build into `client/dist`             |
| `client`       | `npm run preview` | Serve the production build locally            |
| `client`       | `npm run lint`  | ESLint over the whole client                    |

---

## API reference

Base URL `http://localhost:5000/api`. Protected routes need `Authorization: Bearer <token>`.
Errors always come back as `{ "success": false, "message": "..." }` with a meaningful status code:
`400` bad request, `401` missing/invalid token, `403` forbidden, `404` not found or not yours,
`409` conflict, `413` file too large, `415` unsupported media, `422` unprocessable content,
`500` server error, `502` upstream (AI) failure.

### Health

| Method | Route     | Auth | Description                                            |
| ------ | --------- | ---- | ------------------------------------------------------ |
| GET    | `/health` | no   | Service status, uptime and the active AI provider      |

### Auth

| Method | Route            | Auth | Description                                          |
| ------ | ---------------- | ---- | ---------------------------------------------------- |
| POST   | `/auth/register` | no   | Create an account, returns a JWT                     |
| POST   | `/auth/login`    | no   | Sign in, returns a JWT                               |
| GET    | `/auth/me`       | yes  | Current user                                         |
| PUT    | `/auth/profile`  | yes  | Update name, job title, theme                         |
| PUT    | `/auth/password` | yes  | Change password                                      |

```jsonc
// POST /api/auth/register   { "name": "Jane Doe", "email": "jane@dev.io", "password": "••••••••" }
// POST /api/auth/login      { "email": "jane@dev.io", "password": "••••••••" }
// 201 -> { "success": true, "token": "<jwt>", "user": { "id": "...", "name": "Jane Doe", ... } }
```

### Resumes

| Method | Route               | Auth | Description                                             |
| ------ | ------------------- | ---- | ------------------------------------------------------- |
| POST   | `/resumes/upload`   | yes  | `multipart/form-data`, field `file`                     |
| GET    | `/resumes`          | yes  | The user's CVs with `status`, `label` and `latestScore`  |
| GET    | `/resumes/:id`      | yes  | One CV with its latest analysis and `matchCount`         |
| GET    | `/resumes/:id/file` | yes  | Download the original file                               |
| PATCH  | `/resumes/:id`      | yes  | Change the `label` or set the CV as primary              |
| DELETE | `/resumes/:id`      | yes  | Delete the CV, its analyses and the file on disk         |

Accepted: `application/pdf`, DOCX, `image/png`, `image/jpeg` — 10 MB max, MIME and extension must
agree. Rejected uploads answer `415`; oversized files answer `413`.

### Analysis

| Method | Route                          | Auth | Description                                    |
| ------ | ------------------------------ | ---- | ---------------------------------------------- |
| POST   | `/analysis/:resumeId`          | yes  | Extract if needed, analyse, store the result    |
| GET    | `/analysis/:resumeId`          | yes  | Latest analysis for a CV                        |
| GET    | `/analysis?limit=10`           | yes  | Recent analyses for the dashboard               |
| POST   | `/analysis/:resumeId/improve`  | yes  | Rewrite suggestions for the weakest parts       |
| GET    | `/analysis/compare?a=&b=`      | yes  | Compare two analysed CV versions, with a delta  |

```jsonc
// POST /api/analysis/:resumeId  ->  201
// {
//   "success": true,
//   "analysis": {
//     "overallScore": 82,
//     "analysisSource": "heuristic",
//     "scoreBreakdown": { "skills": 98, "experience": 58, "education": 78, "structure": 94, "keywords": 98 },
//     "profile": { "fullName": "JANE DOE", "email": "...", "phone": "...", "location": "Tunis, Tunisia" },
//     "experience": [ { "title": "...", "company": "...", "startDate": "2022", "endDate": "Present", "duration": "4 yrs 6 mo", "highlights": ["..."] } ],
//     "education": [ { "degree": "BSc", "field": "Computer Science", "institution": "University of Tunis", "startYear": "2016", "endYear": "2020" } ],
//     "recommendations": [ { "category": "Impact", "title": "...", "detail": "...", "impact": "high" } ],
//     "durationMs": 143
//   }
// }
```

### Jobs and matching

| Method | Route                                  | Auth | Description                                   |
| ------ | -------------------------------------- | ---- | --------------------------------------------- |
| POST   | `/jobs`                                | yes  | Save a job description                         |
| GET    | `/jobs`                                | yes  | List saved jobs                                |
| GET    | `/jobs/:id`                            | yes  | One job with its match count and best score    |
| PUT    | `/jobs/:id`                            | yes  | Update a job                                   |
| DELETE | `/jobs/:id`                            | yes  | Delete a job (its matches go with it)          |
| POST   | `/jobs/:jobId/match/:resumeId`         | yes  | Run (or re-run) and save a match               |
| GET    | `/jobs/:jobId/matches?sort=&minScore=` | yes  | Matches for one job                             |
| GET    | `/matches?sort=&verdict=&search=&minScore=` | yes | Sortable, filterable match history        |
| GET    | `/matches/:id`                         | yes  | One match with its explanation                  |
| DELETE | `/matches/:id`                         | yes  | Delete a match                                  |

`sort` accepts `recent` (default), `oldest`, `scoreDesc` and `scoreAsc`. `verdict` accepts
`excellent`, `strong`, `moderate`, `weak`, `poor`. `GET /matches` also returns aggregate `stats`
(`count`, `averageScore`, `bestScore`) for the current filter.

```jsonc
// POST /api/jobs/:jobId/match/:resumeId  ->  201
// {
//   "success": true,
//   "match": {
//     "overallScore": 80,
//     "verdict": "strong",
//     "matchingSkills": ["react", "redux", "node.js", "mongodb", "rest", "typescript"],
//     "missingSkills": ["aws"],
//     "matchingKeywords": ["react", "node.js", "mongodb", "rest", "tailwind", "graphql"],
//     "scoreBreakdown": { "skills": 86, "experience": 70, "education": 75, "projects": 80, "keywords": 88 },
//     "explanation": "Strong React and Node.js overlap ...",
//     "analysisSource": "heuristic",
//     "durationMs": 140
//   }
// }
```

---

## Project structure

```
ai_cv_analyzer/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/      ScoreBarChart, CategoryBarChart, SkillRadar, ComparisonBarChart
│   │   │   ├── common/      shared feedback, stat cards, match result, stage progress, brand marks
│   │   │   ├── layout/      app shell with sidebar navigation
│   │   │   ├── magicui/     Magic UI animations
│   │   │   └── ui/          shadcn/ui primitives
│   │   ├── context/         AuthContext (JWT lifecycle)
│   │   ├── hooks/           useProgressStages, useDebounce
│   │   ├── lib/             axios client, constants, utils
│   │   ├── pages/           Landing, Login, Register, Dashboard, MyCvs, UploadCv,
│   │   │                    Analysis, JobMatcher, History, Compare, Settings, NotFound
│   │   ├── App.jsx          routes + auth guards
│   │   └── main.jsx
│   ├── public/
│   ├── .env.example
│   ├── components.json      shadcn/ui registry config
│   ├── eslint.config.js
│   └── package.json
├── server/
│   ├── config/db.js         Mongoose connection (optional custom DNS resolvers)
│   ├── controllers/         thin HTTP layer
│   ├── middleware/          auth (JWT), upload (multer), error handler
│   ├── models/              User, Resume, Analysis, Job, Match
│   ├── routes/              auth, resumes, analysis, jobs, matches
│   ├── services/
│   │   ├── aiService.js         xAI prompts, normalisation, scoring, heuristic fallback
│   │   └── extractionService.js pdf / docx / OCR text extraction
│   ├── utils/               ApiError, asyncHandler, JSON helpers
│   ├── uploads/             uploaded files (git-ignored, only .gitkeep is tracked)
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── docs/
│   ├── assignment.md        original project brief
│   └── screenshots/         capture checklist
├── .gitignore
├── TODO.md
└── README.md
```

---

## Security

- **JWT auth** — every resume, job, analysis and match route verifies the token and scopes the query
  to `req.user._id`, so no route can reach another account's data.
- **CORS locked to one origin** — the value comes from `CLIENT_URL` in the environment, never from a
  request header, so a random site cannot call the API from a browser.
- **bcryptjs** password hashing, with a minimum length enforced at registration and a 7-day token
  lifetime.
- **Security headers** — `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer` on every response.
- **Secrets stay on the server** — `MONGODB_URI`, `JWT_SECRET` and `XAI_API_KEY` are read from
  `server/.env` and never bundled into the client.
- **Upload validation** — MIME *and* extension must agree, 10 MB cap, one file per request, and
  files are stored under a random generated name so the client filename is never trusted on disk.
- **Central error handler** — every failure becomes a readable message; the app never returns a bare
  stack trace or a silent 500.

---

## Quality checks

```bash
cd client
npm run lint        # 0 problems
npm run build       # production build succeeds
```

Server side, every file passes `node --check`, and the following flow was exercised end to end
against a real Atlas cluster:

1. register → login → `GET /auth/me`
2. upload a PDF → text extracted (`extractionMethod: "pdf-text"`)
3. analyse → score, breakdown, sections, recommendations stored
4. improve → rewrite suggestions returned and persisted
5. create a job → run a match → verdict, gaps and explanation stored
6. match history → list, sort, filter
7. delete the CV and the job → documents and files removed

---

## Known limitations

- **Screenshots are not captured yet.** The checklist in `docs/screenshots/README.md` lists the four
  images to add (`landing.png`, `dashboard.png`, `analysis.png`, `job-matcher.png`); once they exist
  they should be embedded in this file.
- **Team table and repository URL** are still placeholders at the bottom of this file.
- **No automated test suite.** The server has no `test` script; verification is manual, as described
  in [Quality checks](#quality-checks).
- **OCR is slow.** A scanned PDF or image runs through Tesseract and can take a while; the UI shows
  staged progress while it works.
- **The fallback analyser is keyword-driven.** It is a deterministic parser, not a language model:
  it will not paraphrase your CV. Add `XAI_API_KEY` for model-written analysis and rewrites.
- **PDF table and multi-column layouts** can extract out of order; the AI path is more forgiving
  than the text layer.

---

## Troubleshooting

| Problem                                          | Fix                                                                                  |
| ------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `[mongodb] Invalid scheme`                       | `MONGODB_URI` is still the placeholder — paste your Atlas string.                     |
| `querySrv ECONNREFUSED`                          | Your resolver cannot answer Atlas SRV queries. Add `MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1`. |
| `JWT_SECRET is not configured on the server.`    | Add a long random `JWT_SECRET` to `server/.env`.                                      |
| `The AI service rejected our API key`            | `XAI_API_KEY` is wrong or expired.                                                    |
| Health reports `heuristic`                       | No valid `XAI_API_KEY` — the local analyser is used on purpose, not a failure.        |
| `Network Error` in the browser                   | The API is not running, or `VITE_API_URL` and `CLIENT_URL` disagree.                  |
| Upload rejected with `415`                       | Only PDF, DOCX, PNG and JPG up to 10 MB are accepted; MIME and extension must match.   |
| `413` on upload                                  | The file is above the 10 MB limit.                                                    |
| "We could not find any readable text in that file" | The document is an image without text, empty, or corrupt. |
| Stuck on "Extracting content"                    | OCR is running on an image or a scanned PDF; wait, or upload a text-based PDF.        |
| `401` right after registering                    | The stored token expired (7-day lifetime) — sign in again.                            |
| Port 5000 already in use                         | Another process owns the port. Change `PORT`, or stop the other process.              |

---

## Team members

| Name        | Role       | Responsibility     |
| ----------- | ---------- | ------------------ |
| _Your name_ | Full stack | _Add here_         |
| _Teammate_  | Full stack | _Add here_         |
| _Teammate_  | Frontend   | _Add here_         |

> Replace the placeholder names above with the real team, and add the repository clone command to
> [Quick start](#quick-start), before submitting.
