# Project Structure and Quality Conventions

## Folder Layout
- `frontend/`: React app and client runtime configuration
- `backend/`: Express API, RBAC, analytics, integrations, and tests
- `ai-service/`: FastAPI risk microservice
- `docs/`: product and engineering documentation
- `.github/workflows/`: CI pipelines

## Engineering Conventions
- Keep each service self-contained with its own dependencies and scripts.
- Maintain strict TypeScript checks in backend before deployment.
- Use Zod schemas at API boundaries for input validation.
- Prefer deterministic fallbacks when external AI dependencies fail.
- Preserve auditability for mutating operations.

## Validation Commands
- Backend: `npm run validate` inside `backend/`
- Frontend: `npm run validate` inside `frontend/`
- AI compile check: `python -m py_compile main.py` inside `ai-service/`

## CI Quality Gate
`quality-gate.yml` enforces:
- Backend lint, typecheck, unit tests, and build
- Frontend lint and build
- AI service dependency install and compile check

## Documentation Expectations
- Top-level README must describe purpose, architecture, quickstart, and quality gates.
- Product validation claims should be tracked in `docs/VALIDATION.md`.
- Deployment guidance belongs in `HOSTING.md`.
