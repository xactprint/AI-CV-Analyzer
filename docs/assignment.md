Do not scrape LinkedIn

Do NOT build an unauthorized LinkedIn scraper. LinkedIn's Talent Solutions APIs have specific access requirements

—

## don't assume a public job

search API i
s available to every application.

Option A — Manual Job Entry

User pastes job title, company, location, description, URL.

Option B — Job Import

Allow a user to paste/import a publicly available job description from a source whose terms permit that use.

Option C — External Jobs API

If the team has access to an appropriate jobs API, create GET /api/jobs and normalize results into the Job model.

16. Interface & UI Requirements

Dashboard

Should look like a professional AI SaaS application: sidebar navigation (Dashboard, My CVs, Job Matcher, History,
Settings), stat cards (CV score, jobs analyzed, best match), and a recent analyses list.

CV Upload Interface

Impressive drag-and-drop zone supporting PDF, DOCX, PNG, JPG, with a live progress sequence: Uploading →
Extracting text → Analyzing with AI → Generating insights.

Analysis Dashboard

A visually rich results page with sections for CV Score, Profile, Skills, Experience, Education, Projects, Certifications,
Languages, and Recommendations — built with cards, badges, charts, progress bars and timelines.

Visualizations

Use bar/radar charts for skill distribution, e.g. Frontend 85%, Backend 70%, Database 60%, DevOps 40%, AI 50%.

Magic UI & shadcn/ui

Use Magic UI selectively (animated cards, shimmer, number counters, gradient animations, border beam, marquee,
spotlight) — the UI should stay professional and usable, not overloaded with animation.

Use shadcn/ui components: Button, Card, Badge, Dialog, Dropdown Menu, Tabs, Progress, Input, Textarea, Select,
Avatar, Alert, Skeleton, Tooltip, Table.

Landing Page

A modern landing page with an animated hero, gradient background, feature cards, CV score preview, job matching
preview, “how it works” section, technology section, and footer.
Understand Your CV.

Match Your Career.

## AI

powered CV analysis and job compatibility

in one intelligent workspace.

[ Analyze My CV ]

[ Try Job Matcher ]

17. API Routes (Minimum Required)

Authentication

POST /api/auth/register

POST /api/auth/login

GET

/api/auth/me

Resumes

POST

/api/resumes/upload

GET

/api/resumes

GET

/api/resumes/:id

DELETE /api/resumes/:id

Analysis

POST /api/analysis/:resumeId

GET

/api/analysis/:resumeId

Jobs

POST

/api/jobs

GET

/api/jobs

GET

/api/jobs/:id

DELETE /api/jobs/:id

Matching

POST /api/jobs/:jobId/match/:resumeId

GET

/api/jobs/:jobId/matches

18. Security Requirements

•

JWT authentication — protected routes must verify the JWT.

•

CORS configured to the client URL only.

cors({

origin: process.env.CLIENT_URL,
credentials: true

})

•

Password hashing with bcryptjs.

•

Never expose MONGODB_URI, JWT_SECRET, or XAI_API_KEY to the React frontend.

•

File validation — only allow .pdf, .docx, .png, .jpg, .jpeg, with a reasonable max upload size.

19. AI Service Layer

Create a dedicated services/aiService.js responsible for: analyzeResume(), extractResumeInformation(),
calculateResumeInsights(), matchResumeWithJob().

The controller must not contain the entire AI implementation.

Controller

↓

AI Service

↓

xAI API

Prompt Design — Resume Analysis

You are an expert resume analysis assistant.

Analyze the following resume.

Extract structured information about:

-

candidate profile

-

skills

-

experience

-

education

-

certifications

-

projects

-

languages

Evaluate the resume structure and completeness.

Return ONLY valid JSON.

Resume:

{{RESUME_TEXT}}

Prompt Design — Job Matching

You are an AI career matching assistant.

Compare the candidate profile against the job description.

Analyze: technical skills, soft skills,

experience, education, projects, certifications, keywords.

Return structured JSON c
ontaining:

-

overallScore

-

## matchingSkills

missingSkills

-

matchingExperience

-

missingExperience

-

matchingEducation

-

recommendations

20. Advanced Features

Improve My CV

An “Improve My CV” button generates rewrite suggestions, e.g. turning “Developer with experience in web
development” into a sharper, more specific summary. Always note that AI suggestions are recommendations to be
reviewed by the user.

Job Match History

A sortable, filterable “My Job Matches” list showing past matches and their scores.

Multiple CV Versions

Allow users to upload and manage multiple CV versions (e.g. Frontend, Full Stack, Internship).

CV Version Comparison

Metric

CV V1

CV V2

Skills

68%

84%

Experience

72%

86%

Structure

70%

91%

Keywords

61%

82%

Overall

68%

86%

Explain the Match

Instead of just showing 87%, explain why:

- Strong React experience

- Relevant Node.js experience

- Good MongoDB knowledge

- Relevant academic background

*

TypeScript not clearly demonstrated

-

No evidence of AWS experience

-

21. Error Handling & Loading States

The application must properly handle, with useful messages (never a bare 500):

•

Invalid file

•

File too large

•

Unsupported format

•

OCR failure

•

AI API failure

•

MongoDB failure

•

Invalid JWT

•

Expired JWT

•

Missing job description

•

Empty CV

The app should never look frozen during AI processing — use skeletons, progress indicators and a staged status
message:

Uploading CV...

↓

Extracting content...

↓

Understanding profile...

↓

Analyzing skills...

↓

Evaluating experience...

↓

Generating score...

↓

Preparing recommendations...

22. Database Relationships

User

│

├── Resume

│

│

│

└── Analysis

│

└── Job

│

└── Match

Each user must only be able to access their own resources.

23. Final Repository Structure
    ai

- cv
- analyzer/

│

├── client/

│

├── src/

│

├── public/

│

├── .env

│

├── .env.example

│

├── package.json

│

└── vite.config.js

│

├── server/

│

├── config/

│

├── controllers/

│

├── middleware/

│

├── models/

│

├── routes/

│

├── services/

│

├── utils/

│

├── uploads/

│

├── .env

│

├── .env.example

│

├── .gitignore

│

├── package.json

│

└── server.js

│

├── README.md

└── .gitignore

24. Git & GitHub Requirements

The project must use Git. The README.md must contain: project description, features, technologies, installation,
environment variables, MongoDB configuration, xAI API configuration, how to run the client and server, screenshots,
API documentation, and team members.

git clone YOUR_REPOSITORY

## cd ai

## cv

analyzer

cd server

npm install

npm run dev

cd client

npm install

npm run dev

25. Required .env.example Files

Server
PORT=5000

MONGODB_URI=

JWT_SECRET=

CLIENT_URL=http://localhost:5173

XAI_API_KEY=

## XAI_MODEL=grok

4.7

Client

VITE_API_URL=http://localhost:5000/api

Reminder

Never commit real credentials.

26. Expected User Journey

Landing Page → Register / Login → Dashboard → Upload CV

↓

PDF / DOCX / Image → Text Extraction / OCR → AI Analysis

↓

CV Score → Structured Profile → Skills / Experience / Education

↓

Job Matcher → Paste / Import Job Description → AI Comparison

↓

Match Score → Missing Skills → Recommendations → Save Result

27. Minimum Requirements Checklist

A project is considered complete only if it contains all of the following:

•

MERN architecture

•

React + Vite + JSX

•

Express.js

•

MongoDB Atlas

•

Mongoose

•

JWT authentication

•

CORS

•

Environment variables + .env.example

•

PDF/DOCX/image CV upload

•

Text extraction

•

OCR capability for scanned/image CVs

•

xAI/Grok integration

•

•

CV score

•

Skills extraction

•

Experience extraction

•

Education extraction

•

Job description analysis

•

CV/job matching score

•

Missing skills

•

Recommendations

•

Dashboard

•

Responsive UI

•

shadcn/ui

•

Magic UI

•

GitHub repository

•

README

28. Bonus Features

29.

Bonus 1: Multiple CV versions

21.

Bonus 2: CV comparison

22.

Bonus 3: Job matching history

23.

Bonus 4: AI-generated CV improvement suggestions

24.

Bonus 5: Dark/light theme

25.

Bonus 6: Animated dashboard

26.

Bonus 7: Export analysis as PDF

27.

Bonus 8: Shareable analysis link

28.

Bonus 9: Admin dashboard

29.

Bonus 10: Job source/API integration using an authorized API

29. Final Deliverable

Each team must submit: GitHub repository + README.md + working application + MongoDB Atlas database + AI
integration + demo.

The final presentation should demonstrate:

30.

Registration

31.

Login

32.

CV upload

33.

OCR/document extraction

34.

AI analysis

35.
36.

Skills extraction

37.

Experience extraction

38.

Education extraction

39.

Job description input

40.

Job matching

41.

Missing skills

42.

Recommendations

43.

Dashboard

44.

Database

45.

API architecture

46.

Security implementation

30. Evaluation Criteria

Category

Points

React / Frontend

15

Express / Backend

15

MongoDB / Mongoose

10

Authentication / Security

10

File Upload & Extraction

10

AI Integration

15

CV Analysis

10

Job Matching

10

UI/UX

10

Git / README / Code Quality

5

Total

110

The instructor may normalize the final grade to 100.

31. Main Objective

The objective of this project is to build more than a CRUD application.

Students must demonstrate that they can

combine:

•

Frontend Development

•
•

Database

•

Authentication

•

File Processing

•

OCR

•

Artificial Intelligence

•

Data Analysis

•

Modern UI/UX

Bottom line

## The final result should feel like a real

world AI SaaS product, not a simple classroom CRUD application.
