import fs from "fs";

jest.mock("../src/config/prisma", () => ({
  prisma: {
    school: { findMany: jest.fn() },
    districtFieldReport: { findMany: jest.fn() },
    districtEnvironmentalAlert: { findMany: jest.fn() },
    climateData: { findMany: jest.fn() },
    districtAttendanceSignalDaily: { findMany: jest.fn() },
    districtResourceRecommendation: { findMany: jest.fn() },
    districtReportSnapshot: { create: jest.fn(), findUnique: jest.fn() }
  }
}));

import { prisma } from "../src/config/prisma";
import {
  generateDistrictComplianceReport,
  getDistrictComplianceReportDownload
} from "../src/services/complianceReportService";

describe("district admin compliance report", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("creates snapshot and supports csv/pdf download lookup", async () => {
    (prisma.school.findMany as jest.Mock).mockResolvedValue([
      {
        id: "s1",
        district: "Panipat, Haryana",
        name: "School 1",
        students: [{ riskScore: 0.6 }],
        geoProfile: { blockName: "Block A", wardName: "Ward-1", latitude: 29.39, longitude: 76.96 }
      }
    ]);
    (prisma.districtFieldReport.findMany as jest.Mock).mockResolvedValue([
      { blockName: "Block A", severity: 6, reportType: "WATER" }
    ]);
    (prisma.districtEnvironmentalAlert.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.climateData.findMany as jest.Mock).mockResolvedValue([{ date: new Date(), heatAlertFlag: true, aqi: 160, temperature: 39 }]);
    (prisma.districtAttendanceSignalDaily.findMany as jest.Mock).mockResolvedValue([
      {
        blockName: "Block A",
        date: new Date(),
        schoolsReporting: 2,
        attendanceDropPct: 5,
        symptomClusterIndex: 0.5,
        envRiskDelta: 0.3
      }
    ]);
    (prisma.districtResourceRecommendation.findMany as jest.Mock).mockResolvedValue([
      {
        id: "rec-1",
        blockName: "Block A",
        actionType: "INSPECTION",
        priorityScore: 78,
        recommendedDate: new Date(),
        status: "RECOMMENDED",
        explanation: "Preventive inspection"
      }
    ]);

    (prisma.districtReportSnapshot.create as jest.Mock).mockImplementation(async ({ data }) => ({
      id: "report-1",
      ...data
    }));

    const result = await generateDistrictComplianceReport("Panipat, Haryana", "user-1");
    expect(result.reportId).toBe("report-1");

    (prisma.districtReportSnapshot.findUnique as jest.Mock).mockResolvedValue({
      id: "report-1",
      district: "Panipat, Haryana",
      pdfPath: "reports/test.pdf",
      csvPath: "reports/test.csv",
      requestedBy: "user-1",
      generatedAt: new Date()
    });
    jest.spyOn(fs, "existsSync").mockReturnValue(true);

    const pdfDownload = await getDistrictComplianceReportDownload("report-1", "pdf");
    const csvDownload = await getDistrictComplianceReportDownload("report-1", "csv");

    expect(pdfDownload?.contentType).toContain("pdf");
    expect(csvDownload?.contentType).toContain("csv");
  });
});
