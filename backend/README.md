# SwasthyaSetu - Green Bharat School Intelligence Platform (Backend)

Production-ready backend for national-scale school health intelligence with one-city pilot deployment support.

## Stack
- Node.js + Express.js + TypeScript
- PostgreSQL + Prisma ORM
- JWT auth + refresh tokens + RBAC
- Redis caching for school and district analytics
- Python FastAPI AI risk scoring microservice
- Docker / Docker Compose
- Jest test suite

## Folder Structure
```text
backend/
  src/
    config/
    controllers/
    routes/
    middleware/
    services/
    ai-service-client/
    jobs/
    utils/
    types/
    app.ts
    server.ts
  prisma/
    schema.prisma
    seed.ts
  docker/
  postman/
    SwasthyaSetu.postman_collection.json
    SwasthyaSetu.local.postman_environment.json
  tests/
  .env.example
  docker-compose.yml
  Dockerfile
  README.md
```

Additional UI app:
```text
frontend/
  src/
    main.jsx
    SwasthyaSetu.jsx
  Dockerfile
  vite.config.js
```

## Features
- Simulated UDISE ingestion at startup (`syncSimulatedUdiseData`)
- Simulated IMD/CPCB climate ingestion every 6 hours
- Student risk calculation via FastAPI microservice (`POST /calculate-risk`)
- Scheme eligibility mapping for Ayushman Bharat and RBSK
- Audit logging for mutating endpoints
- Input validation with Zod
- Helmet + CORS + rate limiting
- Optional field encryption utility (`FIELD_ENCRYPTION_KEY`)
- Pagination for student list API
- Prisma indexes for `school_id`, `district`, and `risk_score`

## Environment Variables
Copy `.env.example` to `.env`.

```bash
NODE_ENV=development
PORT=8080
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/swasthyasetu?schema=public
JWT_ACCESS_SECRET=replace_with_32_plus_characters_access_secret
JWT_REFRESH_SECRET=replace_with_32_plus_characters_refresh_secret
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_DAYS=7
REDIS_URL=redis://localhost:6379
AI_SERVICE_URL=http://localhost:8000
LLM_BASE_URL=https://api.openai.com/v1
LLM_MODEL=gpt-4o-mini
LLM_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
CORS_ORIGIN=http://localhost:5173
FIELD_ENCRYPTION_KEY=optional_32_character_key
```

## Local Setup (Full Stack Without Docker)
1. Install backend dependencies:
```bash
cd backend
npm install
```
2. Install frontend dependencies:
```bash
cd ../frontend
npm install
```
3. Install AI service dependencies:
```bash
cd ../ai-service
pip install -r requirements.txt
```
4. Generate Prisma client and run migration:
```bash
cd ../backend
npx prisma generate
npx prisma migrate dev --name init
```
5. Seed city-pilot data:
```bash
npm run prisma:seed
```
6. Start AI service:
```bash
cd ../ai-service
uvicorn main:app --host 0.0.0.0 --port 8000
```
7. Start backend:
```bash
cd ../backend
npm run dev
```
8. Start frontend:
```bash
cd ../frontend
cp .env.example .env
npm run dev
```
9. Open UI: `http://localhost:5173`

## Docker Setup
1. Create `backend/.env` from `.env.example`.
2. Run:
```bash
cd backend
docker compose up --build
```
3. Run migration + seed in backend container:
```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npm run prisma:seed
```
4. Open UI: `http://localhost:5173`

## API Documentation

### Auth
- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`

### Schools
- `GET /schools/:id/summary`
- `GET /schools/:id/health-risk`
- `GET /schools/:id/scheme-coverage`

### Students
- `POST /students`
- `GET /students/:id`
- `PUT /students/:id`
- `DELETE /students/:id`
- `GET /students?page=1&pageSize=20&schoolId=<uuid>`

### District Analytics
- `GET /district/:name/comparison`
- `GET /district/:name/climate-risk`
- `GET /district/:name/top-risk-schools`

### Health Camps
- `POST /health-camp`
- `GET /health-camp/:school_id`

### GenAI
- `POST /genai/parent-message`
- `POST /genai/school-summary`

### Communications
- `POST /communications/parent-alert`
- `GET /communications/parent-alert?limit=20`

## Seeded Pilot Accounts
After `npm run prisma:seed`:
- `superadmin@swasthyasetu.in / Admin@1234`
- `district.pune@swasthyasetu.in / Admin@1234`
- `schooladmin.pune@swasthyasetu.in / Admin@1234`
- `teacher.pune@swasthyasetu.in / Admin@1234`

## Postman
Import:
- Collection: `backend/postman/SwasthyaSetu.postman_collection.json`
- Environment: `backend/postman/SwasthyaSetu.local.postman_environment.json`

Flow:
1. Run `Auth -> Login` (stores `accessToken` automatically).
2. Set `schoolId` from seed output logs.
3. Run school/student/district/health-camp requests.

## Tests
```bash
cd backend
npm test
```

## Quality Commands
```bash
cd backend
npm run lint
npm run typecheck
npm run build
npm run validate
```

Covered:
- Auth routes
- Risk client integration logic
- School summary service
- Student CRUD routes

## Scalability Notes
- Multi-district support via district-level model + analytics endpoints
- Stateless JWT API suitable for horizontal scaling
- Redis cache layer for high-read dashboards
- Containerized services for cloud rollout
- Env-driven config for dev/staging/prod parity

## Compliance-Oriented Design
- Data minimization in API responses
- Audit logs for write operations
- Input validation and security headers
- Optional field encryption for sensitive fields
- Rate limiting and CORS enforcement
