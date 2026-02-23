# SwasthyaSetu Hosting Guide (Render)

## 1. Create Blueprint Deploy
1. Go to Render dashboard.
2. Click `New` -> `Blueprint`.
3. Connect this GitHub repo: `ANKUR172006/SwasthyaSetu`.
4. Render will detect `render.yaml` and create:
   - `swasthyasetu-ai`
   - `swasthyasetu-backend`
   - `swasthyasetu-frontend`
   - `swasthyasetu-db` (Postgres)
   - `swasthyasetu-redis`

## 2. First Deploy Notes
- Let first deploy finish for all services.
- Open backend service URL and verify:
  - `GET /health` returns status JSON.

## 3. Set Frontend API URL
`render.yaml` now wires this automatically via `fromService` (`swasthyasetu-backend` host).
No manual hardcoded URL is required.

## 4. CORS (if needed)
`render.yaml` now wires backend `CORS_ORIGIN` automatically from frontend host.
Backend also supports comma-separated allowlists and hostname entries.

Example:
- `CORS_ORIGIN=https://app.example.com,frontend.example.com`

## 5. Optional Real School Data
If you want real UDISE CSV import:
1. Add CSV into backend service disk/source and set:
   - `UDISE_CSV_PATH=/opt/render/project/src/backend/data/your_udise.csv`
2. Redeploy backend.

## 6. Quick Verification
- Frontend opens and login works.
- Parent dashboard loads child profile.
- Alerts page opens.
- Backend `/health` shows `aiReliability` metrics.

## 7. Smoke Test Automation
- Local/manual: run `backend` smoke flow with:
  - `SMOKE_BASE_URL=https://<backend-host> npm run test:smoke`
- CI: set repo secrets `SMOKE_BASE_URL`, `SMOKE_EMAIL`, `SMOKE_PASSWORD`.
- Workflow file: `.github/workflows/smoke-test.yml` runs on PR and `main` pushes.
