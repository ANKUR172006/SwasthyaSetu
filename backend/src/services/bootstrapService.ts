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
const PANIPAT_BASELINE_SCHOOLS = [
  { name: "Asha Deep Adarsh High School - Karhans", district: "Panipat, Haryana", udiseCode: "UDISE100201", infraScore: 82.4 },
  { name: "Govt. Senior Secondary School - Panipat City", district: "Panipat, Haryana", udiseCode: "UDISE100202", infraScore: 76.9 },
  { name: "Model Sanskriti Senior Secondary School - Panipat", district: "Panipat, Haryana", udiseCode: "UDISE100203", infraScore: 79.2 },
  { name: "Government Girls High School - Israna", district: "Panipat, Haryana", udiseCode: "UDISE100204", infraScore: 74.8 },
  { name: "Government High School - Samalkha", district: "Panipat, Haryana", udiseCode: "UDISE100205", infraScore: 71.6 }
] as const;

export const ensureDemoAccounts = async (): Promise<void> => {
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const ensuredSchools = [];
  for (const school of PANIPAT_BASELINE_SCHOOLS) {
    const created = await prisma.school.upsert({
      where: { udiseCode: school.udiseCode },
      update: {
        name: school.name,
        district: school.district,
        infraScore: school.infraScore
      },
      create: {
        name: school.name,
        district: school.district,
        udiseCode: school.udiseCode,
        type: "GOVT",
        infraScore: school.infraScore
      },
      select: { id: true, name: true, district: true }
    });
    ensuredSchools.push(created);
  }
  const targetSchool = ensuredSchools.find((school) => school.name === TARGET_SCHOOL.name) ?? ensuredSchools[0];

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

  for (const school of ensuredSchools.filter((s) => s.id !== targetSchool.id)) {
    const schoolStudentCount = await prisma.student.count({ where: { schoolId: school.id } });
    if (schoolStudentCount > 0) continue;

    const samples = [
      { className: "6A", gender: "F", heightCm: 136, weightKg: 30, vaccinationStatus: "COMPLETE", attendanceRatio: 0.9, riskScore: 0.35 },
      { className: "7B", gender: "M", heightCm: 143, weightKg: 37, vaccinationStatus: "PARTIAL", attendanceRatio: 0.84, riskScore: 0.57 },
      { className: "8A", gender: "F", heightCm: 149, weightKg: 42, vaccinationStatus: "DELAYED", attendanceRatio: 0.8, riskScore: 0.69 }
    ];
    const created = [];
    for (const student of samples) {
      const bmi = Number((student.weightKg / ((student.heightCm / 100) ** 2)).toFixed(2));
      created.push(
        await prisma.student.create({
          data: {
            schoolId: school.id,
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
        })
      );
    }
    await prisma.schemeEligibility.createMany({
      data: created.map((student) => ({
        studentId: student.id,
        ayushmanEligible: student.bmi < 16.5 || student.bmi > 28,
        rbsrFlag: student.vaccinationStatus !== "COMPLETE",
        middayMealStatus: student.bmi < 18.5 ? "PRIORITY" : "REGULAR"
      }))
    });
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

  logger.info(
    { school: targetSchool.name, district: targetSchool.district, baselineSchools: ensuredSchools.length },
    "Demo accounts and school mapping ensured"
  );
};
