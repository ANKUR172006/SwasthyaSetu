import { mapRiskToActions } from "../src/services/riskActionEngine";

describe("risk action engine", () => {
  it("maps BMI and attendance risks to targeted actions", () => {
    const actions = mapRiskToActions({
      riskLevel: "HIGH",
      reasonCodes: ["BMI_OUT_OF_HEALTHY_RANGE", "LOW_ATTENDANCE_PATTERN"]
    });

    const types = actions.map((a) => a.type);
    expect(types).toContain("nutrition");
    expect(types).toContain("parent_counseling");
  });

  it("returns preventive fallback action for baseline low risk", () => {
    const actions = mapRiskToActions({
      riskLevel: "LOW",
      reasonCodes: ["BASELINE_LOW_RISK"]
    });

    expect(actions.length).toBeGreaterThan(0);
    expect(actions[0].type).toBe("parent_counseling");
    expect(actions[0].priority).toBe("low");
  });
});
