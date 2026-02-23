# SwasthyaSetu

Green Bharat school health intelligence platform with a full-stack app, AI-assisted risk scoring, and cloud-ready deployment.

## What This Project Includes
- `frontend`: React + Vite dashboard for admins, teachers, health workers, and parents
- `backend`: Express + TypeScript API with Prisma, RBAC auth, analytics, caching, and telemetry
- `ai-service`: FastAPI microservice for risk scoring fallback-aware predictions
- `render.yaml`: One-click Render Blueprint for full cloud deployment
- `backend/docker-compose.yml`: Local container orchestration (Postgres, Redis, AI, backend, frontend)

## Tech Stack
- Frontend: React 18, Vite 5, Recharts, Lucide
- Backend: Node.js 20, Express 4, TypeScript 5, Zod, JWT, Pino
- Data: PostgreSQL 16, Prisma ORM, Redis 7
- AI Service: Python 3.12, FastAPI, Uvicorn
- DevOps: Docker, Docker Compose, Render Blueprint, GitHub Actions smoke workflow

## Architecture
```text
Browser
  -> Frontend (React + Nginx, runtime env injection)
     -> Backend API (Express + TS)
        -> PostgreSQL (system of record)
        -> Redis (cache/rate limiter support)
        -> AI Service (risk scoring)
```

### Key Design Points
- Role-based access with access/refresh tokens and protected routes
- Risk scoring via AI service with backend fallback scoring if AI is unavailable
- District/school analytics endpoints with Redis-backed caching
- Startup validation checks for safer production boot
- Request correlation via `X-Request-Id` and structured logs
- Frontend-to-backend client error telemetry endpoint (`POST /client-errors`)

## Repository Structure
```text
.
├─ ai-service/
│  ├─ Dockerfile
│  ├─ main.py
│  └─ requirements.txt
├─ backend/
│  ├─ Dockerfile
│  ├─ docker-compose.yml
│  ├─ prisma/
│  ├─ scripts/
│  │  └─ smoke-test.mjs
│  ├─ src/
│  │  ├─ app.ts
│  │  ├─ server.ts
│  │  ├─ config/
│  │  ├─ controllers/
│  │  ├─ routes/
│  │  ├─ middleware/
│  │  ├─ services/
│  │  └─ utils/
│  └─ tests/
├─ frontend/
│  ├─ Dockerfile
│  ├─ docker/
│  │  ├─ nginx.conf
│  │  └─ entrypoint.sh
│  └─ src/
├─ .github/workflows/
│  └─ smoke-test.yml
├─ render.yaml
└─ HOSTING.md
```

## Core Workflows

## 1) Local Development (Service-by-Service)
### Backend
```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### AI Service
```bash
cd ai-service
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 2) Local Full Stack via Docker Compose
```bash
cd backend
docker compose up --build
```

Services:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- AI Service: `http://localhost:8000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## 3) Cloud Deployment (Render Blueprint)
Use `render.yaml` from repo root. It provisions:
- `swasthyasetu-frontend` (web)
- `swasthyasetu-backend` (web)
- `swasthyasetu-ai` (web)
- `swasthyasetu-db` (Postgres)
- `swasthyasetu-redis` (Key Value)

Runtime wiring is automatic:
- Frontend `VITE_API_BASE_URL` is resolved from backend service host
- Backend `CORS_ORIGIN` is resolved from frontend service host

## Frontend Runtime Configuration
Frontend uses runtime config injection (`/env.js`) at container start:
- `VITE_API_BASE_URL`
- `VITE_PERSIST_SESSION`

This avoids rebuilds for URL changes and keeps deployments environment-safe.

## Backend Environment Variables
See `backend/.env.example`.

Important variables:
- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `REDIS_URL`
- `AI_SERVICE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGIN` (supports comma-separated allowlist)
- `LOG_LEVEL`
- `FIELD_ENCRYPTION_KEY` (optional)

## API Overview
Base URL: `http://localhost:8080` (local)

Health:
- `GET /`
- `GET /health`

Auth:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`

Students:
- `POST /students`
- `GET /students`
- `GET /students/:id`
- `PUT /students/:id`
- `DELETE /students/:id`
- `GET /students/my-child`

Schools:
- `GET /schools`
- `GET /schools/:id/summary`
- `GET /schools/:id/health-risk`
- `GET /schools/:id/scheme-coverage`

District:
- `GET /district/:name/comparison`
- `GET /district/:name/climate-risk`
- `GET /district/:name/top-risk-schools`

Health Camps:
- `POST /health-camp`
- `GET /health-camp/:school_id`

Telemetry:
- `POST /client-errors`

## Security and Reliability
- Helmet-enabled API hardening
- CORS allowlist with hostname/origin matching
- API and auth rate limiting
- JWT auth with role-based authorization
- Secure refresh cookie settings (`SameSite=None` + `Secure` in production)
- Startup checks to block unsafe production config
- Structured logs with sensitive field redaction
- Request ID propagation in error responses and headers

## Testing
### Backend unit/integration tests
```bash
cd backend
npm test
```

### Backend type-check
```bash
cd backend
npx tsc -p tsconfig.json --noEmit
```

### Frontend production build check
```bash
cd frontend
npm run build
```

### Smoke test (login -> me -> students -> create health camp)
```bash
cd backend
SMOKE_BASE_URL=https://<your-backend-host> npm run test:smoke
```

## CI/CD
GitHub Actions workflow: `.github/workflows/smoke-test.yml`
- Runs on PRs and pushes to `main`
- Executes smoke flow when `SMOKE_BASE_URL` secret is configured

Recommended GitHub secrets:
- `SMOKE_BASE_URL`
- `SMOKE_EMAIL`
- `SMOKE_PASSWORD`

## Seeded Accounts (Demo)
Default seeded credentials:
- `superadmin@swasthyasetu.in / Admin@1234`
- `district.pune@swasthyasetu.in / Admin@1234`
- `schooladmin.pune@swasthyasetu.in / Admin@1234`
- `teacher.pune@swasthyasetu.in / Admin@1234`
- `parent.pune@swasthyasetu.in / Admin@1234`

## Troubleshooting
- Frontend cannot reach backend:
  - Verify `VITE_API_BASE_URL` on frontend service
  - Verify backend CORS allowlist and service URL
- 401/Unauthorized:
  - Confirm access token is sent as `Authorization: Bearer <token>`
  - Ensure refresh cookie policy is compatible with HTTPS deployment
- Backend startup fails:
  - Check startup validation logs for placeholder secrets or unsafe `CORS_ORIGIN`
- AI scoring unavailable:
  - Backend falls back to rule-based scoring and records telemetry

## Additional Docs
- Hosting guide: `HOSTING.md`
- Backend details: `backend/README.md`
- Frontend details: `frontend/README.md`
