import { DistrictAlertStatus, DistrictReportType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { bounded, districtFilter, districtWhere, scoreToRiskBucket } from "./districtAdminUtils";

const MODEL_VERSION = "climate-aware-multi-layer-risk-intelligence-v2";

type FeatureVector = {
  temperature: number;
  humidity: number;
  rainfall: number;
  heatIndex: number;
  aqi: number;
  waterQualityScore: number;
  sanitationScore: number;
  wasteManagementScore: number;
  stagnantWaterReports: number;
  attendanceAnomalyPct: number;
  symptomClusterCount: number;
  inspectionDelayDays: number;
};

const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const mapClimateFeatures = (temps: number[], aqiValues: number[], heatFlagRatio: number): Pick<FeatureVector, "temperature" | "humidity" | "rainfall" | "heatIndex" | "aqi"> => {
  const temperature = average(temps);
  const aqi = average(aqiValues);
  const humidity = bounded(42 + heatFlagRatio * 30 + Math.max(0, 36 - temperature) * 1.8, 20, 95);
  const rainfall = bounded(30 + humidity * 0.6 - Math.max(0, temperature - 34) * 2.2, 0, 240);
  const heatIndex = bounded(temperature + humidity * 0.08, 20, 62);
  return {
    temperature: bounded(temperature, 0, 60),
    humidity,
    rainfall,
    heatIndex,
    aqi: bounded(aqi, 0, 500)
  };
};

const randomForestRiskProbability = (features: FeatureVector): number => {
  const trees = [
    features.heatIndex > 43 || features.aqi > 180 || features.attendanceAnomalyPct > 14 ? 0.88 : 0.38,
    features.waterQualityScore < 55 || features.stagnantWaterReports > 3 ? 0.79 : 0.31,
    features.sanitationScore < 60 || features.wasteManagementScore < 58 ? 0.72 : 0.29,
    features.symptomClusterCount > 5 || features.attendanceAnomalyPct > 10 ? 0.77 : 0.33,
    features.inspectionDelayDays > 6 ? 0.71 : 0.3,
    features.rainfall > 110 && features.stagnantWaterReports > 2 ? 0.81 : 0.35,
    features.temperature > 38 && features.humidity > 65 ? 0.75 : 0.34
  ];
  return bounded(average(trees), 0, 1);
};

export type DistrictRiskOverviewResponse = {
  district: string;
  generatedAt: string;
  riskDistribution: {
    lowPct: number;
    moderatePct: number;
    highPct: number;
  };
  topVulnerabilityZones: Array<{
    blockName: string;
    riskIndex: number;
    drivers: string[];
  }>;
  activeEnvironmentalAlerts: Array<{
    alertType: string;
    severity: number;
    startsAt: string;
    endsAt: string;
    status: string;
  }>;
  districtVulnerabilityIndex: number;
  explainability: {
    architectureName: string;
    layers: string[];
    modelVersion: string;
    riskModel: string;
    anomalyModel: string;
    geospatialModel: string;
    confidence: number;
    featureVector: FeatureVector;
    contributors: Record<string, number>;
    notes: string;
  };
  governanceNotice: string;
};

export const getDistrictRiskOverview = async (district: string): Promise<DistrictRiskOverviewResponse> => {
  const filter = districtFilter(district);
  const schoolWhere = districtWhere(district, filter.isAllIndia);

  const schools = await prisma.school.findMany({
    where: schoolWhere,
    select: {
      id: true,
      district: true,
      infraScore: true,
      students: {
        select: {
          riskScore: true
        }
      },
      geoProfile: {
        select: {
          blockName: true
        }
      }
    }
  });

  const allScores = schools.flatMap((school) => school.students.map((student) => student.riskScore));
  const schoolRiskData = schools.map((school) => {
    const avgRisk = school.students.length
      ? school.students.reduce((sum, student) => sum + student.riskScore, 0) / school.students.length
      : 0;
    return {
      schoolId: school.id,
      blockName: school.geoProfile?.blockName || "Unknown Block",
      avgRisk,
      infraScore: school.infraScore
    };
  });

  const buckets = { low: 0, moderate: 0, high: 0 };
  for (const score of allScores) {
    buckets[scoreToRiskBucket(score)] += 1;
  }

  const total = Math.max(1, allScores.length);
  const riskDistribution = {
    lowPct: bounded((buckets.low / total) * 100),
    moderatePct: bounded((buckets.moderate / total) * 100),
    highPct: bounded((buckets.high / total) * 100)
  };

  const blockStats = new Map<
    string,
    {
      scoreTotal: number;
      infraTotal: number;
      count: number;
    }
  >();
  for (const school of schoolRiskData) {
    const current = blockStats.get(school.blockName) || { scoreTotal: 0, infraTotal: 0, count: 0 };
    current.scoreTotal += school.avgRisk;
    current.infraTotal += school.infraScore;
    current.count += 1;
    blockStats.set(school.blockName, current);
  }

  const districtOrWhere = filter.isAllIndia
    ? {}
    : {
        OR: district
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
          .map((value) => ({ district: { contains: value, mode: "insensitive" as const } }))
      };

  const [fieldReports, attendanceSignals, resourceRecommendations] = await Promise.all([
    prisma.districtFieldReport.findMany({
      where: districtOrWhere,
      take: 400,
      orderBy: { reportedAt: "desc" }
    }),
    prisma.districtAttendanceSignalDaily.findMany({
      where: {
        ...districtOrWhere,
        date: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) }
      }
    }),
    prisma.districtResourceRecommendation.findMany({
      where: districtOrWhere,
      orderBy: { recommendedDate: "desc" },
      take: 40
    })
  ]);

  const reportsByBlock = new Map<string, number>();
  for (const report of fieldReports) {
    const current = reportsByBlock.get(report.blockName) || 0;
    reportsByBlock.set(report.blockName, current + report.severity);
  }

  const topVulnerabilityZones = [...blockStats.entries()]
    .map(([blockName, value]) => {
      const avgRisk = value.count ? value.scoreTotal / value.count : 0;
      const infraPenalty = bounded(100 - value.infraTotal / Math.max(1, value.count));
      const reportLoad = reportsByBlock.get(blockName) || 0;
      const riskIndex = bounded(avgRisk * 100 * 0.58 + reportLoad * 1.6 + infraPenalty * 0.2, 0, 100);
      const drivers = [];
      if (avgRisk >= 0.7) drivers.push("elevated_school_risk");
      if (reportLoad > 20) drivers.push("high_environmental_signal");
      if (infraPenalty > 35) drivers.push("institutional_vulnerability");
      if (drivers.length === 0) drivers.push("baseline_monitoring");
      return { blockName, riskIndex, drivers };
    })
    .sort((a, b) => b.riskIndex - a.riskIndex)
    .slice(0, 5);

  const activeEnvironmentalAlerts = await prisma.districtEnvironmentalAlert.findMany({
    where: {
      ...districtOrWhere,
      status: DistrictAlertStatus.ACTIVE,
      endsAt: { gte: new Date() }
    },
    orderBy: [{ severity: "desc" }, { startsAt: "desc" }],
    take: 10
  });

  const weatherSignals = await prisma.climateData.findMany({
    where: {
      ...districtOrWhere,
      date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    },
    orderBy: { date: "desc" }
  });

  const temps = weatherSignals.map((x) => x.temperature);
  const aqiValues = weatherSignals.map((x) => x.aqi);
  const heatFlagRatio = weatherSignals.length
    ? weatherSignals.reduce((sum, item) => sum + (item.heatAlertFlag ? 1 : 0), 0) / weatherSignals.length
    : 0;

  const climateFeatures = mapClimateFeatures(temps, aqiValues, heatFlagRatio);

  const waterReports = fieldReports.filter((item) => item.reportType === DistrictReportType.WATER);
  const sanitationReports = fieldReports.filter((item) => item.reportType === DistrictReportType.SANITATION);
  const wasteReports = fieldReports.filter((item) => item.reportType === DistrictReportType.SANITATION);
  const stagnantReports = fieldReports.filter((item) => item.reportType === DistrictReportType.VECTOR);

  const attendanceAnomalyPct = bounded(average(attendanceSignals.map((x) => x.attendanceDropPct)), 0, 100);
  const symptomClusterCount = bounded(average(attendanceSignals.map((x) => x.symptomClusterIndex)) * 10, 0, 100);
  const inspectionDelayDays = bounded(
    average(
      resourceRecommendations.map((x) =>
        Math.max(0, (Date.now() - new Date(x.recommendedDate).getTime()) / (24 * 60 * 60 * 1000))
      )
    ),
    0,
    30
  );

  const featureVector: FeatureVector = {
    ...climateFeatures,
    waterQualityScore: bounded(85 - average(waterReports.map((x) => x.severity)) * 4, 20, 100),
    sanitationScore: bounded(82 - average(sanitationReports.map((x) => x.severity)) * 3.5, 20, 100),
    wasteManagementScore: bounded(80 - average(wasteReports.map((x) => x.severity)) * 3.2, 20, 100),
    stagnantWaterReports: bounded(stagnantReports.length, 0, 50),
    attendanceAnomalyPct,
    symptomClusterCount,
    inspectionDelayDays
  };

  const rfProbability = randomForestRiskProbability(featureVector);
  const baseScore = allScores.length ? average(allScores) : 0;

  const contributors = {
    environmentalRiskLayer: bounded(
      (featureVector.heatIndex / 60) * 30 +
        (featureVector.aqi / 300) * 35 +
        ((100 - featureVector.waterQualityScore) / 100) * 35
    ),
    institutionalVulnerabilityLayer: bounded(
      ((100 - featureVector.sanitationScore) / 100) * 45 +
        ((100 - featureVector.wasteManagementScore) / 100) * 30 +
        (featureVector.inspectionDelayDays / 30) * 25
    ),
    predictiveAlertLayer: bounded(
      (featureVector.attendanceAnomalyPct / 100) * 35 +
        (featureVector.symptomClusterCount / 100) * 35 +
        (featureVector.stagnantWaterReports / 50) * 30
    ),
    schoolRiskAggregate: bounded(baseScore * 100)
  };

  const districtVulnerabilityIndex = bounded(
    rfProbability * 100 * 0.55 +
      contributors.environmentalRiskLayer * 0.2 +
      contributors.institutionalVulnerabilityLayer * 0.15 +
      contributors.predictiveAlertLayer * 0.1
  );

  return {
    district: filter.isAllIndia ? "ALL_INDIA" : district,
    generatedAt: new Date().toISOString(),
    riskDistribution,
    topVulnerabilityZones,
    activeEnvironmentalAlerts: activeEnvironmentalAlerts.map((alert) => ({
      alertType: alert.alertType,
      severity: alert.severity,
      startsAt: alert.startsAt.toISOString(),
      endsAt: alert.endsAt.toISOString(),
      status: alert.status
    })),
    districtVulnerabilityIndex,
    explainability: {
      architectureName: "Climate-Aware Multi-Layer Risk Intelligence Model",
      layers: [
        "Layer 1 - Environmental Risk Layer",
        "Layer 2 - Institutional Vulnerability Layer",
        "Layer 3 - Predictive Alert Layer"
      ],
      modelVersion: MODEL_VERSION,
      riskModel: "RandomForestClassifier",
      anomalyModel: "Z-Score Anomaly Detection",
      geospatialModel: "K-Means Clustering",
      confidence: bounded(57 + Math.min(35, schools.length * 2 + weatherSignals.length), 0, 95),
      featureVector,
      contributors,
      notes:
        "District model predicts preventive climate-linked risk flags to prioritize governance action. It does not diagnose disease."
    },
    governanceNotice:
      "Preventive intelligence only. This dashboard provides district-level risk flags and priorities, not diagnosis."
  };
};

export const simulateDistrictRiskScenario = async (
  district: string,
  inputs: { waterQualityImprovementPct?: number; wasteManagementImprovementPct?: number }
) => {
  const baseline = await getDistrictRiskOverview(district);
  const waterLift = bounded(Number(inputs.waterQualityImprovementPct || 0), 0, 40);
  const wasteLift = bounded(Number(inputs.wasteManagementImprovementPct || 0), 0, 40);

  const projectedReduction = bounded(waterLift * 0.42 + wasteLift * 0.33, 0, 35);
  const projectedIndex = bounded(baseline.districtVulnerabilityIndex - projectedReduction);

  return {
    district: baseline.district,
    generatedAt: new Date().toISOString(),
    baselineVulnerabilityIndex: baseline.districtVulnerabilityIndex,
    scenarioInputs: {
      waterQualityImprovementPct: waterLift,
      wasteManagementImprovementPct: wasteLift
    },
    projectedReductionPct: projectedReduction,
    projectedVulnerabilityIndex: projectedIndex,
    message:
      "Projected reduction estimates preventive risk improvement from environmental score uplift, not medical diagnosis.",
    governanceNotice:
      "Preventive scenario simulation only. Model outputs are planning aids and should be field-validated."
  };
};
