import fs from "fs";
import path from "path";
import { prisma } from "../config/prisma";
import { bounded, districtFilter, districtWhere } from "./districtAdminUtils";
import { getDistrictRiskOverview } from "./districtRiskAggregationService";
import { getDistrictGeoHotspots } from "./geoHotspotService";
import { getDistrictOutbreakSignals } from "./outbreakSignalService";
import { getDistrictResourceAllocation } from "./resourceAllocationService";
import { getDistrictSeasonalForecast } from "./seasonalForecastService";

const REPORTS_DIR = path.resolve(process.cwd(), "reports");

const ensureReportsDir = () => {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }
};

const escapePdfText = (text: string): string => text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const createSimplePdfBuffer = (title: string, lines: string[]): Buffer => {
  const safeLines = [title, ...lines].slice(0, 55);
  const textOps = [
    "BT",
    "/F1 14 Tf",
    "50 790 Td",
    `( ${escapePdfText(safeLines[0] || "District Report")} ) Tj`,
    "/F1 10 Tf"
  ];

  for (let i = 1; i < safeLines.length; i += 1) {
    textOps.push(`0 -14 Td ( ${escapePdfText(safeLines[i])} ) Tj`);
  }
  textOps.push("ET");

  const stream = textOps.join("\n");
  const objects = [
    "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
    "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
    "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj",
    "4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj",
    `5 0 obj << /Length ${Buffer.byteLength(stream, "utf8")} >> stream\n${stream}\nendstream endobj`
  ];

  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += `${obj}\n`;
  }

  const xrefStart = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(body, "utf8");
};

const districtStatsForCsv = async (district: string) => {
  const filter = districtFilter(district);
  const where = districtWhere(district, filter.isAllIndia);
  const schools = await prisma.school.findMany({
    where,
    select: {
      id: true,
      name: true,
      students: { select: { riskScore: true } },
      geoProfile: { select: { blockName: true, wardName: true } }
    }
  });

  return schools.map((school) => {
    const avgRisk = school.students.length
      ? school.students.reduce((sum, student) => sum + student.riskScore, 0) / school.students.length
      : 0;
    return {
      schoolId: school.id,
      schoolName: school.name,
      blockName: school.geoProfile?.blockName || "Unknown Block",
      wardName: school.geoProfile?.wardName || "Unknown Ward",
      avgRisk: bounded(avgRisk * 100)
    };
  });
};

const toCsv = (rows: Array<Record<string, string | number>>) => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: string | number) => {
    const s = String(value ?? "");
    if (s.includes(",") || s.includes("\n") || s.includes('"')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escape(row[header])).join(","));
  }
  return lines.join("\n");
};

export const generateDistrictComplianceReport = async (district: string, requestedBy: string) => {
  ensureReportsDir();

  const [overview, hotspots, outbreaks, allocation, forecast, zoneTable] = await Promise.all([
    getDistrictRiskOverview(district),
    getDistrictGeoHotspots(district, 30),
    getDistrictOutbreakSignals(district, 14),
    getDistrictResourceAllocation(district, 20),
    getDistrictSeasonalForecast(district, 6),
    districtStatsForCsv(district)
  ]);

  const generatedAt = new Date();
  const stamp = generatedAt.toISOString().replace(/[:.]/g, "-");
  const fileBase = `${district.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${stamp}`;
  const pdfPath = path.join(REPORTS_DIR, `${fileBase}.pdf`);
  const csvPath = path.join(REPORTS_DIR, `${fileBase}.csv`);

  const pdfLines = [
    `Generated At: ${generatedAt.toISOString()}`,
    `Risk Distribution: low=${overview.riskDistribution.lowPct}% moderate=${overview.riskDistribution.moderatePct}% high=${overview.riskDistribution.highPct}%`,
    `District Vulnerability Index: ${overview.districtVulnerabilityIndex}/100`,
    `Top Vulnerability Zones: ${overview.topVulnerabilityZones.map((x) => `${x.blockName}(${x.riskIndex})`).join("; ") || "N/A"}`,
    `Active Environmental Alerts: ${overview.activeEnvironmentalAlerts.length}`,
    `Hotspot Count: ${hotspots.hotspots.length}`,
    `Outbreak Risk Flags: ${outbreaks.flaggedBlocks.length}`,
    `Resource Recommendations: ${allocation.recommendations.length}`,
    `Seasonal Forecast Horizon: ${forecast.months} months`,
    "Recommended Action Plan:",
    ...allocation.recommendations.slice(0, 5).map((item, index) => `${index + 1}. ${item.actionType} - ${item.blockName} (P${item.priorityScore})`),
    "Model assumptions:",
    ...forecast.explainability.assumptions,
    "Governance note: Preventive intelligence only. Not a diagnosis."
  ];

  const pdfBuffer = createSimplePdfBuffer("District Compliance & Sustainability Report", pdfLines);
  fs.writeFileSync(pdfPath, pdfBuffer);

  const csvRows: Array<Record<string, string | number>> = [
    ...zoneTable.map((item) => ({
      section: "zone_risk",
      blockName: item.blockName,
      wardName: item.wardName,
      schoolName: item.schoolName,
      avgRisk: item.avgRisk
    })),
    ...hotspots.hotspots.map((item) => ({
      section: "hotspot_cluster",
      blockName: item.schools[0]?.blockName || "Unknown Block",
      wardName: "-",
      schoolName: item.hotspotType,
      avgRisk: item.severity
    })),
    ...allocation.recommendations.map((item) => ({
      section: "resource_queue",
      blockName: item.blockName,
      wardName: "-",
      schoolName: item.actionType,
      avgRisk: item.priorityScore
    })),
    ...forecast.forecast.map((item) => ({
      section: "seasonal_forecast",
      blockName: item.month.slice(0, 7),
      wardName: `confidence_${item.confidence}`,
      schoolName: `heat_${item.heatRisk}|vector_${item.vectorRisk}|air_${item.airRisk}`,
      avgRisk: item.airRisk
    }))
  ];

  fs.writeFileSync(csvPath, toCsv(csvRows), "utf8");

  const snapshot = await prisma.districtReportSnapshot.create({
    data: {
      district,
      requestedBy,
      generatedAt,
      modelVersions: {
        riskAggregation: overview.explainability.modelVersion,
        hotspotDetection: hotspots.hotspots[0]?.explainability?.modelVersion || "geo-hotspot-clustering-v1",
        outbreakSignals: outbreaks.allBlocks[0]?.explainability?.modelVersion || "multi-school-anomaly-v1",
        resourceAllocation: allocation.recommendations[0]?.explainability?.modelVersion || "resource-priority-ranking-v1",
        seasonalForecast: forecast.explainability.modelVersion
      },
      summaryJson: {
        district,
        generatedAt: generatedAt.toISOString(),
        overview,
        hotspots: {
          count: hotspots.hotspots.length
        },
        outbreaks: {
          flaggedBlocks: outbreaks.flaggedBlocks.length
        },
        allocation: {
          recommendations: allocation.recommendations.length
        },
        forecast: {
          months: forecast.months
        }
      },
      pdfPath,
      csvPath
    }
  });

  return {
    reportId: snapshot.id,
    district,
    generatedAt: snapshot.generatedAt.toISOString(),
    modelVersions: snapshot.modelVersions,
    governanceNotice:
      "Preventive intelligence only. This report supports district planning and operational prioritization."
  };
};

export const getDistrictComplianceReportDownload = async (reportId: string, format: "pdf" | "csv") => {
  const snapshot = await prisma.districtReportSnapshot.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      district: true,
      pdfPath: true,
      csvPath: true,
      generatedAt: true,
      requestedBy: true
    }
  });

  if (!snapshot) {
    return null;
  }

  const filePath = format === "pdf" ? snapshot.pdfPath : snapshot.csvPath;
  const exists = fs.existsSync(filePath);
  if (!exists) {
    return null;
  }

  return {
    filePath,
    filename: `${snapshot.district.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${snapshot.id}.${format}`,
    contentType: format === "pdf" ? "application/pdf" : "text/csv; charset=utf-8"
  };
};
