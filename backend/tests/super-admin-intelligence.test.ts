jest.mock("../src/config/prisma", () => ({
  prisma: {
    school: { findMany: jest.fn() },
    climateData: { findMany: jest.fn() },
    districtEnvironmentalAlert: { findMany: jest.fn() },
    districtAttendanceSignalDaily: { findMany: jest.fn() },
    districtFieldReport: { findMany: jest.fn() }
  }
}));

jest.mock("../src/services/resourceAllocationService", () => ({
  getDistrictResourceAllocation: jest.fn(async () => ({
    district: "ALL_INDIA",
    generatedAt: new Date().toISOString(),
    recommendations: [{ blockName: "Block A", actionType: "inspection_team_deployment", priorityScore: 84 }],
    governanceNotice: "notice"
  }))
}));

jest.mock("../src/services/districtRiskAggregationService", () => ({
  simulateDistrictRiskScenario: jest.fn(async () => ({
    district: "ALL_INDIA",
    scenarioInputs: { waterQualityImprovementPct: 15, wasteManagementImprovementPct: 8 },
    projectedReductionPct: 12,
    projectedVulnerabilityIndex: 58
  }))
}));

import { prisma } from "../src/config/prisma";
import {
  getClimateImpactTrends,
  getFraudAnomalies,
  getNationalRiskOverview,
  getResourceOptimization,
  runPolicySimulation
} from "../src/services/superAdminService";

describe("super admin intelligence service", () => {
  it("returns national overview metrics", async () => {
    (prisma.school.findMany as jest.Mock).mockResolvedValueOnce([
      { district: "District A", students: [{ riskScore: 0.8 }, { riskScore: 0.6 }] },
      { district: "District B", students: [{ riskScore: 0.3 }] }
    ]);
    (prisma.climateData.findMany as jest.Mock).mockResolvedValueOnce([
      { aqi: 160, temperature: 39, heatAlertFlag: true },
      { aqi: 130, temperature: 35, heatAlertFlag: false }
    ]);
    (prisma.districtEnvironmentalAlert.findMany as jest.Mock).mockResolvedValueOnce([{ severity: 8 }, { severity: 7 }]);

    const result = await getNationalRiskOverview("all-india");
    expect(result.riskDistribution.highPct).toBeGreaterThanOrEqual(0);
    expect(result.topVulnerableDistricts.length).toBeGreaterThan(0);
    expect(result.climateHealthResilienceIndex).toBeGreaterThan(0);
  });

  it("returns trend correlations and anomaly summary", async () => {
    (prisma.climateData.findMany as jest.Mock).mockResolvedValueOnce([
      { aqi: 120, temperature: 34, heatAlertFlag: false },
      { aqi: 155, temperature: 39, heatAlertFlag: true }
    ]);
    (prisma.districtAttendanceSignalDaily.findMany as jest.Mock).mockResolvedValueOnce([
      { attendanceDropPct: 4.2, symptomClusterIndex: 0.4, envRiskDelta: 0.3 },
      { attendanceDropPct: 6.0, symptomClusterIndex: 0.6, envRiskDelta: 0.5 }
    ]);
    (prisma.districtFieldReport.findMany as jest.Mock).mockResolvedValueOnce([
      { blockName: "Block A", reportType: "WATER" },
      { blockName: "Block A", reportType: "WATER" },
      { blockName: "Block A", reportType: "WATER" },
      { blockName: "Block A", reportType: "WATER" }
    ]);

    const trends = await getClimateImpactTrends("all-india");
    const fraud = await getFraudAnomalies("all-india");
    const optimization = await getResourceOptimization("all-india", 10);
    const simulation = await runPolicySimulation("all-india", {
      waterQualityImprovementPct: 15,
      treeCoverIncreasePct: 12
    });

    expect(trends.correlations).toBeDefined();
    expect(Array.isArray(fraud.anomalies)).toBe(true);
    expect(optimization.optimizedRecommendations.length).toBeGreaterThan(0);
    expect(simulation.projectedHeatRiskReductionPct).toBeGreaterThanOrEqual(0);
  });
});
