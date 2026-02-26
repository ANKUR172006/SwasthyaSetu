jest.mock("../src/config/prisma", () => ({
  prisma: {
    districtAttendanceSignalDaily: { findMany: jest.fn() }
  }
}));

import { prisma } from "../src/config/prisma";
import { getDistrictOutbreakSignals } from "../src/services/outbreakSignalService";

describe("district admin outbreak signals", () => {
  it("flags triad blocks without diagnosis language", async () => {
    (prisma.districtAttendanceSignalDaily.findMany as jest.Mock).mockResolvedValueOnce([
      {
        blockName: "Block A",
        date: new Date(),
        schoolsReporting: 3,
        attendanceDropPct: 5.2,
        symptomClusterIndex: 0.5,
        envRiskDelta: 0.35
      }
    ]);

    const result = await getDistrictOutbreakSignals("Panipat, Haryana", 14);

    expect(result.flaggedBlocks.length).toBe(1);
    expect(result.flaggedBlocks[0].riskFlag).toBe(true);
    expect(result.governanceNotice.toLowerCase()).not.toContain("diagnosis");
  });
});
