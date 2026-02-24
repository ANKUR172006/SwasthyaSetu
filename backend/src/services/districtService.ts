import { prisma } from "../config/prisma";
import { redis } from "../config/redis";

const cacheTtl = 420;
const ALL_INDIA_TOKENS = new Set(["all-india", "all_india", "india", "*"]);
const RANKING_WEIGHTS = {
  health: 0.4,
  attendance: 0.3,
  scheme: 0.2,
  infra: 0.1
};

const fromCache = async <T>(key: string): Promise<T | null> => {
  const cached = await redis.get(key);
  return cached ? (JSON.parse(cached) as T) : null;
};

const toCache = async (key: string, value: unknown) => {
  await redis.set(key, JSON.stringify(value), "EX", cacheTtl);
};

const districtFilter = (district: string) => {
  const normalized = district.trim().toLowerCase();
  return {
    normalized,
    isAllIndia: ALL_INDIA_TOKENS.has(normalized)
  };
};

const districtVariants = (district: string): string[] => {
  const normalized = district.trim();
  if (!normalized) return [];
  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return [...new Set([normalized, ...parts])];
};

const schoolWhereForDistrict = (district: string, isAllIndia: boolean) => {
  if (isAllIndia) return {};
  const variants = districtVariants(district);
  return {
    OR: variants.map((value) => ({
      district: {
        contains: value,
        mode: "insensitive" as const
      }
    }))
  };
};

const boundedScore = (value: number): number => Math.max(0, Math.min(100, Number(value.toFixed(2))));

type DistrictComparisonItem = {
  schoolId: string;
  schoolName: string;
  district: string;
  type: string;
  students: number;
  avgRisk: number;
  avgBmi: number;
  avgAttendance: number;
  schemeCoverage: {
    ayushman: number;
    rbsk: number;
  };
  scoreBreakdown: {
    health: number;
    attendance: number;
    scheme: number;
    infra: number;
  };
  compositeScore: number;
  rank: number;
};

type DistrictTopRiskItem = {
  schoolId: string;
  schoolName: string;
  avgRisk: number;
  rank: number;
  compositeScore: number;
};

export const districtComparison = async (district: string) => {
  const normalized = districtFilter(district);
  const key = `district:comparison:${normalized.normalized}`;
  const cached = await fromCache<DistrictComparisonItem[]>(key);
  if (cached) {
    return cached;
  }

  const schools = await prisma.school.findMany({
    where: schoolWhereForDistrict(district, normalized.isAllIndia),
    select: { id: true, name: true, district: true, type: true, infraScore: true }
  });
  const schoolIds = schools.map((s) => s.id);
  if (schoolIds.length === 0) {
    return [];
  }

  const students = await prisma.student.findMany({
    where: { schoolId: { in: schoolIds } },
    select: {
      schoolId: true,
      bmi: true,
      riskScore: true,
      attendanceRatio: true,
      schemeEligibility: {
        select: {
          ayushmanEligible: true,
          rbsrFlag: true
        }
      }
    }
  });

  const aggregateMap = new Map<
    string,
    {
      riskTotal: number;
      bmiTotal: number;
      attendanceTotal: number;
      ayushmanEligible: number;
      rbskCovered: number;
      students: number;
    }
  >();

  for (const student of students) {
    const current = aggregateMap.get(student.schoolId) ?? {
      riskTotal: 0,
      bmiTotal: 0,
      attendanceTotal: 0,
      ayushmanEligible: 0,
      rbskCovered: 0,
      students: 0
    };
    current.riskTotal += student.riskScore;
    current.bmiTotal += student.bmi;
    current.attendanceTotal += student.attendanceRatio;
    current.students += 1;
    if (student.schemeEligibility?.ayushmanEligible) {
      current.ayushmanEligible += 1;
    }
    if (student.schemeEligibility && !student.schemeEligibility.rbsrFlag) {
      current.rbskCovered += 1;
    }
    aggregateMap.set(student.schoolId, current);
  }

  const response = schools
    .map((school) => {
      const aggregate = aggregateMap.get(school.id);
      const studentsCount = aggregate?.students ?? 0;
      const avgRisk = studentsCount > 0 ? aggregate!.riskTotal / studentsCount : 0;
      const avgBmi = studentsCount > 0 ? aggregate!.bmiTotal / studentsCount : 0;
      const avgAttendance = studentsCount > 0 ? aggregate!.attendanceTotal / studentsCount : 0;
      const ayushmanCoverageRatio = studentsCount > 0 ? aggregate!.ayushmanEligible / studentsCount : 0;
      const rbskCoverageRatio = studentsCount > 0 ? aggregate!.rbskCovered / studentsCount : 0;

      const healthScore = boundedScore((1 - avgRisk) * 100);
      const attendanceScore = boundedScore(avgAttendance * 100);
      const schemeScore = boundedScore(((ayushmanCoverageRatio + rbskCoverageRatio) / 2) * 100);
      const infraScore = boundedScore(school.infraScore);
      const compositeScore = boundedScore(
        healthScore * RANKING_WEIGHTS.health +
          attendanceScore * RANKING_WEIGHTS.attendance +
          schemeScore * RANKING_WEIGHTS.scheme +
          infraScore * RANKING_WEIGHTS.infra
      );

      return {
        schoolId: school.id,
        schoolName: school.name,
        district: school.district,
        type: school.type,
        students: studentsCount,
        avgRisk: Number(avgRisk.toFixed(2)),
        avgBmi: Number(avgBmi.toFixed(2)),
        avgAttendance: Number(avgAttendance.toFixed(2)),
        schemeCoverage: {
          ayushman: Number(ayushmanCoverageRatio.toFixed(2)),
          rbsk: Number(rbskCoverageRatio.toFixed(2))
        },
        scoreBreakdown: {
          health: healthScore,
          attendance: attendanceScore,
          scheme: schemeScore,
          infra: infraScore
        },
        compositeScore
      };
    })
    .sort((a, b) => b.compositeScore - a.compositeScore)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1
    }));

  await toCache(key, response);
  return response;
};

export const districtClimateRisk = async (district: string) => {
  const normalized = districtFilter(district);
  const key = `district:climate-risk:${normalized.normalized}`;
  const cached = await fromCache(key);
  if (cached) {
    return cached;
  }

  const recentClimate = normalized.isAllIndia
    ? await prisma.climateData.findMany({
        where: { date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
        orderBy: { date: "desc" }
      })
    : await prisma.climateData.findMany({
        where: {
          OR: districtVariants(district).map((value) => ({
            district: {
              contains: value,
              mode: "insensitive"
            }
          }))
        },
        orderBy: { date: "desc" },
        take: 7
      });

  const response = {
    district: normalized.isAllIndia ? "ALL_INDIA" : district,
    days: recentClimate.length,
    avgTemperature:
      recentClimate.length > 0
        ? Number((recentClimate.reduce((sum, item) => sum + item.temperature, 0) / recentClimate.length).toFixed(2))
        : 0,
    avgAqi:
      recentClimate.length > 0
        ? Number((recentClimate.reduce((sum, item) => sum + item.aqi, 0) / recentClimate.length).toFixed(2))
        : 0,
    heatAlertDays: recentClimate.filter((x) => x.heatAlertFlag).length
  };

  await toCache(key, response);
  return response;
};

export const districtTopRiskSchools = async (district: string) => {
  const normalized = districtFilter(district);
  const key = `district:top-risk:${normalized.normalized}`;
  const cached = await fromCache<DistrictTopRiskItem[]>(key);
  if (cached) {
    return cached;
  }

  const comparison = await districtComparison(district);
  const response: DistrictTopRiskItem[] = comparison
    .map((entry) => ({
      schoolId: entry.schoolId,
      schoolName: entry.schoolName,
      avgRisk: entry.avgRisk,
      rank: entry.rank,
      compositeScore: entry.compositeScore
    }))
    .sort((a, b) => b.avgRisk - a.avgRisk)
    .slice(0, 10);

  await toCache(key, response);
  return response;
};

export const invalidateDistrictCache = async (district: string) => {
  const keys = [
    `district:comparison:${district.toLowerCase()}`,
    `district:climate-risk:${district.toLowerCase()}`,
    `district:top-risk:${district.toLowerCase()}`
  ];
  await redis.del(...keys);
};
