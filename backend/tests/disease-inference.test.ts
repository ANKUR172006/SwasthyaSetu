import { inferLikelyConditions } from "../src/services/diseaseInference";

describe("disease signal inference model", () => {
  it("prioritizes vector-borne risk with strong breeding conditions", () => {
    const result = inferLikelyConditions({
      bmi: 18.9,
      vaccinationStatus: "PARTIAL",
      attendanceRatio: 0.92,
      temperature: 35,
      humidity: 84,
      rainfallMm: 190,
      wasteManagementScore: 48,
      symptomClusterCount: 2
    });

    expect(result.primary_condition).toBe("VECTOR_BORNE_RISK");
    expect(result.triage_score).toBeGreaterThanOrEqual(0.6);
  });

  it("prioritizes air-respiratory risk under high AQI", () => {
    const result = inferLikelyConditions({
      bmi: 20.1,
      vaccinationStatus: "COMPLETE",
      attendanceRatio: 0.79,
      temperature: 39,
      humidity: 70,
      aqi: 280,
      symptomClusterCount: 4
    });

    expect(result.primary_condition).toBe("AIR_RESPIRATORY_RISK");
    const top = result.likely_conditions[0];
    expect(["MEDIUM", "HIGH"]).toContain(top.level);
    expect(top.score).toBeGreaterThanOrEqual(0.5);
  });

  it("raises water-borne risk when water and sanitation are poor", () => {
    const result = inferLikelyConditions({
      bmi: 15.6,
      vaccinationStatus: "PARTIAL",
      attendanceRatio: 0.76,
      rainfallMm: 130,
      waterQualityScore: 45,
      sanitationScore: 52,
      hazardReports: 5
    });

    const water = result.likely_conditions.find((x) => x.condition === "WATER_BORNE_RISK");
    expect(water).toBeDefined();
    expect(water?.score ?? 0).toBeGreaterThanOrEqual(0.6);
  });
});
