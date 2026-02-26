jest.mock("../src/config/prisma", () => ({
  prisma: {
    school: { findMany: jest.fn() },
    districtFieldReport: { findMany: jest.fn() },
    climateData: { findMany: jest.fn() }
  }
}));

import { prisma } from "../src/config/prisma";
import { getDistrictGeoHotspots } from "../src/services/geoHotspotService";

describe("district admin geo hotspots", () => {
  it("clusters schools and tags hotspot type", async () => {
    (prisma.school.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: "s1",
        name: "School 1",
        students: [{ riskScore: 0.82 }],
        geoProfile: { latitude: 29.39, longitude: 76.96, blockName: "Block A" }
      },
      {
        id: "s2",
        name: "School 2",
        students: [{ riskScore: 0.65 }],
        geoProfile: { latitude: 29.392, longitude: 76.961, blockName: "Block A" }
      }
    ]);
    (prisma.districtFieldReport.findMany as jest.Mock).mockResolvedValueOnce([
      { blockName: "Block A", severity: 8, reportType: "WATER" }
    ]);
    (prisma.climateData.findMany as jest.Mock).mockResolvedValueOnce([{ heatAlertFlag: true }]);

    const result = await getDistrictGeoHotspots("Panipat, Haryana", 30);

    expect(result.hotspots.length).toBeGreaterThan(0);
    expect(result.hotspots[0].hotspotType).toBeDefined();
    expect(result.hotspots[0].explainability.modelVersion).toContain("geo-hotspot-kmeans");
  });
});
