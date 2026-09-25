# TODO

Derived from the assignment checklist in `docs/assignment.md`.

## Code health

- [x] Production build fails: `Github` is not exported by lucide-react v1 — replaced with an inline
      brand mark in `src/components/common/BrandIcons.jsx`
- [x] `npm run build` fails on the missing `react-is` peer dependency of recharts — installed it
- [x] `npm run lint` failed with 18 errors, now 0
  - [x] 5 x `no-unused-vars` — `magicui/spotlight.jsx` (colour prop now used), `ui/input.jsx`,
        `ui/textarea.jsx`, `pages/Dashboard.jsx`, `pages/UploadCv.jsx`
  - [x] 3 x `react-refresh/only-export-components` — allowed `buttonVariants`, `badgeVariants`,
        `useAuth` in `eslint.config.js`
  - [x] 10 x `react-hooks/set-state-in-effect` — boot fetches moved into the effect with
        `apply*` helpers, request-key derived state in `History`/`Compare`, render-time reset in
        `useProgressStages`, drawer close handled by the nav click handlers
- [x] `isConfigured()` treated the `your_xai_api_key` placeholder as a real key and made every AI
      call fail — placeholders are now ignored, so a fresh clone uses the heuristic analyser
- [x] `ensureResume` assigned `req.resume`, shadowing Node's `IncomingMessage.prototype.resume()`.
      Every bodyless `POST /api/analysis/:id` killed the whole process with
      `TypeError: this.resume is not a function` in `IncomingMessage._dump` — renamed to `req.cvResume`
- [x] Mongoose 9 rejects `pre("save")` password hooks that are not async — `User.js` fixed
- [x] `findOneAndUpdate({ new: true })` is deprecated in Mongoose 9 — switched to `returnDocument: "after"`
- [x] Heuristic fallback (used whenever `XAI_API_KEY` is unset) returned empty experience, education,
      projects, certifications and languages, and picked the wrong candidate name. Added a
      deterministic section parser in `services/aiService.js` (headings, date ranges, durations,
      degree/field/institution split, project links, certification issuer/date, language levels)
- [x] Verified: `npm run lint` clean, `npm run build` clean, `node --check` on every server file,
      server boots and `/api/health` answers, protected routes return 401
- [x] End-to-end run against MongoDB Atlas: register/login, PDF upload + text extraction, analysis,
      improve, job create, match, history, delete CV and job. Test data and uploads cleaned up
      afterwards (0 documents left in the database)

## Deliverables

- [x] `client/.env` and `client/.env.example` with `VITE_API_URL` (spec 25)
- [x] Root `.gitignore` (node_modules, dist, .env, uploads) and `.env` added to the client ignore
- [x] Project `README.md`: description, features, technologies, installation, env vars, MongoDB +
      xAI configuration, how to run client and server, screenshots, API documentation, team
- [x] Assignment brief moved to `docs/assignment.md`, screenshots folder scaffolded

## Left for the team

- [ ] Fill in the team members table and the repository URL in `README.md`
- [ ] Capture the four screenshots listed in `docs/screenshots/README.md`
- [ ] Add a real `XAI_API_KEY` to `server/.env` to switch from the heuristic analyser to Grok
- [ ] Initialise Git and push (`git init`, first commit, remote) — not done here on purpose

## Notes

- `MONGODB_URI` and `JWT_SECRET` are already set in the ignored `server/.env` (Atlas cluster
  `ac-vmltqbx`). `MONGO_DNS_SERVERS=8.8.8.8,1.1.1.1` is required on this machine because the local
  resolver cannot answer Atlas SRV queries; remove it when your DNS works normally.
- Job descriptions are always user-supplied; no job-board or LinkedIn scraping anywhere.
