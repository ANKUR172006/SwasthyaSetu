import { DistrictReportType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { bounded, districtFilter, districtWhere } from "./districtAdminUtils";

type GeoPoint = {
  schoolId: string;
  schoolName: string;
  latitude: number;
  longitude: number;
  blockName: string;
  avgRisk: number;
};

const MODEL_VERSION = "geo-hotspot-kmeans-v2";

const euclidean = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) =>
  Math.sqrt((a.latitude - b.latitude) ** 2 + (a.longitude - b.longitude) ** 2);

const kMeans = (points: GeoPoint[], k: number, iterations = 8): GeoPoint[][] => {
  if (points.length === 0) return [];
  const centers = points.slice(0, Math.max(1, Math.min(k, points.length))).map((p) => ({
    latitude: p.latitude,
    longitude: p.longitude
  }));

  let assignments = new Array(points.length).fill(0);
  for (let iter = 0; iter < iterations; iter += 1) {
    assignments = points.map((point) => {
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      centers.forEach((center, idx) => {
        const dist = euclidean(point, center);
        if (dist < bestDist) {
          bestDist = dist;
          best = idx;
        }
      });
      return best;
    });

    centers.forEach((center, idx) => {
      const clusterPoints = points.filter((_p, pointIdx) => assignments[pointIdx] === idx);
      if (clusterPoints.length === 0) return;
      center.latitude = clusterPoints.reduce((sum, point) => sum + point.latitude, 0) / clusterPoints.length;
      center.longitude = clusterPoints.reduce((sum, point) => sum + point.longitude, 0) / clusterPoints.length;
    });
  }

  return centers
    .map((_, idx) => points.filter((_point, pointIdx) => assignments[pointIdx] === idx))
    .filter((cluster) => cluster.length > 0);
};

const inferHotspotType = (avgRisk: number, reportTypes: Set<DistrictReportType>, avgHeat: number): string => {
  if (reportTypes.has(DistrictReportType.WATER)) return "water_contamination_hotspot";
  if (reportTypes.has(DistrictReportType.VECTOR)) return "vector_exposure_zone";
  if (avgHeat >= 0.5 || reportTypes.has(DistrictReportType.HEAT)) return "heat_vulnerability_block";
  if (avgRisk >= 0.58) return "high_risk_school_cluster";
  return "monitoring_cluster";
};

export const getDistrictGeoHotspots = async (district: string, windowDays: number) => {
  const filter = districtFilter(district);
  const schoolWhere = districtWhere(district, filter.isAllIndia);

  const schools = await prisma.school.findMany({
    where: schoolWhere,
    select: {
      id: true,
      name: true,
      students: { select: { riskScore: true } },
      geoProfile: {
        select: {
          latitude: true,
          longitude: true,
          blockName: true
        }
      }
    }
  });

  const points: GeoPoint[] = schools
    .filter((school) => school.geoProfile)
    .map((school) => ({
      schoolId: school.id,
      schoolName: school.name,
      latitude: school.geoProfile!.latitude,
      longitude: school.geoProfile!.longitude,
      blockName: school.geoProfile!.blockName,
      avgRisk: school.students.length
        ? school.students.reduce((sum, student) => sum + student.riskScore, 0) / school.students.length
        : 0
    }));

  const reportWindowStart = new Date(Date.now() - Math.max(1, windowDays) * 24 * 60 * 60 * 1000);
  const districtOrWhere = filter.isAllIndia
    ? {}
    : {
        OR: district
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((value) => ({ district: { contains: value, mode: "insensitive" as const } }))
      };

  const fieldReports = await prisma.districtFieldReport.findMany({
    where: {
      ...districtOrWhere,
      reportedAt: { gte: reportWindowStart }
    }
  });

  const climateRows = await prisma.climateData.findMany({
    where: {
      ...districtOrWhere,
      date: { gte: reportWindowStart }
    }
  });

  const avgHeat = climateRows.length
    ? climateRows.reduce((sum, row) => sum + (row.heatAlertFlag ? 1 : 0), 0) / climateRows.length
    : 0;

  const clusterCount = points.length >= 9 ? 4 : points.length >= 5 ? 3 : 2;
  const clusters = kMeans(points, clusterCount)
    .map((cluster, index) => {
      const centroid = {
        latitude: cluster.reduce((sum, point) => sum + point.latitude, 0) / Math.max(1, cluster.length),
        longitude: cluster.reduce((sum, point) => sum + point.longitude, 0) / Math.max(1, cluster.length)
      };
      const avgRisk = cluster.reduce((sum, point) => sum + point.avgRisk, 0) / Math.max(1, cluster.length);
      const blockSet = new Set(cluster.map((item) => item.blockName));
      const relatedReports = fieldReports.filter((report) => blockSet.has(report.blockName));
      const reportTypes = new Set(relatedReports.map((report) => report.reportType));
      const severity = bounded(
        avgRisk * 100 * 0.62 +
          (relatedReports.length
            ? relatedReports.reduce((sum, report) => sum + report.severity, 0) / relatedReports.length
            : 20) *
            0.38
      );

      return {
        clusterId: `cluster-${index + 1}`,
        hotspotType: inferHotspotType(avgRisk, reportTypes, avgHeat),
        severity,
        centroid,
        schoolCount: cluster.length,
        schools: cluster.map((item) => ({
          schoolId: item.schoolId,
          schoolName: item.schoolName,
          blockName: item.blockName,
          avgRisk: bounded(item.avgRisk * 100)
        })),
        explainability: {
          modelVersion: MODEL_VERSION,
          model: "KMeansClustering",
          confidence: bounded(52 + cluster.length * 8 + relatedReports.length * 2, 0, 96),
          contributors: {
            schoolRisk: bounded(avgRisk * 100),
            fieldReportSignal: bounded(
              relatedReports.length
                ? relatedReports.reduce((sum, report) => sum + report.severity, 0) / relatedReports.length * 10
                : 20
            ),
            heatSignal: bounded(avgHeat * 100)
          }
        }
      };
    })
    .sort((a, b) => b.severity - a.severity);

  return {
    district: filter.isAllIndia ? "ALL_INDIA" : district,
    generatedAt: new Date().toISOString(),
    windowDays,
    hotspots: clusters,
    governanceNotice:
      "Preventive intelligence only. Hotspot clusters indicate operational priority zones, not disease diagnosis."
  };
};
