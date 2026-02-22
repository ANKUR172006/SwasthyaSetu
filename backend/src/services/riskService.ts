import { prisma } from "../config/prisma";
import { recalculateStudentRisk } from "./studentService";
import { invalidateSchoolCache } from "./schoolService";

export const recalculateAllStudentRisk = async () => {
  const students = await prisma.student.findMany({ select: { id: true, schoolId: true } });
  for (const student of students) {
    await recalculateStudentRisk(student.id);
    await invalidateSchoolCache(student.schoolId);
  }
};
