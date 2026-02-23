# Mentor Round Notes — SwasthyaSetu Prototype

## One‑line summary
A school health + sustainability prototype that scores student risk, surfaces district insights, and generates concise admin/parent communications, with optional GenAI support.

## Elevator pitch (30–45s)
SwasthyaSetu helps schools and districts detect health risks early and coordinate fast follow‑ups. It combines a rule‑based risk engine with optional GenAI summaries to turn raw data into actionable briefs for administrators and parents. The system is deployable as a lightweight web app, and can be framed under Sustainable Development by improving student health outcomes and school readiness at scale.

## Problem statement
Schools often lack real‑time, actionable insights on student health risks and follow‑up prioritization. Manual reporting is slow, fragmented, and doesn’t translate into timely action. This hurts equity and overall wellbeing.

## Target users
- School administrators
- District administrators
- Health coordinators
- Parents/guardians

## What the prototype does today
- Calculates student risk scores using a deterministic AI risk engine (rule‑based model).
- Provides dashboards for school/district insights.
- Generates parent messages and school summaries using GenAI when a key is configured; otherwise uses safe fallback templates.
- Supports a full stack deployment with backend, AI service, frontend, and database/Redis.

## What makes it “Sustainable Development” aligned
- Primary SDG alignment: SDG‑3 (Good Health & Well‑Being) and SDG‑4 (Quality Education).
- Indirect sustainability: improved health readiness reduces long‑term health inequities, improving resilience.
- Optional climate framing: existing risk factors can map to climate‑linked exposures (heat, air quality).

## Demo flow (3–5 minutes)
1. Show dashboard overview (school/district insights).
2. Pick a school and show risk distribution.
3. Trigger “GenAI School Brief” to show concise summary.
4. Trigger parent message generation.
5. Explain the risk engine inputs and outputs.

## Key features
- Risk scoring endpoint (`/calculate-risk`) with explainable contributions.
- GenAI endpoints (`/genai/parent-message`, `/genai/school-summary`).
- Health checks for services.
- Frontend dashboards with summaries and ranking views.

## Technical architecture
- Frontend: React (Vite)
- Backend: Node/Express + Prisma + Postgres
- AI service: FastAPI (rule‑based risk scoring)
- GenAI: OpenAI‑compatible API (optional)
- Infrastructure: Render (Docker services)

## Why it’s defensible
- Deterministic risk engine allows transparent scoring.
- GenAI adds value but is not a single point of failure (fallback templates).
- Clear separation of services enables scaling.

## Data inputs
- Student metrics (BMI, attendance ratio)
- Environmental exposure (temperature, AQI)
- Vaccination status
- School metadata

## Outputs
- Risk score + category (LOW/MEDIUM/HIGH)
- Reason codes + contribution breakdown
- Parent message
- Admin summary

## What’s “AI” here
- Rule‑based “AI” risk scoring model for explainability.
- Optional LLM for natural‑language summaries.

## What’s not built yet (honest limitations)
- Real sensor/data integrations
- Longitudinal analysis
- Role‑based access control beyond basic auth
- Clinical validation
- Offline/low‑connectivity workflows

## Roadmap (next 4–8 weeks)
- Integrate climate datasets (AQI/heat index) via public APIs
- Add early‑warning alerts and thresholds
- Add verifiable audit trail of outreach actions
- Expand multilingual support

## Sustainability impact narrative
- Early interventions reduce absenteeism and long‑term health costs.
- Better resource allocation for health camps and follow‑ups.
- Improved equity by focusing on high‑risk schools/regions.

## Metrics to show impact
- Reduction in average risk scores over time
- Increase in follow‑up completion rate
- Decrease in high‑risk counts
- Attendance improvement after interventions

## Security & privacy (talking points)
- Data stored in secured database
- No PHI exposure to LLM without explicit opt‑in
- Fallback templates minimize external data sharing

## Likely mentor questions + crisp answers

### 1) Why this problem?
Because health risks in schools are under‑tracked and responses are slow, especially in high‑load regions. This solution turns raw data into prioritized, actionable steps.

### 2) Where does GenAI help?
It converts data into short, human‑readable summaries and parent messages to speed up communication.

### 3) Can it work without GenAI?
Yes. It falls back to safe, deterministic templates when no API key is configured.

### 4) How is risk score computed?
By weighted factors (BMI, vaccination, temperature, AQI, attendance), returning a bounded score and reason codes.

### 5) How do you ensure explainability?
We return reason codes and contributions for each risk factor.

### 6) What is the innovation?
Combining explainable risk scoring with automated actionable communication in a school‑scale workflow.

### 7) What’s the primary SDG alignment?
SDG‑3 (Good Health), SDG‑4 (Quality Education), and indirectly SDG‑10 (Reduced Inequalities).

### 8) What would you do if you had more time?
Integrate real datasets, add predictive trends, improve validation, and deploy role‑based access.

### 9) How do you handle data privacy?
Keep PHI internal, send only minimal context to the LLM, and allow fully offline fallback.

### 10) How will you measure success?
Reduction in high‑risk counts, improved follow‑up rates, and reduced absenteeism.

### 11) What’s the biggest risk?
Data quality and real‑world validation; we address this with transparent scoring and manual overrides.

### 12) Why is this a prototype?
We’ve built the end‑to‑end flow, but real‑world adoption requires integration with official systems and validated datasets.

## Quick facts (for easy recall)
- 3 services + 1 database + 1 cache
- AI service is deterministic (no hidden model behavior)
- GenAI is optional with template fallback

## Suggested framing for Green Bharat / Sustainability
“This is a climate‑resilient school health platform. It helps districts detect risk early and deploy resources efficiently. It’s sustainable because it prevents downstream health costs and improves school readiness at scale.”

## If asked: Why not Web3?
We focus on proven outcomes and fast deployment. Web3 can be added later for audit trails, but it’s not necessary to deliver impact now.
