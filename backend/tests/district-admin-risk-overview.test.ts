jest.mock("../src/config/prisma", () => ({
  prisma: {
    school: { findMany: jest.fn() },
    districtFieldReport: { findMany: jest.fn() },
    districtEnvironmentalAlert: { findMany: jest.fn() },
    climateData: { findMany: jest.fn() },
    districtAttendanceSignalDaily: { findMany: jest.fn() },
    districtResourceRecommendation: { findMany: jest.fn() }
  }
}));

import { prisma } from "../src/config/prisma";
import { getDistrictRiskOverview } from "../src/services/districtRiskAggregationService";

describe("district admin risk overview", () => {
  it("returns risk buckets, top zones and explainability", async () => {
    (prisma.school.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: "s1",
        district: "Panipat, Haryana",
        students: [{ riskScore: 0.8 }, { riskScore: 0.72 }],
        geoProfile: { blockName: "Block A" }
      },
      {
        id: "s2",
        district: "Panipat, Haryana",
        students: [{ riskScore: 0.2 }, { riskScore: 0.42 }],
        geoProfile: { blockName: "Block B" }
      }
    ]);
    (prisma.districtFieldReport.findMany as jest.Mock).mockResolvedValueOnce([
      { blockName: "Block A", severity: 8 },
      { blockName: "Block B", severity: 3 }
    ]);
    (prisma.districtEnvironmentalAlert.findMany as jest.Mock).mockResolvedValueOnce([
      {
        alertType: "HEAT",
        severity: 8,
        startsAt: new Date(),
        endsAt: new Date(Date.now() + 3600000),
        status: "ACTIVE"
      }
    ]);
    (prisma.climateData.findMany as jest.Mock).mockResolvedValueOnce([
      { heatAlertFlag: true, aqi: 178 },
      { heatAlertFlag: false, aqi: 140 }
    ]);
    (prisma.districtAttendanceSignalDaily.findMany as jest.Mock).mockResolvedValueOnce([
      { attendanceDropPct: 4.5, symptomClusterIndex: 0.4, envRiskDelta: 0.3 }
    ]);
    (prisma.districtResourceRecommendation.findMany as jest.Mock).mockResolvedValueOnce([
      { recommendedDate: new Date(Date.now() - 86400000) }
    ]);

    const result = await getDistrictRiskOverview("Panipat, Haryana");

    expect(result.riskDistribution.highPct).toBeGreaterThan(0);
    expect(result.topVulnerabilityZones.length).toBeGreaterThan(0);
    expect(result.explainability.modelVersion).toContain("climate-aware-multi-layer-risk-intelligence");
    expect(result.governanceNotice.toLowerCase()).toContain("preventive intelligence");
  });
});
