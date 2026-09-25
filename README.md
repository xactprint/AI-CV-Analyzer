# AI CV Analyzer

**Understand your CV. Match your career.**

An AI-powered CV analysis and job-compatibility workspace built with the MERN stack. Upload a
PDF, DOCX or photo of your CV, let the pipeline extract the text (with OCR for scanned documents),
score it with xAI / Grok, and then compare it against any job description you paste in.

> Job descriptions are always supplied by the user. The app never scrapes LinkedIn or any other
> job board — see [docs/assignment.md](docs/assignment.md) for the original brief.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Installation](#installation)
- [Environment variables](#environment-variables)
- [MongoDB configuration](#mongodb-configuration)
- [xAI / Grok configuration](#xai--grok-configuration)
- [Running the app](#running-the-app)
- [Screenshots](#screenshots)
- [API documentation](#api-documentation)
- [Project structure](#project-structure)
- [Security](#security)
- [Troubleshooting](#troubleshooting)
- [Team members](#team-members)

---

## Features

**Accounts & security**

- Register / log in with JWT, bcrypt-hashed passwords and a protected API surface.
- Every query is scoped to the signed-in user — one account can never read another account's CVs.
- Light/dark theme, profile editing and password change in Settings.

**CV upload & extraction**

- Drag-and-drop upload for **PDF, DOCX, PNG, JPG** (max 10 MB, MIME + extension validated).
- Text extraction with `pdf-parse` and `mammoth`; images and scanned PDFs fall back to OCR
  (`tesseract.js`).
- Multiple CV versions per user (e.g. *Frontend*, *Full Stack*, *Internship*) with labels, a
  primary CV, rename and delete.

**AI analysis**

- Overall CV score plus a breakdown for skills, experience, education, structure and keywords.
- Structured extraction of profile, technical/soft skills, experience, education, projects,
  certifications and languages.
- Skill distribution chart and a skill radar chart.
- Recommendations ranked by impact, and an **Improve My CV** panel that rewrites a weak summary
  into a sharper one (always labelled as a suggestion to review).
- Staged progress feedback while the AI works: *Uploading → Extracting → Understanding →
  Analyzing → Evaluating → Generating score → Preparing recommendations.*

**Job matching**

- Paste any job description (title, company, location, full text).
- Match score with matching skills, missing skills, matching/missing experience, education and
  keyword gaps, plus a human-readable *explanation* of the score.
- Sortable and filterable match history, and a CV-vs-CV comparison page (metric by metric).

**Resilience**

- Skeletons, staged progress and retryable error states instead of a blank screen.
- Friendly, specific messages for invalid files, oversized files, unsupported formats, OCR
  failures, AI API failures, database failures, invalid/expired JWTs and empty CV text.
- Works without an `XAI_API_KEY`: a local heuristic analyser keeps the whole pipeline demonstrable.

## Tech stack

| Layer      | Technology                                                                     |
| ---------- | ------------------------------------------------------------------------------ |
| Frontend   | React 19, Vite 8, React Router 7, Tailwind CSS 4                              |
| UI         | shadcn/ui (Radix), Magic UI (animated cards, border beam, marquee, spotlight)   |
| Charts     | Recharts                                                                       |
| Motion     | Framer Motion                                                                  |
| Backend    | Node.js, Express 5, Multer, CORS                                               |
| Database   | MongoDB Atlas with Mongoose 9                                                  |
| Auth       | jsonwebtoken, bcryptjs                                                         |
| Documents  | pdf-parse, mammoth, tesseract.js (OCR)                                         |
| AI         | xAI Grok chat-completions API (`https://api.x.ai/v1`)                           |

## Architecture

```
React (client)  ──JWT──▶  Express API  ──▶  xAI / Grok
                                │
                                ├──▶  Mongoose ──▶ MongoDB Atlas
                                └──▶  services/extractionService.js  (pdf / docx / OCR)
```

The AI logic lives in `server/services/aiService.js`; controllers stay thin and only orchestrate.
`aiService` exposes `extractResumeInformation`, `analyzeResume`, `calculateResumeInsights`,
`matchResumeWithJob` and `improveResume`, and transparently falls back to a deterministic
heuristic pass when no API key is configured.

Data model:

```
User ──┬── Resume ──┬── Analysis
       │            └── (source file on disk)
       └── Job ──────── Match ──▶ (Resume)
```

## Installation

Requires **Node.js 20+** and a MongoDB Atlas cluster.

```bash
git clone YOUR_REPOSITORY
cd ai-cv-analyzer

cd server
npm install
cp .env.example .env        # then fill in your own values

cd ../client
npm install
cp .env.example .env
```

## Environment variables

`server/.env` (copy from `server/.env.example`):

```ini
PORT=5000
MONGODB_URI=
JWT_SECRET=
CLIENT_URL=http://localhost:5173
XAI_API_KEY=
XAI_MODEL=grok-4
MONGO_DNS_SERVERS=
```

| Variable           | Required | Purpose                                                            |
| ------------------ | -------- | ------------------------------------------------------------------ |
| `PORT`             | no       | API port (default `5000`)                                          |
| `MONGODB_URI`      | yes      | MongoDB connection string                                          |
| `JWT_SECRET`       | yes      | Signing secret for access tokens                                   |
| `CLIENT_URL`       | yes      | The only CORS origin allowed                                       |
| `XAI_API_KEY`      | no       | xAI key. Without it the heuristic analyser is used instead         |
| `XAI_MODEL`        | no       | Model id, default `grok-4`                                         |
| `MONGO_DNS_SERVERS`| no       | Comma separated resolvers for Atlas SRV lookups, e.g. `8.8.8.8,1.1.1.1`. Set it when your network DNS cannot answer `_mongodb._tcp` queries |

`client/.env` (copy from `client/.env.example`):

```ini
VITE_API_URL=http://localhost:5000/api
```

Never commit a real `.env`. Both are git-ignored, and `MONGODB_URI`, `JWT_SECRET` and
`XAI_API_KEY` never leave the server — the React app only ever sees `VITE_*` values.

## MongoDB configuration

1. Create a free **M0** cluster on MongoDB Atlas.
2. **Database Access** → add a user with *Read and write to any database*.
3. **Network Access** → allow your IP (or `0.0.0.0/0` for a demo).
4. **Deploy** → copy the connection string and put it in `server/.env`:

```ini
MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/ai_cv_analyzer?retryWrites=true&w=majority
```

Collections (`User`, `Resume`, `Analysis`, `Job`, `Match`) are created automatically by Mongoose on
first write — nothing to migrate by hand.

## xAI / Grok configuration

1. Create an API key at <https://console.x.ai>.
2. Add it to `server/.env`:

```ini
XAI_API_KEY=xai-...
XAI_MODEL=grok-4
```

3. Restart the server and check which provider is active:

```bash
curl http://localhost:5000/api/health
# {"success":true,"aiProvider":"xAI (Grok)", ...}
```

If the key is missing (or still the `your_xai_api_key` placeholder) the health endpoint reports
`heuristic` and every analysis runs through the local fallback instead of failing.

## Running the app

Two terminals:

```bash
# terminal 1 — API
cd server
npm run dev        # nodemon, http://localhost:5000

# terminal 2 — client
cd client
npm run dev        # vite, http://localhost:5173
```

Open <http://localhost:5173>, register an account and start uploading CVs.

Production build (the Express server then also serves the built client):

```bash
cd client && npm run build
cd ../server && npm start        # http://localhost:5000
```

Quality checks:

```bash
cd client
npm run lint        # eslint
npm run build       # vite production build
```

## Screenshots

Screenshots live in [`docs/screenshots`](docs/screenshots):

| Landing | Dashboard | CV analysis | Job matcher |
| ------- | --------- | ----------- | ----------- |
| ![Landing](docs/screenshots/landing.png) | ![Dashboard](docs/screenshots/dashboard.png) | ![Analysis](docs/screenshots/analysis.png) | ![Job matcher](docs/screenshots/job-matcher.png) |

> Drop your own captures in `docs/screenshots/` with those file names.

## API documentation

Base URL `http://localhost:5000/api`. All protected routes need
`Authorization: Bearer <token>`. Errors always come back as
`{ "success": false, "message": "..." }` with a meaningful status code.

### Auth

| Method | Route               | Auth | Description                              |
| ------ | ------------------- | ---- | ---------------------------------------- |
| POST   | `/auth/register`    | no   | Create an account, returns a JWT         |
| POST   | `/auth/login`       | no   | Sign in, returns a JWT                   |
| GET    | `/auth/me`          | yes  | Current user                             |
| PUT    | `/auth/profile`     | yes  | Update name, job title, theme preference  |
| PUT    | `/auth/password`    | yes  | Change password                          |

```jsonc
// POST /api/auth/register  { "name": "...", "email": "...", "password": "..." }
// 201 -> { "success": true, "token": "<jwt>", "user": { ... } }
```

### Resumes

| Method | Route                | Auth | Description                                     |
| ------ | -------------------- | ---- | ----------------------------------------------- |
| POST   | `/resumes/upload`    | yes  | `multipart/form-data`, field `file`             |
| GET    | `/resumes`           | yes  | List the signed-in user's CVs                   |
| GET    | `/resumes/:id`       | yes  | One CV with its latest analysis and match count |
| GET    | `/resumes/:id/file`  | yes  | Download the original file                      |
| PATCH  | `/resumes/:id`       | yes  | Rename, set as primary                          |
| DELETE | `/resumes/:id`       | yes  | Delete the CV, its analyses and its file        |

Accepted: `application/pdf`, DOCX, `image/png`, `image/jpeg` — 10 MB max.

### Analysis

| Method | Route                        | Auth | Description                                  |
| ------ | ---------------------------- | ---- | -------------------------------------------- |
| POST   | `/analysis/:resumeId`        | yes  | Extract + analyse, stores the result         |
| GET    | `/analysis/:resumeId`        | yes  | Latest analysis for a CV                     |
| GET    | `/analysis?limit=10`         | yes  | Recent analyses for the dashboard            |
| POST   | `/analysis/:resumeId/improve`| yes  | Rewrite suggestions for the summary          |
| GET    | `/analysis/compare?a=&b=`    | yes  | Compare two analysed CV versions            |

### Jobs & matching

| Method | Route                             | Auth | Description                        |
| ------ | --------------------------------- | ---- | ---------------------------------- |
| POST   | `/jobs`                           | yes  | Save a job description             |
| GET    | `/jobs`                           | yes  | List saved jobs                    |
| GET    | `/jobs/:id`                       | yes  | One job with its matches           |
| PUT    | `/jobs/:id`                       | yes  | Update a job                       |
| DELETE | `/jobs/:id`                       | yes  | Delete a job                       |
| POST   | `/jobs/:jobId/match/:resumeId`    | yes  | Run (and save) a match             |
| GET    | `/jobs/:jobId/matches`            | yes  | Matches for one job                |
| GET    | `/matches?sort=&verdict=&search=&minScore=` | yes | Sortable / filterable history |
| GET    | `/matches/:id`                    | yes  | One match with its explanation     |
| DELETE | `/matches/:id`                    | yes  | Delete a match                     |

```jsonc
// POST /api/jobs/:jobId/match/:resumeId
// 201 -> {
//   "success": true,
//   "match": {
//     "overallScore": 87,
//     "matchingSkills": ["react", "node.js", "mongodb"],
//     "missingSkills": ["typescript", "aws"],
//     "matchingExperience": ["2 years building React SPAs"],
//     "missingExperience": ["No evidence of AWS experience"],
//     "matchingEducation": ["Relevant academic background"],
//     "recommendations": ["Demonstrate TypeScript in a project"],
//     "explanation": "Strong React experience, relevant Node.js experience ..."
//   }
// }
```

### Health

| Method | Route      | Auth | Description                                          |
| ------ | ---------- | ---- | ---------------------------------------------------- |
| GET    | `/health`  | no   | Service status and which AI provider is active       |

## Project structure

```
ai-cv-analyzer/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── charts/        Recharts visualisations
│   │   │   ├── common/        shared feedback, stat cards, match result
│   │   │   ├── layout/        app shell with sidebar navigation
│   │   │   ├── magicui/       Magic UI animations
│   │   │   └── ui/            shadcn/ui primitives
│   │   ├── context/           AuthContext (JWT lifecycle)
│   │   ├── hooks/             useProgressStages, useDebounce
│   │   ├── lib/               axios client, constants
│   │   ├── pages/             Landing, Login, Register, Dashboard,
│   │   │                      MyCvs, UploadCv, Analysis, JobMatcher,
│   │   │                      History, Compare, Settings, NotFound
│   │   ├── App.jsx            routes + auth guards
│   │   └── main.jsx
│   ├── public/
│   ├── .env.example
│   ├── components.json
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── config/                MongoDB connection
│   ├── controllers/           thin HTTP layer
│   ├── middleware/            auth (JWT), upload (multer), error handler
│   ├── models/                User, Resume, Analysis, Job, Match
│   ├── routes/                auth, resumes, analysis, jobs, matches
│   ├── services/
│   │   ├── aiService.js       xAI prompts, scoring, heuristic fallback
│   │   └── extractionService  pdf / docx / OCR text extraction
│   ├── utils/                 ApiError, asyncHandler, JSON helpers
│   ├── uploads/               user files (git-ignored)
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── docs/
│   ├── assignment.md          original project brief
│   └── screenshots/
├── .gitignore
└── README.md
```

## Security

- **JWT auth** — every resume, job, analysis and match route verifies the token and scopes the
  query to `req.user.id`.
- **CORS locked to one origin** — `CLIENT_URL` only, never a reflected request header.
- **bcryptjs** password hashing, with a minimum length enforced at registration.
- **Secrets stay on the server** — `MONGODB_URI`, `JWT_SECRET` and `XAI_API_KEY` are read from
  `server/.env` and never bundled into the client.
- **Upload validation** — MIME *and* extension must agree, 10 MB cap, one file per request, and
  files are stored under a random generated name so client filenames are never trusted.
- **Error handling** — a central handler turns every failure into a readable message; the app
  never returns a bare 500.

## Troubleshooting

| Problem                                        | Fix                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| `[mongodb] Invalid scheme`                     | `MONGODB_URI` is still the placeholder — paste your Atlas string.       |
| `The AI service rejected our API key`          | `XAI_API_KEY` is wrong, or expired.                                      |
| Health says `heuristic`                        | No valid `XAI_API_KEY`; the local analyser is used on purpose.          |
| `Network Error` in the client                  | The API is not running, or `VITE_API_URL` / `CLIENT_URL` disagree.      |
| Upload rejected                                | Only PDF, DOCX, PNG and JPG up to 10 MB are accepted.                   |
| Stuck on "Extracting text"                     | Scanned images run through OCR and can take a while; re-run the analysis.|

## Team members

| Name | Role | Responsibility |
| ---- | ---- | -------------- |
| _Your name_ | Full stack | _Add here_ |
| _Teammate_  | Full stack | _Add here_ |
| _Teammate_  | Full stack | _Add here_ |

> Replace this table with the real team before submitting, together with the repository URL.
