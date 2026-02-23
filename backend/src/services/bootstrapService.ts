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
};
