from fastapi import FastAPI
from pydantic import BaseModel, Field

app = FastAPI(title="SwasthyaSetu AI Risk Engine", version="1.0.0")


@app.get("/")
def root() -> dict[str, str]:
    return {"name": "SwasthyaSetu AI Risk Engine", "status": "ok"}


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
    recommended_actions: list[dict[str, str | list[str]]]
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


def map_risk_to_actions(level: str, reason_codes: list[str]) -> list[dict[str, str | list[str]]]:
    actions: dict[str, dict[str, str | list[str]]] = {}

    def upsert(action: dict[str, str | list[str]]) -> None:
        key = str(action["type"])
        existing = actions.get(key)
        if existing is None:
            actions[key] = action
            return
        priority_score = {"low": 1, "medium": 2, "high": 3}
        incoming = priority_score[str(action["priority"])]
        current = priority_score[str(existing["priority"])]
        if incoming > current:
            actions[key] = action

    if "BMI_OUT_OF_HEALTHY_RANGE" in reason_codes:
        upsert(
            {
                "type": "nutrition",
                "priority": "high",
                "title": "Nutrition counseling and meal plan",
                "recommendation": "Start nutrition counseling and track weekly diet + BMI progress.",
                "tasks": [
                    "Arrange counseling session in 7 days",
                    "Share diet checklist with parent",
                    "Review BMI in 14 days",
                ],
                "parentScript": "Namaste. Please meet school health desk for nutrition follow-up this week.",
            }
        )
    if "VACCINATION_DELAY_OR_INCOMPLETE" in reason_codes:
        upsert(
            {
                "type": "health_camp",
                "priority": "high",
                "title": "Vaccination catch-up referral",
                "recommendation": "Refer student to immunization camp/PHC for pending vaccines.",
                "tasks": [
                    "Verify pending vaccine list",
                    "Issue referral note",
                    "Confirm status update after visit",
                ],
                "parentScript": "Namaste. Your child has pending vaccination. Please visit the assigned camp/PHC.",
            }
        )
    if "LOW_ATTENDANCE_PATTERN" in reason_codes:
        upsert(
            {
                "type": "parent_counseling",
                "priority": "high",
                "title": "Attendance counseling",
                "recommendation": "Counsel guardian and set a 2-week attendance recovery plan.",
                "tasks": [
                    "Call guardian in 48 hours",
                    "Capture attendance barriers",
                    "Track attendance daily for 2 weeks",
                ],
                "parentScript": "Namaste. Low attendance is affecting follow-up. Please coordinate with class teacher.",
            }
        )
    if "AIR_QUALITY_EXPOSURE" in reason_codes:
        upsert(
            {
                "type": "health_camp",
                "priority": "medium",
                "title": "Respiratory screening referral",
                "recommendation": "Include student in respiratory screening during next health camp.",
                "tasks": [
                    "Mark student for respiratory check",
                    "Advise reduced outdoor exposure during high AQI",
                    "Review symptoms weekly",
                ],
                "parentScript": "Namaste. Air quality is poor. Please monitor breathing symptoms and avoid peak pollution exposure.",
            }
        )
    if "HEAT_STRESS_RISK" in reason_codes:
        upsert(
            {
                "type": "parent_counseling",
                "priority": "medium",
                "title": "Heat safety counseling",
                "recommendation": "Give hydration and heat-safety guidance to family.",
                "tasks": [
                    "Share hydration checklist",
                    "Avoid afternoon outdoor activity",
                    "Track heat-related symptoms",
                ],
                "parentScript": "Namaste. High heat risk detected. Ensure hydration and reduce daytime heat exposure.",
            }
        )

    if not actions:
        actions["parent_counseling"] = {
            "type": "parent_counseling",
            "priority": "low",
            "title": "Routine preventive follow-up",
            "recommendation": "Continue preventive checks and routine health monitoring.",
            "tasks": [
                "Share preventive care advisory",
                "Maintain attendance and nutrition log",
                "Review risk profile next month",
            ],
            "parentScript": "Namaste. Routine preventive follow-up is advised.",
        }

    if level == "HIGH" and "parent_counseling" not in actions:
        actions["parent_counseling"] = {
            "type": "parent_counseling",
            "priority": "high",
            "title": "Urgent parent counseling",
            "recommendation": "Arrange urgent counseling and finalize immediate follow-up actions.",
            "tasks": [
                "Call guardian same day",
                "Schedule counseling within 24 hours",
                "Document referral timeline",
            ],
            "parentScript": "Namaste. This is an urgent school health update. Please contact school health desk today.",
        }

    return list(actions.values())


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
    reason_codes = build_reason_codes(
        bmi_component=bmi_component,
        vaccination_component=vaccination_component,
        heat_component=heat_component,
        aqi_component=aqi_component,
        attendance_component=attendance_component,
    )
    level = score_level(bounded_score)
    return RiskResponse(
        score=bounded_score,
        level=level,
        model_version="risk-engine-rule-v2",
        reason_codes=reason_codes,
        recommended_actions=map_risk_to_actions(level, reason_codes),
        contributions=contributions,
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
