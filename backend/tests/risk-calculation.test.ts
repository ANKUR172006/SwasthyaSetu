import axios from "axios";
import { calculateRisk } from "../src/ai-service-client/riskClient";

jest.mock("axios");

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Risk client", () => {
  it("returns score from AI service", async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        score: 0.62,
        level: "MEDIUM",
        model_version: "risk-engine-rule-v2",
        reason_codes: ["AIR_QUALITY_EXPOSURE"],
        contributions: {
          bmi: 0.06,
          vaccination: 0.12,
          temperature: 0.2,
          aqi: 0.15,
          attendance: 0.09
        }
      }
    });

    const result = await calculateRisk({
      bmi: 19.2,
      vaccination_status: "PARTIAL",
      temperature: 41,
      aqi: 180,
      attendance_ratio: 0.88
    });

    expect(result.score).toBe(0.62);
    expect(result.level).toBe("MEDIUM");
    expect(result.source).toBe("ai-service");
    expect(result.model_version).toBe("risk-engine-rule-v2");
    expect(result.condition_signals.primary_condition).toBeDefined();
    expect(result.condition_signals.likely_conditions.length).toBeGreaterThan(0);
  });

  it("uses fallback scoring when AI service is unavailable", async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error("timeout"));

    const result = await calculateRisk({
      bmi: 15.8,
      vaccination_status: "PARTIAL",
      temperature: 42,
      aqi: 190,
      attendance_ratio: 0.74
    });

    expect(result.source).toBe("fallback");
    expect(result.model_version).toBe("risk-engine-fallback-v1");
    expect(result.reason_codes.length).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.condition_signals.primary_condition).toBeDefined();
    expect(result.condition_signals.triage_score).toBeGreaterThanOrEqual(0);
    expect(result.condition_signals.triage_score).toBeLessThanOrEqual(1);
  });
});
