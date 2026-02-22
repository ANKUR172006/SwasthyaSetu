jest.mock("../src/config/prisma", () => ({
  prisma: {
    school: { findUnique: jest.fn() },
    student: { count: jest.fn(), aggregate: jest.fn() },
    healthCamp: { count: jest.fn() },
    climateData: { findFirst: jest.fn() }
  }
}));

jest.mock("../src/config/redis", () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn()
  }
}));

import { getSchoolSummary } from "../src/services/schoolService";
import { prisma } from "../src/config/prisma";
import { redis } from "../src/config/redis";

describe("School summary service", () => {
  it("builds summary and caches response", async () => {
    (redis.get as jest.Mock).mockResolvedValueOnce(null);
    (prisma.school.findUnique as jest.Mock).mockResolvedValueOnce({ id: "s1", district: "Pune", name: "School" });
    (prisma.student.count as jest.Mock).mockResolvedValueOnce(120);
    (prisma.student.aggregate as jest.Mock).mockResolvedValueOnce({ _avg: { riskScore: 0.45 } });
    (prisma.healthCamp.count as jest.Mock).mockResolvedValueOnce(3);
    (prisma.climateData.findFirst as jest.Mock).mockResolvedValueOnce({ temperature: 40, aqi: 160 });

    const summary: any = await getSchoolSummary("s1");

    expect(summary.metrics.studentCount).toBe(120);
    expect(summary.metrics.averageRiskScore).toBe(0.45);
    expect(redis.set).toHaveBeenCalled();
  });
});

