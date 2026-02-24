# SwasthyaSetu

SwasthyaSetu is a full-stack school health intelligence platform that combines explainable risk scoring, district-level prioritization, and multilingual parent communication.

![Quality Gate](https://img.shields.io/badge/CI-Quality%20Gate-blue)
![Smoke Test](https://img.shields.io/badge/CI-Smoke%20Test-blue)
![License](https://img.shields.io/badge/License-MIT-green)

## Why This Exists
Schools often have fragmented health and attendance data but no rapid action loop. SwasthyaSetu converts those signals into:
- Early risk identification
- Faster school intervention workflows
- Clear district-level prioritization decisions
- Consistent parent communication in multiple languages

## Core Capabilities
- Explainable student risk scoring with deterministic fallback
- District and school analytics with cached APIs
- Role-based access control (JWT + refresh + RBAC)
- GenAI-assisted school summaries and parent alerts with template fallback
- Communication logging for outreach traceability
- Warm-up orchestration endpoint (`/warmup`) to reduce cold-start friction on Render

## Technology Stack
- Frontend: React 18, Vite 5, Recharts, Lucide React
- Backend: Node.js 20, Express 4, TypeScript 5, Prisma, Zod, JWT, Pino
- AI Service: FastAPI (Python 3.12)
- Data: PostgreSQL 16 + Redis 7
- DevOps: Docker, Docker Compose, Render Blueprint, GitHub Actions

## Repository Structure
```text
.
├─ ai-service/
│  ├─ Dockerfile
│  ├─ main.py
│  └─ requirements.txt
├─ backend/
│  ├─ src/
│  ├─ tests/
│  ├─ prisma/
│  ├─ Dockerfile
│  └─ docker-compose.yml
├─ frontend/
│  ├─ src/
│  ├─ Dockerfile
│  └─ docker/
├─ docs/
│  ├─ archive/
│  ├─ PROJECT_STRUCTURE.md
│  ├─ VALIDATION.md
│  └─ PILOT_AND_GTM.md
├─ .github/workflows/
│  ├─ quality-gate.yml
│  └─ smoke-test.yml
├─ render.yaml
└─ HOSTING.md
```

## Quick Start
### Local services
```bash
# backend
cd backend
npm install
cp .env.example .env
npx prisma generate
npm run dev
```

```bash
# frontend
cd frontend
npm install
cp .env.example .env
npm run dev
```

```bash
# ai-service
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Full stack via Docker
```bash
cd backend
docker compose up --build
```

## APIs (High Level)
- Health: `GET /`, `GET /health`, `GET /warmup`
- Auth: `/auth/*`
- Students: `/students/*`
- Schools: `/schools/*`
- District: `/district/*`
- Health camps: `/health-camp/*`
- GenAI: `/genai/parent-message`, `/genai/school-summary`
- Communications: `/communications/parent-alert`

## Engineering Quality Gates
Local validation:
```bash
# backend
cd backend
npm run validate

# frontend
cd frontend
npm run validate
```

CI validation:
- `quality-gate.yml`: backend lint/typecheck/test/build + frontend lint/build + AI compile check
- `smoke-test.yml`: deployed API smoke flow (when secrets are configured)

## Validation and Impact Framework
For hackathon review and automated validation signals:
- Market fit, user segmentation, and adoption plan: `docs/VALIDATION.md`
- Competitive landscape and differentiation: `docs/VALIDATION.md`
- Success metrics and milestones: `docs/VALIDATION.md`
- Repository organization and conventions: `docs/PROJECT_STRUCTURE.md`
- Pilot and go-to-market model: `docs/PILOT_AND_GTM.md`

## Demo Accounts
Seeded credentials are documented in `backend/prisma/seed.ts` and backend README.

## Additional Documentation
- Deployment and hosting: `HOSTING.md`
- Backend deep-dive: `backend/README.md`
- Frontend notes: `frontend/README.md`
- Validation strategy: `docs/VALIDATION.md`
- Contribution guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
