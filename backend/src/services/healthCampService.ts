import { prisma } from "../config/prisma";
import { invalidateSchoolCache } from "./schoolService";

export const createHealthCamp = async (payload: {
  schoolId: string;
  campType: string;
  date: string;
  participantsCount: number;
  createdBy: string;
}) => {
  const camp = await prisma.healthCamp.create({
    data: {
      schoolId: payload.schoolId,
      campType: payload.campType,
      date: new Date(payload.date),
      participantsCount: payload.participantsCount,
      createdBy: payload.createdBy
    }
  });

  await invalidateSchoolCache(payload.schoolId);
  return camp;
};

export const listHealthCampsBySchool = async (schoolId: string) => {
  return prisma.healthCamp.findMany({
    where: { schoolId },
    orderBy: { date: "desc" }
  });
};
