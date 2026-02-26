jest.mock("../src/config/prisma", () => ({
  prisma: {
    climateData: { findMany: jest.fn() }
  }
}));

import { prisma } from "../src/config/prisma";
import { getDistrictSeasonalForecast } from "../src/services/seasonalForecastService";

describe("district admin seasonal forecast", () => {
  it("returns requested horizon with bounded confidence", async () => {
    (prisma.climateData.findMany as jest.Mock).mockResolvedValueOnce([
      { date: new Date("2026-01-01"), temperature: 35, heatAlertFlag: false, aqi: 120 },
      { date: new Date("2026-01-10"), temperature: 40, heatAlertFlag: true, aqi: 160 },
      { date: new Date("2026-02-01"), temperature: 36, heatAlertFlag: false, aqi: 140 }
    ]);

    const result = await getDistrictSeasonalForecast("Panipat, Haryana", 6);

    expect(result.forecast).toHaveLength(6);
    expect(result.forecast[0].confidence).toBeLessThanOrEqual(90);
    expect(result.explainability.modelVersion).toContain("seasonal-forecast");
  });
});
