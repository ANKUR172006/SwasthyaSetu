jest.mock("../src/config/prisma", () => ({
  prisma: {
    school: { findMany: jest.fn() },
    districtResourceRecommendation: { findMany: jest.fn() }
  }
}));

import { prisma } from "../src/config/prisma";
import { getDistrictResourceAllocation } from "../src/services/resourceAllocationService";

describe("district admin resource allocation", () => {
  it("ranks recommendations by computed priority", async () => {
    (prisma.school.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: "s1",
        geoProfile: { blockName: "Block A" },
        students: [{ riskScore: 0.8 }, { riskScore: 0.6 }]
      }
    ]);
    (prisma.districtResourceRecommendation.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: "r1",
        blockName: "Block A",
        actionType: "INSPECTION",
        priorityScore: 80,
        recommendedDate: new Date(Date.now() - 2 * 86400000),
        status: "RECOMMENDED",
        explanation: "Priority"
      }
    ]);

    const result = await getDistrictResourceAllocation("Panipat, Haryana", 10);

    expect(result.recommendations.length).toBe(1);
    expect(result.recommendations[0].priorityScore).toBeGreaterThan(0);
    expect(result.recommendations[0].explainability.contributors.severity).toBeGreaterThan(0);
  });
});
