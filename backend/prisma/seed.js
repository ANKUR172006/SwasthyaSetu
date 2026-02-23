const bcrypt = require("bcryptjs");
const { PrismaClient, SchoolType, UserRole } = require("@prisma/client");

const prisma = new PrismaClient();

const buildBmi = (heightCm, weightKg) => {
  const h = heightCm / 100;
  return Number((weightKg / (h * h)).toFixed(2));
};

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.healthCamp.deleteMany();
  await prisma.schemeEligibility.deleteMany();
  await prisma.student.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.climateData.deleteMany();
  await prisma.school.deleteMany();

  const schools = await prisma.$transaction([
    prisma.school.create({ data: { name: "Asha Deep Adarsh High School - Karhans", udiseCode: "UDISE100201", type: SchoolType.PRIVATE, district: "Panipat, Haryana", infraScore: 82.4 } }),
    prisma.school.create({ data: { name: "Govt. Senior Secondary School - Panipat City", udiseCode: "UDISE100202", type: SchoolType.GOVT, district: "Panipat, Haryana", infraScore: 76.9 } }),
    prisma.school.create({ data: { name: "Delhi Nagar Nigam School - Karol Bagh", udiseCode: "UDISE200101", type: SchoolType.GOVT, district: "Delhi", infraScore: 71.2 } })
  ]);

  const adminPasswordHash = await bcrypt.hash("Admin@1234", 12);

  const [superAdmin, districtAdmin, schoolAdmin, teacher, parent] = await prisma.$transaction([
    prisma.user.create({ data: { name: "Platform Super Admin", email: "superadmin@swasthyasetu.in", passwordHash: adminPasswordHash, role: UserRole.SUPER_ADMIN } }),
    prisma.user.create({ data: { name: "Panipat District Admin", email: "district.pune@swasthyasetu.in", passwordHash: adminPasswordHash, role: UserRole.DISTRICT_ADMIN } }),
    prisma.user.create({ data: { name: "School Admin Panipat", email: "schooladmin.pune@swasthyasetu.in", passwordHash: adminPasswordHash, role: UserRole.SCHOOL_ADMIN, schoolId: schools[0].id } }),
    prisma.user.create({ data: { name: "Teacher Panipat", email: "teacher.pune@swasthyasetu.in", passwordHash: adminPasswordHash, role: UserRole.TEACHER, schoolId: schools[0].id } }),
    prisma.user.create({ data: { name: "Parent Panipat", email: "parent.pune@swasthyasetu.in", passwordHash: adminPasswordHash, role: UserRole.PARENT, schoolId: schools[0].id } })
  ]);

  const studentPayload = [
    { schoolId: schools[0].id, className: "6A", gender: "F", heightCm: 134, weightKg: 29, vaccinationStatus: "COMPLETE", attendanceRatio: 0.93, riskScore: 0.31 },
    { schoolId: schools[0].id, className: "7B", gender: "M", heightCm: 142, weightKg: 34, vaccinationStatus: "PARTIAL", attendanceRatio: 0.86, riskScore: 0.54 },
    { schoolId: schools[1].id, className: "8A", gender: "F", heightCm: 148, weightKg: 43, vaccinationStatus: "DELAYED", attendanceRatio: 0.79, riskScore: 0.71 },
    { schoolId: schools[1].id, className: "9C", gender: "M", heightCm: 151, weightKg: 49, vaccinationStatus: "COMPLETE", attendanceRatio: 0.91, riskScore: 0.39 },
    { schoolId: schools[2].id, className: "10A", gender: "F", heightCm: 154, weightKg: 45, vaccinationStatus: "PARTIAL", attendanceRatio: 0.82, riskScore: 0.58 }
  ];

  const students = [];
  for (const entry of studentPayload) {
    const student = await prisma.student.create({
      data: {
        schoolId: entry.schoolId,
        className: entry.className,
        gender: entry.gender,
        heightCm: entry.heightCm,
        weightKg: entry.weightKg,
        bmi: buildBmi(entry.heightCm, entry.weightKg),
        vaccinationStatus: entry.vaccinationStatus,
        attendanceRatio: entry.attendanceRatio,
        riskScore: entry.riskScore
      }
    });
    students.push(student);
  }

  await Promise.all(
    students.map((student) =>
      prisma.schemeEligibility.create({
        data: {
          studentId: student.id,
          ayushmanEligible: student.bmi < 16.5 || student.bmi > 28,
          rbsrFlag: student.vaccinationStatus !== "COMPLETE",
          middayMealStatus: student.bmi < 18.5 ? "PRIORITY" : "REGULAR"
        }
      })
    )
  );

  const now = new Date();
  await prisma.$transaction([
    prisma.climateData.create({ data: { district: "Panipat, Haryana", date: now, temperature: 40.1, aqi: 178, heatAlertFlag: true } }),
    prisma.climateData.create({ data: { district: "Delhi", date: now, temperature: 41.2, aqi: 232, heatAlertFlag: true } })
  ]);

  await prisma.healthCamp.createMany({
    data: [
      { schoolId: schools[0].id, campType: "ANEMIA_SCREENING", date: now, participantsCount: 180, createdBy: schoolAdmin.id },
      { schoolId: schools[1].id, campType: "VISION_DENTAL", date: now, participantsCount: 132, createdBy: schoolAdmin.id }
    ]
  });

  console.log("Seed complete");
  console.log(`Super Admin: ${superAdmin.email} / Admin@1234`);
  console.log(`District Admin: ${districtAdmin.email} / Admin@1234`);
  console.log(`School Admin: ${schoolAdmin.email} / Admin@1234`);
  console.log(`Teacher: ${teacher.email} / Admin@1234`);
  console.log(`Parent: ${parent.email} / Admin@1234`);
  console.log(`Sample school IDs: ${schools.map((s) => s.id).join(", ")}`);
  console.log(`Sample student IDs: ${students.map((s) => s.id).join(", ")}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
