import { prisma } from "../config/prisma";
import { bounded, districtFilter, districtVariants } from "./districtAdminUtils";
import { getDistrictResourceAllocation } from "./resourceAllocationService";
import { simulateDistrictRiskScenario } from "./districtRiskAggregationService";

const whereForDistrict = (district: string, isAllIndia: boolean) => {
  if (isAllIndia) return {};
  const variants = districtVariants(district);
  return {
    OR: variants.map((value) => ({
      district: { contains: value, mode: "insensitive" as const }
    }))
  };
};

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

const correlation = (xs: number[], ys: number[]): number => {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;
  const x = xs.slice(0, n);
  const y = ys.slice(0, n);
  const mx = mean(x);
  const my = mean(y);
  const cov = x.reduce((acc, val, i) => acc + (val - mx) * (y[i] - my), 0);
  const vx = x.reduce((acc, val) => acc + (val - mx) ** 2, 0);
  const vy = y.reduce((acc, val) => acc + (val - my) ** 2, 0);
  const denom = Math.sqrt(vx * vy);
  return denom ? Number((cov / denom).toFixed(2)) : 0;
};

export const getNationalRiskOverview = async (district: string) => {
  const filter = districtFilter(district);
  const where = whereForDistrict(district, filter.isAllIndia);

  const schools = await prisma.school.findMany({
    where,
    select: {
      district: true,
      students: { select: { riskScore: true } }
    }
  });

  const byDistrict = new Map<string, number[]>();
  for (const school of schools) {
    const key = school.district || "Unknown District";
    const current = byDistrict.get(key) || [];
    current.push(...school.students.map((s) => s.riskScore));
    byDistrict.set(key, current);
  }

  const districtScores = [...byDistrict.entries()].map(([name, scores]) => ({
    district: name,
    score: bounded(mean(scores) * 100)
  }));

  const bands = districtScores.reduce(
    (acc, item) => {
      if (item.score >= 70) acc.high += 1;
      else if (item.score >= 40) acc.moderate += 1;
      else acc.low += 1;
      return acc;
    },
    { low: 0, moderate: 0, high: 0 }
  );

  const total = Math.max(1, districtScores.length);

  const climateRows = await prisma.climateData.findMany({
    where: {
      ...where,
      date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    },
    orderBy: { date: "asc" }
  });

  const recentAlerts = await prisma.districtEnvironmentalAlert.findMany({
    where: {
      ...where,
      endsAt: { gte: new Date() }
    },
    orderBy: [{ severity: "desc" }, { startsAt: "desc" }],
    take: 20
  });

  const avgAqi = mean(climateRows.map((x) => x.aqi));
  const avgTemp = mean(climateRows.map((x) => x.temperature));
  const heatImpactIndex = bounded(avgTemp * 1.8 + climateRows.filter((x) => x.heatAlertFlag).length * 1.4, 0, 100);
  const resilienceIndex = bounded(
    mean(districtScores.map((x) => 100 - x.score)) * 0.35 +
      (100 - Math.min(avgAqi, 220)) * 0.35 +
      (100 - heatImpactIndex) * 0.3
  );

  return {
    scope: filter.isAllIndia ? "NATIONAL" : district,
    generatedAt: new Date().toISOString(),
    riskDistribution: {
      lowPct: bounded((bands.low / total) * 100),
      moderatePct: bounded((bands.moderate / total) * 100),
      highPct: bounded((bands.high / total) * 100)
    },
    topVulnerableDistricts: districtScores.sort((a, b) => b.score - a.score).slice(0, 10),
    activeOutbreakSignals: recentAlerts.length,
    heatwaveImpactIndex: heatImpactIndex,
    aqiImpactTrend: bounded(avgAqi),
    climateHealthResilienceIndex: resilienceIndex,
    explainability: {
      model: "multi-district-risk-aggregation-v1",
      contributors: {
        districtRisk: bounded(mean(districtScores.map((x) => x.score))),
        temperature: bounded(avgTemp * 2),
        aqi: bounded(avgAqi),
        complianceSignals: bounded(recentAlerts.length * 3)
      }
    },
    governanceNotice:
      "Preventive intelligence only. Outputs guide climate-health policy planning and do not diagnose disease."
  };
};

export const getClimateImpactTrends = async (district: string) => {
  const filter = districtFilter(district);
  const where = whereForDistrict(district, filter.isAllIndia);

  const climateRows = await prisma.climateData.findMany({
    where: {
      ...where,
      date: { gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) }
    },
    orderBy: { date: "asc" }
  });

  const attendanceSignals = await prisma.districtAttendanceSignalDaily.findMany({
    where: {
      ...where,
      date: { gte: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) }
    },
    orderBy: { date: "asc" }
  });

  const rainfallSeries = climateRows.map((row) => bounded((row.heatAlertFlag ? 30 : 60) + Math.max(0, 35 - row.temperature) * 2, 0, 100));
  const mosquitoSeries = attendanceSignals.map((row) => bounded(row.symptomClusterIndex * 100 + row.envRiskDelta * 45, 0, 100));
  const heatSeries = climateRows.map((row) => bounded(row.temperature * 2, 0, 100));
  const absenteeSeries = attendanceSignals.map((row) => bounded(row.attendanceDropPct * 3, 0, 100));
  const aqiSeries = climateRows.map((row) => bounded(row.aqi, 0, 300));
  const respiratorySeries = attendanceSignals.map((row) => bounded(row.symptomClusterIndex * 120, 0, 100));

  return {
    scope: filter.isAllIndia ? "NATIONAL" : district,
    generatedAt: new Date().toISOString(),
    correlations: {
      rainfallVsMosquitoRisk: correlation(rainfallSeries, mosquitoSeries),
      heatwaveVsAbsenteeism: correlation(heatSeries, absenteeSeries),
      aqiVsRespiratoryComplaints: correlation(aqiSeries, respiratorySeries)
    },
    trendSeries: {
      rainfallVsMosquitoRisk: rainfallSeries.slice(-14).map((value, idx) => ({ t: idx + 1, value })),
      heatwaveVsAbsenteeism: heatSeries.slice(-14).map((value, idx) => ({ t: idx + 1, value })),
      aqiVsRespiratoryComplaints: aqiSeries.slice(-14).map((value, idx) => ({ t: idx + 1, value }))
    }
  };
};

export const getResourceOptimization = async (district: string, limit: number) => {
  const allocation = await getDistrictResourceAllocation(district, limit);
  return {
    scope: allocation.district,
    generatedAt: allocation.generatedAt,
    optimizedRecommendations: allocation.recommendations,
    governanceNotice: allocation.governanceNotice
  };
};

export const runPolicySimulation = async (
  district: string,
  input: { waterQualityImprovementPct: number; treeCoverIncreasePct: number }
) => {
  const base = await simulateDistrictRiskScenario(district, {
    waterQualityImprovementPct: input.waterQualityImprovementPct,
    wasteManagementImprovementPct: Math.max(0, Math.round(input.treeCoverIncreasePct * 0.45))
  });

  const heatRiskReduction = bounded(input.treeCoverIncreasePct * 0.62, 0, 40);

  return {
    ...base,
    scenarioInputs: {
      ...base.scenarioInputs,
      treeCoverIncreasePct: bounded(input.treeCoverIncreasePct, 0, 40)
    },
    projectedHeatRiskReductionPct: heatRiskReduction,
    policyMessage:
      "Scenario output estimates preventive impact from environmental improvements and supports policy prioritization."
  };
};

export const getFraudAnomalies = async (district: string) => {
  const filter = districtFilter(district);
  const where = whereForDistrict(district, filter.isAllIndia);
  const rows = await prisma.districtFieldReport.findMany({
    where: {
      ...where,
      reportedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    },
    orderBy: { reportedAt: "desc" }
  });

  const blockCounts = rows.reduce((acc, row) => {
    const key = `${row.blockName}::${row.reportType}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const avg = mean(Object.values(blockCounts));
  const anomalies = Object.entries(blockCounts)
    .filter(([, count]) => count > Math.max(3, avg * 1.8))
    .map(([key, count]) => {
      const [blockName, reportType] = key.split("::");
      return {
        blockName,
        reportType,
        count,
        reason: "unusual_reporting_volume"
      };
    })
    .slice(0, 15);

  return {
    scope: filter.isAllIndia ? "NATIONAL" : district,
    generatedAt: new Date().toISOString(),
    anomalies,
    governanceNotice:
      "Anomaly signals indicate potential reporting irregularities for audit follow-up; they are not evidence of fraud by themselves."
  };
};
