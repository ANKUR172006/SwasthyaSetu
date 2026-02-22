import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { redis } from "../config/redis";
import { ApiError } from "../utils/apiError";

const SIX_MINUTES = 360;

const cacheGet = async <T>(key: string): Promise<T | null> => {
  const cached = await redis.get(key);
  return cached ? (JSON.parse(cached) as T) : null;
};

const cacheSet = async (key: string, value: unknown): Promise<void> => {
  await redis.set(key, JSON.stringify(value), "EX", SIX_MINUTES);
};

export const listSchools = async (params: {
  page: number;
  pageSize: number;
  district?: string;
  state?: string;
  search?: string;
}) => {
  const where: Prisma.SchoolWhereInput = {};
  const andClauses: Prisma.SchoolWhereInput[] = [];

  if (params.district) {
    andClauses.push({
      district: { contains: params.district.trim(), mode: "insensitive" }
    });
  }

  if (params.state) {
    andClauses.push({
      district: { contains: params.state.trim(), mode: "insensitive" }
    });
  }

  if (params.search) {
    const query = params.search.trim();
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { udiseCode: { contains: query, mode: "insensitive" } },
      { district: { contains: query, mode: "insensitive" } }
    ];
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  const [data, total] = await Promise.all([
    prisma.school.findMany({
      where,
      orderBy: [{ district: "asc" }, { name: "asc" }],
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize
    }),
    prisma.school.count({ where })
  ]);

  return {
    data,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total,
      totalPages: Math.ceil(total / params.pageSize)
    }
  };
};

export const getSchoolSummary = async (schoolId: string) => {
  const key = `school:summary:${schoolId}`;
  const cached = await cacheGet(key);
  if (cached) {
    return cached;
  }

  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    throw new ApiError(404, "School not found");
  }

  const [studentCount, avgRisk, campCount, climate] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.student.aggregate({ where: { schoolId }, _avg: { riskScore: true } }),
    prisma.healthCamp.count({ where: { schoolId } }),
    prisma.climateData.findFirst({
      where: { district: school.district },
      orderBy: { date: "desc" }
    })
  ]);

  const response = {
    school,
    metrics: {
      studentCount,
      averageRiskScore: Number((avgRisk._avg.riskScore ?? 0).toFixed(2)),
      campsConducted: campCount,
      latestClimate: climate
    }
  };

  await cacheSet(key, response);
  return response;
};

export const getSchoolHealthRisk = async (schoolId: string) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    throw new ApiError(404, "School not found");
  }

  const grouped = await prisma.student.groupBy({
    by: ["schoolId"],
    where: { schoolId },
    _avg: { riskScore: true },
    _max: { riskScore: true }
  });

  return {
    schoolId,
    averageRisk: Number((grouped[0]?._avg.riskScore ?? 0).toFixed(2)),
    maxRisk: Number((grouped[0]?._max.riskScore ?? 0).toFixed(2))
  };
};

export const getSchoolSchemeCoverage = async (schoolId: string) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    throw new ApiError(404, "School not found");
  }

  const [total, ayushmanEligibleCount, rbsrFlagCount] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.schemeEligibility.count({ where: { student: { schoolId }, ayushmanEligible: true } }),
    prisma.schemeEligibility.count({ where: { student: { schoolId }, rbsrFlag: true } })
  ]);

  return {
    schoolId,
    totalStudents: total,
    ayushmanEligibleCount,
    rbsrFlagCount
  };
};

export const invalidateSchoolCache = async (schoolId: string) => {
  await redis.del(`school:summary:${schoolId}`);
};
