import { prisma } from "../config/prisma";
import { bounded, districtFilter, districtWhere } from "./districtAdminUtils";

const MODEL_VERSION = "attendance-symptom-anomaly-v2";

const signalStatus = (score: number): "watch" | "elevated" | "high" => {
  if (score >= 75) return "high";
  if (score >= 50) return "elevated";
  return "watch";
};

const mean = (values: number[]): number => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);

const stdDev = (values: number[], avg: number): number => {
  if (values.length < 2) return 0;
  const variance = values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const zScore = (value: number, avg: number, sigma: number): number => {
  if (!sigma) return 0;
  return (value - avg) / sigma;
};

export const getDistrictOutbreakSignals = async (district: string, windowDays: number) => {
  const filter = districtFilter(district);
  const where = districtWhere(district, filter.isAllIndia);
  const lookbackDate = new Date(Date.now() - Math.max(1, windowDays) * 24 * 60 * 60 * 1000);

  const rows = await prisma.districtAttendanceSignalDaily.findMany({
    where: {
      ...(filter.isAllIndia ? {} : where),
      date: { gte: lookbackDate }
    },
    orderBy: [{ blockName: "asc" }, { date: "desc" }]
  });

  const attendanceValues = rows.map((item) => item.attendanceDropPct);
  const symptomValues = rows.map((item) => item.symptomClusterIndex);
  const envValues = rows.map((item) => item.envRiskDelta);

  const attendanceMean = mean(attendanceValues);
  const symptomMean = mean(symptomValues);
  const envMean = mean(envValues);

  const attendanceStd = stdDev(attendanceValues, attendanceMean);
  const symptomStd = stdDev(symptomValues, symptomMean);
  const envStd = stdDev(envValues, envMean);

  const byBlock = new Map<string, typeof rows>();
  for (const row of rows) {
    const current = byBlock.get(row.blockName) || [];
    current.push(row);
    byBlock.set(row.blockName, current);
  }

  const signals = [...byBlock.entries()].map(([blockName, values]) => {
    const attendanceDrop = mean(values.map((value) => value.attendanceDropPct));
    const symptomCluster = mean(values.map((value) => value.symptomClusterIndex));
    const envRisk = mean(values.map((value) => value.envRiskDelta));
    const schoolsReporting = Math.max(...values.map((value) => value.schoolsReporting));

    const attendanceZ = zScore(attendanceDrop, attendanceMean, attendanceStd);
    const symptomZ = zScore(symptomCluster, symptomMean, symptomStd);
    const envZ = zScore(envRisk, envMean, envStd);

    const triadPresent = attendanceDrop >= 4 && symptomCluster >= 0.35 && envRisk >= 0.25 && schoolsReporting >= 2;
    const anomalyStrength = bounded(Math.max(0, attendanceZ) * 18 + Math.max(0, symptomZ) * 24 + Math.max(0, envZ) * 24);
    const severityScore = bounded(attendanceDrop * 4.8 + symptomCluster * 38 + envRisk * 40 + schoolsReporting * 4 + anomalyStrength * 0.3);

    return {
      blockName,
      status: signalStatus(severityScore),
      riskFlag: triadPresent || anomalyStrength >= 45,
      confidence: bounded(42 + values.length * 5 + schoolsReporting * 8 + anomalyStrength * 0.2, 0, 95),
      triadMetrics: {
        attendanceDropPct: bounded(attendanceDrop),
        symptomClusterIndex: bounded(symptomCluster * 100),
        envRiskRiseIndex: bounded(envRisk * 100),
        schoolsReporting
      },
      severityScore,
      explainability: {
        modelVersion: MODEL_VERSION,
        anomalyModel: "ZScoreAnomalyDetection",
        triggerRule:
          "Risk flag requires multi-signal anomaly across attendance, symptom clusters, and environmental rise at block level.",
        anomalyScores: {
          attendanceZ: Number(attendanceZ.toFixed(2)),
          symptomClusterZ: Number(symptomZ.toFixed(2)),
          envRiskZ: Number(envZ.toFixed(2))
        },
        contributors: {
          attendanceDrop: bounded(attendanceDrop * 4.8),
          symptomCluster: bounded(symptomCluster * 38),
          envRiskRise: bounded(envRisk * 40),
          multiSchoolSpread: bounded(schoolsReporting * 4),
          anomalyStrength
        }
      }
    };
  });

  return {
    district: filter.isAllIndia ? "ALL_INDIA" : district,
    generatedAt: new Date().toISOString(),
    windowDays,
    flaggedBlocks: signals.filter((item) => item.riskFlag).sort((a, b) => b.severityScore - a.severityScore),
    allBlocks: signals.sort((a, b) => b.severityScore - a.severityScore),
    governanceNotice:
      "Risk flags are preventive district signals and should be used for surveillance and operational planning only."
  };
};
