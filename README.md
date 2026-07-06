# Smart Placement Tracker

A placement-prep platform for engineering students: track applications,
aptitude scores, coding practice, and a computed **Placement Readiness
Score** — all in one dashboard styled like a mission-control instrument
panel (GO / CAUTION / HOLD, not just another progress bar).

Built as an expansion of the [SmartPlacement](https://github.com/jyothi-ui/smartplacement) project.

## Tech stack

**Frontend:** HTML5, CSS3, vanilla JavaScript, [Chart.js](https://www.chartjs.org/) — no build step, no framework, deploys straight to S3.

**Backend:** AWS Lambda (Python 3.12), Amazon API Gateway (HTTP API), Amazon DynamoDB, Amazon S3 (resume storage + static hosting), CloudWatch Logs.

## Folder structure

```
smartplacement/
├── frontend/
│   ├── index.html          # Login / Register
│   ├── dashboard.html      # Readiness gauge + quick stats
│   ├── profile.html        # Student profile + resume upload
│   ├── companies.html      # Company / application tracker
│   ├── aptitude.html       # Aptitude score tracker + trend chart
│   ├── coding.html         # Coding tracker + streak + heatmap
│   ├── analytics.html      # Cross-cutting charts
│   ├── css/styles.css      # Design system (single stylesheet)
│   └── js/                 # One file per page + shared api.js / ui.js
├── backend/
│   ├── lambda/
│   │   ├── utils.py         # Shared helpers (auth, DynamoDB, responses)
│   │   ├── readiness.py     # Readiness score calculation
│   │   ├── auth.py          # Register / login
│   │   ├── profile.py       # Get / update profile
│   │   ├── companies.py     # Application tracker CRUD
│   │   ├── aptitude.py      # Aptitude tracker
│   │   ├── coding.py        # Coding tracker
│   │   ├── resume.py        # S3 presigned upload URL
│   │   ├── dashboard.py     # Aggregated dashboard summary
│   │   └── analytics.py     # Aggregated chart data
│   └── requirements.txt
└── docs/
    ├── DYNAMODB_SCHEMA.md
    └── AWS_DEPLOYMENT_GUIDE.md
```

## Running the frontend locally (before AWS is set up)

The frontend works standalone with **demo data** whenever the API call
fails — this lets you review and tweak the UI before touching AWS.

```bash
cd frontend
python3 -m http.server 8080
# open http://localhost:8080
```

You'll see a toast saying "Showing demo data" on pages that need the API —
that's expected until you deploy the backend and set `API_BASE_URL`.

## Deploying to AWS

Follow **`docs/AWS_DEPLOYMENT_GUIDE.md`** step by step — it covers
DynamoDB tables, IAM role, Lambda functions, API Gateway routes, S3
hosting for both resumes and the static site, and CORS setup.

## What's implemented vs. stretch goals

**Implemented:**
- Register / login with hashed passwords + signed auth tokens
- Student profile (skills, links, certifications, projects, resume upload via S3 presigned URL)
- Company / application tracker with search, status filter, and pipeline summary
- Aptitude tracker with trend chart, weekly/monthly/average/best stats
- Coding tracker with streak, 90-day heatmap, difficulty distribution
- Auto-calculated Placement Readiness Score with a weighted breakdown
- Analytics page: applications per month, selection rate, coding growth, aptitude improvement
- Dark/light mode, fully responsive (desktop + mobile bottom nav)

**Documented as future enhancements (schema included, not wired up yet)** — see the bottom of `docs/DYNAMODB_SCHEMA.md`:
- AI Career Assistant chatbot (Bedrock/OpenAI) — add a `chat.py` Lambda that proxies to your chosen model
- Resume ATS scoring via AI — extend `resume.py` to call an LLM after upload
- Email/SNS deadline notifications — add an EventBridge scheduled Lambda that scans `SPT_Applications` for upcoming deadlines
- Admin dashboard (view/search/delete all students, export reports) — needs a `role` field on `SPT_Users` and an admin-only Lambda using `Scan` with pagination
- Readiness trend history — add `SPT_ReadinessHistory` and a weekly snapshot Lambda (schema already sketched in the docs)
- Daily planner, leaderboard, badges, PDF export of profile

These were left as documented next steps rather than half-built stubs, so
the core platform stays clean and interview-ready. Happy to build any of
them out next — just say which one.

## Security notes before you go to production
- Replace `AUTH_SECRET` with a real random value (never the placeholder in `utils.py`).
- Consider swapping the custom token scheme for **Amazon Cognito** if this grows beyond a personal project — it gets you refresh tokens, MFA, and password reset for free.
- Tighten the S3 bucket CORS `AllowedOrigins` from `*` to your actual site URL once deployed.
