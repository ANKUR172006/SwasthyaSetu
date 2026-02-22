from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="SwasthyaSetu AI Risk Engine", version="1.0.0")


class RiskRequest(BaseModel):
    bmi: float = Field(gt=0)
    vaccination_status: str
    temperature: float
    aqi: int
    attendance_ratio: float = Field(ge=0, le=1)


class RiskResponse(BaseModel):
    score: float
    level: str
    model_version: str
    reason_codes: list[str]
    contributions: dict[str, float]


def bmi_factor(bmi: float) -> float:
    if bmi < 16.5:
        return 1.0
    if bmi < 18.5:
        return 0.7
    if bmi <= 24.9:
        return 0.2
    if bmi <= 29.9:
        return 0.6
    return 0.9


def vaccination_delay_factor(status: str) -> float:
    normalized = status.strip().upper()
    mapping = {
        "COMPLETE": 0.0,
        "PARTIAL": 0.6,
        "DELAYED": 0.8,
        "NONE": 1.0,
    }
    return mapping.get(normalized, 0.7)


def heatwave_factor(temperature: float) -> float:
    if temperature >= 45:
        return 1.0
    if temperature >= 40:
        return 0.8
    if temperature >= 35:
        return 0.5
    return 0.2


def aqi_factor(aqi: int) -> float:
    if aqi >= 300:
        return 1.0
    if aqi >= 200:
        return 0.8
    if aqi >= 120:
        return 0.5
    return 0.2


def attendance_factor(ratio: float) -> float:
    return 1.0 - ratio


def score_level(score: float) -> str:
    if score >= 0.7:
        return "HIGH"
    if score >= 0.4:
        return "MEDIUM"
    return "LOW"


def build_reason_codes(
    bmi_component: float,
    vaccination_component: float,
    heat_component: float,
    aqi_component: float,
    attendance_component: float,
) -> list[str]:
    reasons: list[str] = []
    if bmi_component >= 0.2:
        reasons.append("BMI_OUT_OF_HEALTHY_RANGE")
    if vaccination_component >= 0.14:
        reasons.append("VACCINATION_DELAY_OR_INCOMPLETE")
    if heat_component >= 0.16:
        reasons.append("HEAT_STRESS_RISK")
    if aqi_component >= 0.12:
        reasons.append("AIR_QUALITY_EXPOSURE")
    if attendance_component >= 0.05:
        reasons.append("LOW_ATTENDANCE_PATTERN")
    if not reasons:
        reasons.append("BASELINE_LOW_RISK")
    return reasons


@app.post("/calculate-risk", response_model=RiskResponse)
def calculate_risk(payload: RiskRequest) -> RiskResponse:
    bmi_component = bmi_factor(payload.bmi) * 0.3
    vaccination_component = vaccination_delay_factor(payload.vaccination_status) * 0.2
    heat_component = heatwave_factor(payload.temperature) * 0.25
    aqi_component = aqi_factor(payload.aqi) * 0.15
    attendance_component = attendance_factor(payload.attendance_ratio) * 0.1

    risk_score = (
        bmi_component
        + vaccination_component
        + heat_component
        + aqi_component
        + attendance_component
    )

    bounded_score = max(0.0, min(1.0, round(risk_score, 4)))
    contributions = {
        "bmi": round(bmi_component, 4),
        "vaccination": round(vaccination_component, 4),
        "temperature": round(heat_component, 4),
        "aqi": round(aqi_component, 4),
        "attendance": round(attendance_component, 4),
    }
    return RiskResponse(
        score=bounded_score,
        level=score_level(bounded_score),
        model_version="risk-engine-rule-v2",
        reason_codes=build_reason_codes(
            bmi_component=bmi_component,
            vaccination_component=vaccination_component,
            heat_component=heat_component,
            aqi_component=aqi_component,
            attendance_component=attendance_component,
        ),
        contributions=contributions,
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
