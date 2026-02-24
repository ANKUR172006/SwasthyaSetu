# Contributing to SwasthyaSetu

## Setup
- Backend: `cd backend && npm install`
- Frontend: `cd frontend && npm install`
- AI service: `cd ai-service && pip install -r requirements.txt`

## Branching
- Use feature branches from `main`.
- Keep PRs focused and small.

## Required Checks
Before opening a PR:
- Backend: `npm run validate`
- Frontend: `npm run validate`
- AI service: `python -m py_compile main.py`

## Commit Style
Use short imperative commit messages.
Examples:
- `Add multilingual parent alert fallback`
- `Harden frontend API retry flow`

## PR Requirements
- Describe user impact.
- Include test evidence.
- Include screenshots for UI changes.
- Mention any env var changes.
