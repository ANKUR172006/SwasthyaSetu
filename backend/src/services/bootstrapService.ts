import { UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { hashPassword } from "../utils/password";

const DEMO_PASSWORD = "Admin@1234";
const TARGET_SCHOOL = {
  name: "Asha Deep Adarsh High School - Karhans",
  district: "Panipat, Haryana",
  udiseCode: "UDISE100201"
};

export const ensureDemoAccounts = async (): Promise<void> => {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const targetSchool = await prisma.school.upsert({
    where: { udiseCode: TARGET_SCHOOL.udiseCode },
    update: {
      name: TARGET_SCHOOL.name,
      district: TARGET_SCHOOL.district
    },
    create: {
      name: TARGET_SCHOOL.name,
      district: TARGET_SCHOOL.district,
      udiseCode: TARGET_SCHOOL.udiseCode,
      type: "PRIVATE",
      infraScore: 82.4
    },
    select: { id: true, name: true, district: true }
  });

  const existingStudents = await prisma.student.count({
    where: { schoolId: targetSchool.id }
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
          schoolId: targetSchool.id,
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

    logger.info({ schoolId: targetSchool.id, created: createdStudents.length }, "Demo students ensured for target school");
  }

  const parentChild = await prisma.student.findFirst({
    where: { schoolId: targetSchool.id },
    select: { id: true }
  });

  const demoUsers: Array<{
    name: string;
    email: string;
    role: UserRole;
    schoolId?: string | null;
    childStudentId?: string | null;
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
      schoolId: targetSchool.id
    },
    {
      name: "Teacher Panipat",
      email: "teacher.pune@swasthyasetu.in",
      role: UserRole.TEACHER,
      schoolId: targetSchool.id
    },
    {
      name: "Parent Panipat",
      email: "parent.pune@swasthyasetu.in",
      role: UserRole.PARENT,
      schoolId: targetSchool.id,
      childStudentId: parentChild?.id ?? null
    }
  ];

  for (const user of demoUsers) {
    const normalizedEmail = user.email.toLowerCase();
    await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        name: user.name,
        role: user.role,
        passwordHash,
        schoolId: user.schoolId ?? null,
        childStudentId: user.childStudentId ?? null
      },
      create: {
        name: user.name,
        email: normalizedEmail,
        role: user.role,
        passwordHash,
        schoolId: user.schoolId ?? null,
        childStudentId: user.childStudentId ?? null
      }
    });
  }

  logger.info({ school: targetSchool.name, district: targetSchool.district }, "Demo accounts and school mapping ensured");
};
