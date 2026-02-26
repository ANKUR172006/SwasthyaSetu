import { DistrictResourceActionType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { bounded, districtFilter, districtWhere } from "./districtAdminUtils";

const MODEL_VERSION = "resource-priority-ranking-v1";

const actionLabel = (type: DistrictResourceActionType): string => {
  switch (type) {
    case DistrictResourceActionType.INSPECTION:
      return "inspection_team_deployment";
    case DistrictResourceActionType.WATER_TESTING:
      return "water_testing_priority";
    case DistrictResourceActionType.FUMIGATION:
      return "fumigation_schedule";
    default:
      return "preventive_action";
  }
};

export const getDistrictResourceAllocation = async (district: string, limit: number) => {
  const filter = districtFilter(district);
  const where = districtWhere(district, filter.isAllIndia);

  const schools = await prisma.school.findMany({
    where,
    select: {
      id: true,
      geoProfile: {
        select: { blockName: true }
      },
      students: {
        select: { riskScore: true }
      }
    }
  });

  const schoolCountByBlock = new Map<string, number>();
  const riskByBlock = new Map<string, number>();

  for (const school of schools) {
    const blockName = school.geoProfile?.blockName || "Unknown Block";
    const avgRisk = school.students.length
      ? school.students.reduce((sum, student) => sum + student.riskScore, 0) / school.students.length
      : 0;
    schoolCountByBlock.set(blockName, (schoolCountByBlock.get(blockName) || 0) + 1);
    riskByBlock.set(blockName, (riskByBlock.get(blockName) || 0) + avgRisk);
  }

  const recommendations = await prisma.districtResourceRecommendation.findMany({
    where: filter.isAllIndia
      ? {}
      : {
          OR: district
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((value) => ({ district: { contains: value, mode: "insensitive" as const } }))
        },
    orderBy: [{ priorityScore: "desc" }, { recommendedDate: "asc" }],
    take: Math.max(1, Math.min(50, limit * 2))
  });

  const ranked = recommendations
    .map((item) => {
      const blockSchools = schoolCountByBlock.get(item.blockName) || 1;
      const blockRisk = (riskByBlock.get(item.blockName) || 0) / blockSchools;
      const inspectionDelayDays = Math.max(
        0,
        Math.round((Date.now() - new Date(item.recommendedDate).getTime()) / (24 * 60 * 60 * 1000))
      );

      const populationLoad = bounded(blockSchools * 14, 0, 100);
      const severity = bounded(item.priorityScore);
      const delayPenalty = bounded(inspectionDelayDays * 9, 0, 100);
      const environmentalBurden = bounded(blockRisk * 100);

      const priority = bounded(
        severity * 0.35 + populationLoad * 0.25 + delayPenalty * 0.2 + environmentalBurden * 0.2
      );

      return {
        recommendationId: item.id,
        blockName: item.blockName,
        actionType: actionLabel(item.actionType),
        priorityScore: priority,
        recommendedDate: item.recommendedDate.toISOString(),
        status: item.status.toLowerCase(),
        explanation: item.explanation,
        explainability: {
          modelVersion: MODEL_VERSION,
          contributors: {
            severity,
            populationLoad,
            inspectionDelay: delayPenalty,
            environmentalBurden
          },
          confidence: bounded(55 + blockSchools * 4)
        }
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, Math.max(1, Math.min(50, limit)));

  return {
    district: filter.isAllIndia ? "ALL_INDIA" : district,
    generatedAt: new Date().toISOString(),
    recommendations: ranked,
    governanceNotice:
      "Priority ranking supports preventive district operations and does not provide medical diagnosis."
  };
};
