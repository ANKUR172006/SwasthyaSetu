# Security Policy

## Supported Versions
This repository tracks security fixes on `main`.

## Reporting a Vulnerability
Please report vulnerabilities privately by contacting the maintainers before public disclosure.
Include:
- Affected component (`frontend`, `backend`, `ai-service`)
- Reproduction steps
- Potential impact
- Suggested mitigation (if known)

## Security Controls in This Project
- RBAC and JWT authentication
- Input validation with Zod
- Rate limiting and CORS restrictions
- Security headers via Helmet
- Audit logs for sensitive operations
- Optional deterministic fallback when external AI is unavailable
