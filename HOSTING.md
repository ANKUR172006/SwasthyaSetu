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
After backend gets its real public URL:
1. Open `swasthyasetu-frontend` service in Render.
2. Set env var:
   - `VITE_API_BASE_URL=https://<your-backend-service>.onrender.com`
3. Trigger redeploy of frontend.

## 4. CORS (if needed)
If browser API calls fail:
1. Open `swasthyasetu-backend` env vars.
2. Set:
   - `CORS_ORIGIN=https://<your-frontend-service>.onrender.com`
3. Redeploy backend.

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
