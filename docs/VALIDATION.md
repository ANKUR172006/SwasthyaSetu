# Validation Framework

## Problem Validation
- Schools track attendance and health events, but interventions are often delayed due to fragmented systems.
- Parent communication is inconsistent across languages and literacy levels.
- District teams need prioritization, not only dashboards.

## Target Users
- School administrators
- District administrators
- Teachers and health coordinators
- Parents/guardians

## Market Fit Hypothesis
- Primary market: public and affordable private schools with limited health analytics infrastructure.
- Entry wedge: district pilots where administrators can compare school risk patterns and intervention completion.
- Expansion: add multilingual communication and intervention outcomes to improve retention and contract renewals.

## Competitive Landscape
- School ERP tools: strong on records, weak on proactive health prioritization.
- Standalone health apps: strong clinical focus, weak school workflow integration.
- BI dashboards: strong visualization, weak action workflows.

SwasthyaSetu differentiation:
- Explainable risk scoring + contribution breakdown
- District prioritization views
- Multilingual parent outreach with GenAI + safe fallback templates
- Built-in operational loop from detection to communication

## Innovation Claims (Defensible)
- Deterministic risk engine reduces black-box concerns.
- GenAI is optional and additive, not a hard dependency.
- Automated warm-up path (`/warmup`) improves reliability in low-cost cloud environments with sleeping services.

## Success Criteria (Measurable)
- Reduce median intervention initiation time after risk detection.
- Improve parent outreach completion rates.
- Reduce high-risk student ratio over repeated cycles.
- Improve attendance in cohorts receiving timely follow-up.

## Experiment Plan (Next 8 Weeks)
1. Baseline: capture current intervention and communication metrics.
2. Deploy pilot in one district and one school cluster.
3. Track weekly deltas in risk distribution and outreach completion.
4. Run language-readability A/B tests for parent response rate.
5. Publish a pilot impact report with action recommendations.

## Risks and Mitigations
- Data quality drift: add schema checks and reason-code monitoring.
- LLM variability: keep deterministic template fallback and low-temperature prompts.
- Operational complexity: enforce CI quality gates and environment checks.
