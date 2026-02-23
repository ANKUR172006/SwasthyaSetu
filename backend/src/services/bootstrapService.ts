import { UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { hashPassword } from "../utils/password";

const DEMO_PASSWORD = "Admin@1234";

export const ensureDemoAccounts = async (): Promise<void> => {
  const existing = await prisma.user.findMany({
    where: {
      email: {
        in: [
          "superadmin@swasthyasetu.in",
          "district.pune@swasthyasetu.in",
          "schooladmin.pune@swasthyasetu.in",
          "teacher.pune@swasthyasetu.in",
          "parent.pune@swasthyasetu.in"
        ]
      }
    },
    select: { email: true }
  });
  const existingSet = new Set(existing.map((item) => item.email.toLowerCase()));

  const school = await prisma.school.findFirst({
    where: {
      district: {
        contains: "Panipat",
        mode: "insensitive"
      }
    },
    select: { id: true }
  });
  const fallbackSchool = school ?? (await prisma.school.findFirst({ select: { id: true } }));
  const defaultSchoolId = fallbackSchool?.id ?? null;

  const parentChild = defaultSchoolId
    ? await prisma.student.findFirst({
        where: { schoolId: defaultSchoolId },
        select: { id: true }
      })
    : null;

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const demoUsers: Array<{
    name: string;
    email: string;
    role: UserRole;
    schoolId?: string;
    childStudentId?: string;
  }> = [
    {
      name: "Platform Super Admin",
      email: "superadmin@swasthyasetu.in",
      role: UserRole.SUPER_ADMIN
    },
    {
      name: "Panipat District Admin",
      email: "district.pune@swasthyasetu.in",
      role: UserRole.DISTRICT_ADMIN
    },
    {
      name: "School Admin Panipat",
      email: "schooladmin.pune@swasthyasetu.in",
      role: UserRole.SCHOOL_ADMIN,
      ...(defaultSchoolId ? { schoolId: defaultSchoolId } : {})
    },
    {
      name: "Teacher Panipat",
      email: "teacher.pune@swasthyasetu.in",
      role: UserRole.TEACHER,
      ...(defaultSchoolId ? { schoolId: defaultSchoolId } : {})
    },
    {
      name: "Parent Panipat",
      email: "parent.pune@swasthyasetu.in",
      role: UserRole.PARENT,
      ...(defaultSchoolId ? { schoolId: defaultSchoolId } : {}),
      ...(parentChild?.id ? { childStudentId: parentChild.id } : {})
    }
  ];

  let created = 0;
  for (const user of demoUsers) {
    const normalizedEmail = user.email.toLowerCase();
    if (existingSet.has(normalizedEmail)) {
      continue;
    }

    await prisma.user.create({
      data: {
        name: user.name,
        email: normalizedEmail,
        passwordHash,
        role: user.role,
        schoolId: user.schoolId,
        childStudentId: user.childStudentId
      }
    });
    created += 1;
  }

  if (created > 0) {
    logger.info({ created }, "Demo accounts ensured");
  }

  if (defaultSchoolId) {
    const existingStudents = await prisma.student.count({
      where: { schoolId: defaultSchoolId }
    });

    if (existingStudents === 0) {
      const sampleStudents = [
        { className: "6A", gender: "F", heightCm: 137, weightKg: 31, vaccinationStatus: "COMPLETE", attendanceRatio: 0.93, riskScore: 0.28 },
        { className: "6B", gender: "M", heightCm: 139, weightKg: 34, vaccinationStatus: "PARTIAL", attendanceRatio: 0.88, riskScore: 0.46 },
        { className: "7A", gender: "F", heightCm: 144, weightKg: 37, vaccinationStatus: "DELAYED", attendanceRatio: 0.81, riskScore: 0.62 },
        { className: "7B", gender: "M", heightCm: 146, weightKg: 39, vaccinationStatus: "COMPLETE", attendanceRatio: 0.9, riskScore: 0.33 },
        { className: "8A", gender: "F", heightCm: 151, weightKg: 44, vaccinationStatus: "PARTIAL", attendanceRatio: 0.84, riskScore: 0.55 }
      ];

      const createdStudents = [];
      for (const student of sampleStudents) {
        const bmi = Number((student.weightKg / ((student.heightCm / 100) ** 2)).toFixed(2));
        const createdStudent = await prisma.student.create({
          data: {
            schoolId: defaultSchoolId,
            className: student.className,
            gender: student.gender,
            heightCm: student.heightCm,
            weightKg: student.weightKg,
            bmi,
            vaccinationStatus: student.vaccinationStatus,
            attendanceRatio: student.attendanceRatio,
            riskScore: student.riskScore
          },
          select: { id: true, bmi: true, vaccinationStatus: true }
        });
        createdStudents.push(createdStudent);
      }

      await prisma.schemeEligibility.createMany({
        data: createdStudents.map((student) => ({
          studentId: student.id,
          ayushmanEligible: student.bmi < 16.5 || student.bmi > 28,
          rbsrFlag: student.vaccinationStatus !== "COMPLETE",
          middayMealStatus: student.bmi < 18.5 ? "PRIORITY" : "REGULAR"
        }))
      });

      logger.info({ schoolId: defaultSchoolId, created: createdStudents.length }, "Demo students ensured for default school");
    }
  }
};
