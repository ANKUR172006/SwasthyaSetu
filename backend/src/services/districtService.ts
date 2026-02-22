import { prisma } from "../config/prisma";
import { redis } from "../config/redis";

const cacheTtl = 420;
const ALL_INDIA_TOKENS = new Set(["all-india", "all_india", "india", "*"]);

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

export const districtComparison = async (district: string) => {
  const normalized = districtFilter(district);
  const key = `district:comparison:${normalized.normalized}`;
  const cached = await fromCache(key);
  if (cached) {
    return cached;
  }

  const schools = await prisma.school.findMany({
    where: normalized.isAllIndia ? {} : { district }
  });
  const schoolIds = schools.map((s) => s.id);
  if (schoolIds.length === 0) {
    return [];
  }

  const metrics = await prisma.student.groupBy({
    by: ["schoolId"],
    where: { schoolId: { in: schoolIds } },
    _avg: { riskScore: true, bmi: true },
    _count: { _all: true }
  });

  const response = metrics.map((m) => ({
    schoolId: m.schoolId,
    avgRisk: Number((m._avg.riskScore ?? 0).toFixed(2)),
    avgBmi: Number((m._avg.bmi ?? 0).toFixed(2)),
    students: m._count._all
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
        where: { district },
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
  const cached = await fromCache(key);
  if (cached) {
    return cached;
  }

  const schools = await prisma.school.findMany({
    where: normalized.isAllIndia ? {} : { district },
    select: { id: true, name: true }
  });
  if (schools.length === 0) {
    return [];
  }
  const schoolMap = new Map(schools.map((school) => [school.id, school.name]));

  const aggregated = await prisma.student.groupBy({
    by: ["schoolId"],
    where: { schoolId: { in: schools.map((school) => school.id) } },
    _avg: { riskScore: true }
  });

  const response = aggregated
    .map((entry) => ({
      schoolId: entry.schoolId,
      schoolName: schoolMap.get(entry.schoolId) ?? "Unknown School",
      avgRisk: Number((entry._avg.riskScore ?? 0).toFixed(2))
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
