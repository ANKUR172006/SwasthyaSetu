import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";
import { calculateRisk } from "../ai-service-client/riskClient";
import { invalidateSchoolCache } from "./schoolService";
import { mapRiskToActions, RiskLevel } from "./riskActionEngine";

const bmi = (heightCm: number, weightKg: number): number => {
  const heightM = heightCm / 100;
  return Number((weightKg / (heightM * heightM)).toFixed(2));
};

const deriveScheme = (student: { bmi: number; vaccinationStatus: string }) => ({
  ayushmanEligible: student.bmi < 16.5 || student.bmi > 28,
  rbsrFlag: student.vaccinationStatus !== "COMPLETE",
  middayMealStatus: student.bmi < 18.5 ? "PRIORITY" : "REGULAR"
});

const latestClimateForSchool = async (schoolId: string) => {
  const school = await prisma.school.findUnique({ where: { id: schoolId } });
  if (!school) {
    throw new ApiError(404, "School not found");
  }

  const climate = await prisma.climateData.findFirst({
    where: { district: school.district },
    orderBy: { date: "desc" }
  });

  return climate ?? { temperature: 32, aqi: 120, heatAlertFlag: false };
};

const buildReasonCodes = (student: {
  bmi: number;
  vaccinationStatus: string;
  attendanceRatio: number;
  riskScore: number;
}) => {
  const reasons: string[] = [];
  if (student.bmi < 18.5 || student.bmi > 25) reasons.push("BMI_OUT_OF_HEALTHY_RANGE");
  if (student.vaccinationStatus !== "COMPLETE") reasons.push("VACCINATION_DELAY_OR_INCOMPLETE");
  if (student.attendanceRatio < 0.85) reasons.push("LOW_ATTENDANCE_PATTERN");
  if (student.riskScore >= 0.7) reasons.push("HIGH_COMPOSITE_RISK");
  if (reasons.length === 0) reasons.push("BASELINE_LOW_RISK");
  return reasons;
};

const scoreToRiskLevel = (score: number): RiskLevel => {
  if (score >= 0.7) return "HIGH";
  if (score >= 0.4) return "MEDIUM";
  return "LOW";
};

const withRiskExplanation = <T extends { bmi: number; vaccinationStatus: string; attendanceRatio: number; riskScore: number }>(
  student: T
) => {
  const reasonCodes = buildReasonCodes(student);
  return {
    ...student,
    riskExplanation: {
      model_version: "risk-explain-v1",
      reason_codes: reasonCodes,
      recommended_actions: mapRiskToActions({
        riskLevel: scoreToRiskLevel(student.riskScore),
        reasonCodes
      })
    }
  };
};

export const createStudent = async (payload: {
  schoolId: string;
  class: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  vaccinationStatus: string;
  attendanceRatio: number;
}) => {
  const computedBmi = bmi(payload.heightCm, payload.weightKg);
  const climate = await latestClimateForSchool(payload.schoolId);
  const risk = await calculateRisk({
    bmi: computedBmi,
    vaccination_status: payload.vaccinationStatus,
    temperature: climate.temperature,
    aqi: climate.aqi,
    attendance_ratio: payload.attendanceRatio
  });

  const student = await prisma.student.create({
    data: {
      schoolId: payload.schoolId,
      className: payload.class,
      gender: payload.gender,
      heightCm: payload.heightCm,
      weightKg: payload.weightKg,
      bmi: computedBmi,
      vaccinationStatus: payload.vaccinationStatus,
      attendanceRatio: payload.attendanceRatio,
      riskScore: risk.score
    }
  });

  await prisma.schemeEligibility.upsert({
    where: { studentId: student.id },
    create: {
      studentId: student.id,
      ...deriveScheme({ bmi: computedBmi, vaccinationStatus: payload.vaccinationStatus })
    },
    update: deriveScheme({ bmi: computedBmi, vaccinationStatus: payload.vaccinationStatus })
  });

  await invalidateSchoolCache(payload.schoolId);
  return student;
};

export const getStudent = async (
  id: string,
  requester?: { userId: string; role: string; schoolId?: string | null }
) => {
  const student = await prisma.student.findUnique({
    where: { id },
    include: { schemeEligibility: true }
  });

  if (!student) {
    throw new ApiError(404, "Student not found");
  }

  if (requester?.role === "PARENT") {
    const parent = await prisma.user.findUnique({
      where: { id: requester.userId },
      select: { childStudentId: true }
    });
    if (!parent?.childStudentId || parent.childStudentId !== student.id) {
      throw new ApiError(403, "Access denied for parent role");
    }
  }

  return withRiskExplanation(student);
};

export const getMyChild = async (parentUserId: string) => {
  const parent = await prisma.user.findUnique({
    where: { id: parentUserId },
    select: { childStudentId: true, schoolId: true }
  });

  let student = null;
  if (parent?.childStudentId) {
    student = await prisma.student.findUnique({
      where: { id: parent.childStudentId },
      include: { schemeEligibility: true }
    });
  }

  if (!student && parent?.schoolId) {
    student = await prisma.student.findFirst({
      where: { schoolId: parent.schoolId },
      orderBy: { createdAt: "desc" },
      include: { schemeEligibility: true }
    });
  }

  if (!student) {
    throw new ApiError(404, "No child data available for this parent account");
  }

  return withRiskExplanation(student);
};

export const updateStudent = async (
  id: string,
  updates: Partial<{
    class: string;
    gender: string;
    heightCm: number;
    weightKg: number;
    vaccinationStatus: string;
    attendanceRatio: number;
  }>
) => {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Student not found");
  }

  const nextHeight = updates.heightCm ?? existing.heightCm;
  const nextWeight = updates.weightKg ?? existing.weightKg;
  const nextVaccination = updates.vaccinationStatus ?? existing.vaccinationStatus;
  const nextAttendance = updates.attendanceRatio ?? existing.attendanceRatio;
  const nextBmi = bmi(nextHeight, nextWeight);

  const climate = await latestClimateForSchool(existing.schoolId);
  const risk = await calculateRisk({
    bmi: nextBmi,
    vaccination_status: nextVaccination,
    temperature: climate.temperature,
    aqi: climate.aqi,
    attendance_ratio: nextAttendance
  });

  const updated = await prisma.student.update({
    where: { id },
    data: {
      className: updates.class ?? existing.className,
      gender: updates.gender ?? existing.gender,
      heightCm: nextHeight,
      weightKg: nextWeight,
      bmi: nextBmi,
      vaccinationStatus: nextVaccination,
      attendanceRatio: nextAttendance,
      riskScore: risk.score
    }
  });

  await prisma.schemeEligibility.upsert({
    where: { studentId: updated.id },
    create: {
      studentId: updated.id,
      ...deriveScheme({ bmi: nextBmi, vaccinationStatus: nextVaccination })
    },
    update: deriveScheme({ bmi: nextBmi, vaccinationStatus: nextVaccination })
  });

  await invalidateSchoolCache(updated.schoolId);
  return updated;
};

export const deleteStudent = async (id: string) => {
  const existing = await prisma.student.findUnique({ where: { id } });
  if (!existing) {
    throw new ApiError(404, "Student not found");
  }

  await prisma.student.delete({ where: { id } });
  await invalidateSchoolCache(existing.schoolId);
  return { deleted: true };
};

export const listStudents = async (page: number, pageSize: number, schoolId?: string) => {
  const where = schoolId ? { schoolId } : {};
  const [data, total] = await Promise.all([
    prisma.student.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: "desc" }
    }),
    prisma.student.count({ where })
  ]);

  return {
    data: data.map(withRiskExplanation),
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize)
    }
  };
};

export const recalculateStudentRisk = async (studentId: string) => {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) {
    return null;
  }

  const climate = await latestClimateForSchool(student.schoolId);
  const risk = await calculateRisk({
    bmi: student.bmi,
    vaccination_status: student.vaccinationStatus,
    temperature: climate.temperature,
    aqi: climate.aqi,
    attendance_ratio: student.attendanceRatio
  });

  return prisma.student.update({ where: { id: studentId }, data: { riskScore: risk.score } });
};
