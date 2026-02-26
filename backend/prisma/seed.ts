import bcrypt from "bcryptjs";
import {
  DistrictAlertStatus,
  DistrictAlertType,
  DistrictReportType,
  DistrictResourceActionType,
  DistrictResourceStatus,
  PrismaClient,
  SchoolType,
  UserRole
} from "@prisma/client";

const prisma = new PrismaClient();

const buildBmi = (heightCm: number, weightKg: number): number => {
  const h = heightCm / 100;
  return Number((weightKg / (h * h)).toFixed(2));
};

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.districtReportSnapshot.deleteMany();
  await prisma.districtForecastMonthly.deleteMany();
  await prisma.districtResourceRecommendation.deleteMany();
  await prisma.districtAttendanceSignalDaily.deleteMany();
  await prisma.districtEnvironmentalAlert.deleteMany();
  await prisma.districtFieldReport.deleteMany();
  await prisma.schoolGeoProfile.deleteMany();
  await prisma.healthCamp.deleteMany();
  await prisma.schemeEligibility.deleteMany();
  await prisma.student.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.climateData.deleteMany();
  await prisma.school.deleteMany();

  const schoolSeed = [
    {
      name: "Asha Deep Adarsh High School - Karhans",
      udiseCode: "UDISE100201",
      type: SchoolType.PRIVATE,
      district: "Panipat, Haryana",
      infraScore: 82.4
    },
    {
      name: "Govt. Senior Secondary School - Panipat City",
      udiseCode: "UDISE100202",
      type: SchoolType.GOVT,
      district: "Panipat, Haryana",
      infraScore: 76.9
    },
    {
      name: "Delhi Nagar Nigam School - Karol Bagh",
      udiseCode: "UDISE200101",
      type: SchoolType.GOVT,
      district: "Delhi, Delhi",
      infraScore: 71.2
    },
    {
      name: "Bengaluru Vidya Kendra - Jayanagar",
      udiseCode: "UDISE300101",
      type: SchoolType.PRIVATE,
      district: "Bengaluru, Karnataka",
      infraScore: 79.5
    },
    {
      name: "Ahmedabad Municipal School - Navrangpura",
      udiseCode: "UDISE400101",
      type: SchoolType.GOVT,
      district: "Ahmedabad, Gujarat",
      infraScore: 73.8
    },
    {
      name: "Kolkata Community School - Salt Lake",
      udiseCode: "UDISE500101",
      type: SchoolType.GOVT,
      district: "Kolkata, West Bengal",
      infraScore: 74.6
    },
    {
      name: "Lucknow Public Learning Centre",
      udiseCode: "UDISE600101",
      type: SchoolType.PRIVATE,
      district: "Lucknow, Uttar Pradesh",
      infraScore: 70.3
    },
    {
      name: "Chennai Smart School - T Nagar",
      udiseCode: "UDISE700101",
      type: SchoolType.PRIVATE,
      district: "Chennai, Tamil Nadu",
      infraScore: 81.1
    }
  ];

  const schools = [];
  for (const school of schoolSeed) {
    const created = await prisma.school.create({ data: school });
    schools.push(created);
  }

  const geoSeed = [
    { lat: 29.3909, lon: 76.9635, block: "Karhans Block", ward: "Ward-01" },
    { lat: 29.3918, lon: 76.9821, block: "Panipat City Block", ward: "Ward-03" },
    { lat: 28.6519, lon: 77.1909, block: "Karol Bagh Block", ward: "Ward-12" },
    { lat: 12.9279, lon: 77.5834, block: "Jayanagar Block", ward: "Ward-07" },
    { lat: 23.0362, lon: 72.5492, block: "Navrangpura Block", ward: "Ward-05" },
    { lat: 22.5758, lon: 88.4326, block: "Salt Lake Block", ward: "Ward-09" },
    { lat: 26.8581, lon: 80.9422, block: "Lucknow Central Block", ward: "Ward-04" },
    { lat: 13.0418, lon: 80.2341, block: "T Nagar Block", ward: "Ward-02" }
  ];

  await Promise.all(
    schools.map((school, index) =>
      prisma.schoolGeoProfile.create({
        data: {
          schoolId: school.id,
          latitude: geoSeed[index]?.lat ?? 28 + index,
          longitude: geoSeed[index]?.lon ?? 77 + index * 0.2,
          blockName: geoSeed[index]?.block ?? `Block-${index + 1}`,
          wardName: geoSeed[index]?.ward ?? `Ward-${index + 1}`
        }
      })
    )
  );

  const adminPasswordHash = await bcrypt.hash("Admin@1234", 12);

  const [superAdmin, districtAdmin, schoolAdmin, teacher] = await prisma.$transaction([
    prisma.user.create({
      data: {
        name: "Platform Super Admin",
        email: "superadmin@swasthyasetu.in",
        passwordHash: adminPasswordHash,
        role: UserRole.SUPER_ADMIN
      }
    }),
    prisma.user.create({
      data: {
        name: "Panipat District Admin",
        email: "district.pune@swasthyasetu.in",
        passwordHash: adminPasswordHash,
        role: UserRole.DISTRICT_ADMIN
      }
    }),
    prisma.user.create({
      data: {
        name: "School Admin Panipat",
        email: "schooladmin.pune@swasthyasetu.in",
        passwordHash: adminPasswordHash,
        role: UserRole.SCHOOL_ADMIN,
        schoolId: schools[0].id
      }
    }),
    prisma.user.create({
      data: {
        name: "Teacher Panipat",
        email: "teacher.pune@swasthyasetu.in",
        passwordHash: adminPasswordHash,
        role: UserRole.TEACHER,
        schoolId: schools[0].id
      }
    }),
    
  ]);

  const studentPayload = [
    {
      schoolId: schools[0].id,
      className: "6A",
      gender: "F",
      heightCm: 134,
      weightKg: 29,
      vaccinationStatus: "COMPLETE",
      attendanceRatio: 0.93,
      riskScore: 0.31
    },
    {
      schoolId: schools[0].id,
      className: "7B",
      gender: "M",
      heightCm: 142,
      weightKg: 34,
      vaccinationStatus: "PARTIAL",
      attendanceRatio: 0.86,
      riskScore: 0.54
    },
    {
      schoolId: schools[1].id,
      className: "8A",
      gender: "F",
      heightCm: 148,
      weightKg: 43,
      vaccinationStatus: "DELAYED",
      attendanceRatio: 0.79,
      riskScore: 0.71
    },
    {
      schoolId: schools[1].id,
      className: "9C",
      gender: "M",
      heightCm: 151,
      weightKg: 49,
      vaccinationStatus: "COMPLETE",
      attendanceRatio: 0.91,
      riskScore: 0.39
    },
    {
      schoolId: schools[2].id,
      className: "10A",
      gender: "F",
      heightCm: 154,
      weightKg: 45,
      vaccinationStatus: "PARTIAL",
      attendanceRatio: 0.82,
      riskScore: 0.58
    }
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

  const parent = await prisma.user.create({
    data: {
      name: "Parent Panipat",
      email: "parent.pune@swasthyasetu.in",
      passwordHash: adminPasswordHash,
      role: UserRole.PARENT,
      schoolId: schools[0].id,
      childStudentId: students[0]?.id
    }
  });

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
    prisma.climateData.create({
      data: {
        district: "Panipat, Haryana",
        date: now,
        temperature: 40.1,
        aqi: 178,
        heatAlertFlag: true
      }
    }),
    prisma.climateData.create({
      data: {
        district: "Delhi, Delhi",
        date: now,
        temperature: 41.2,
        aqi: 232,
        heatAlertFlag: true
      }
    })
  ]);

  const districtFieldReports = [
    { district: "Panipat, Haryana", blockName: "Karhans Block", reportType: DistrictReportType.WATER, severity: 7, sourceRole: UserRole.DISTRICT_ADMIN },
    { district: "Panipat, Haryana", blockName: "Panipat City Block", reportType: DistrictReportType.VECTOR, severity: 8, sourceRole: UserRole.DISTRICT_ADMIN },
    { district: "Panipat, Haryana", blockName: "Panipat City Block", reportType: DistrictReportType.HEAT, severity: 6, sourceRole: UserRole.SCHOOL_ADMIN },
    { district: "Delhi, Delhi", blockName: "Karol Bagh Block", reportType: DistrictReportType.AIR, severity: 9, sourceRole: UserRole.DISTRICT_ADMIN },
    { district: "Ahmedabad, Gujarat", blockName: "Navrangpura Block", reportType: DistrictReportType.SANITATION, severity: 5, sourceRole: UserRole.SCHOOL_ADMIN },
    { district: "Chennai, Tamil Nadu", blockName: "T Nagar Block", reportType: DistrictReportType.HEAT, severity: 7, sourceRole: UserRole.DISTRICT_ADMIN }
  ];

  await prisma.districtFieldReport.createMany({
    data: districtFieldReports.map((item, index) => ({
      ...item,
      reportedAt: new Date(Date.now() - index * 8 * 60 * 60 * 1000)
    }))
  });

  await prisma.districtEnvironmentalAlert.createMany({
    data: [
      {
        district: "Panipat, Haryana",
        alertType: DistrictAlertType.HEAT,
        severity: 8,
        startsAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 42 * 60 * 60 * 1000),
        status: DistrictAlertStatus.ACTIVE
      },
      {
        district: "Panipat, Haryana",
        alertType: DistrictAlertType.WATER,
        severity: 6,
        startsAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: DistrictAlertStatus.WATCH
      },
      {
        district: "Delhi, Delhi",
        alertType: DistrictAlertType.AIR,
        severity: 9,
        startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
        status: DistrictAlertStatus.ACTIVE
      }
    ]
  });

  const attendanceSignalRows = Array.from({ length: 14 }, (_, dayOffset) => {
    const date = new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000);
    return [
      {
        district: "Panipat, Haryana",
        blockName: "Karhans Block",
        date,
        schoolsReporting: 2,
        attendanceDropPct: 3.5 + dayOffset * 0.1,
        symptomClusterIndex: 0.2 + dayOffset * 0.01,
        envRiskDelta: 0.15 + dayOffset * 0.005
      },
      {
        district: "Panipat, Haryana",
        blockName: "Panipat City Block",
        date,
        schoolsReporting: 3,
        attendanceDropPct: 5.4 + dayOffset * 0.12,
        symptomClusterIndex: 0.4 + dayOffset * 0.015,
        envRiskDelta: 0.28 + dayOffset * 0.006
      }
    ];
  }).flat();

  await prisma.districtAttendanceSignalDaily.createMany({
    data: attendanceSignalRows
  });

  await prisma.districtResourceRecommendation.createMany({
    data: [
      {
        district: "Panipat, Haryana",
        blockName: "Panipat City Block",
        actionType: DistrictResourceActionType.INSPECTION,
        priorityScore: 82,
        recommendedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        status: DistrictResourceStatus.RECOMMENDED,
        explanation: "Attendance decline and field vector signals indicate need for rapid preventive inspection."
      },
      {
        district: "Panipat, Haryana",
        blockName: "Karhans Block",
        actionType: DistrictResourceActionType.WATER_TESTING,
        priorityScore: 76,
        recommendedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        status: DistrictResourceStatus.RECOMMENDED,
        explanation: "Recent water-related field reports and moderate risk trend suggest priority water quality checks."
      },
      {
        district: "Panipat, Haryana",
        blockName: "Panipat City Block",
        actionType: DistrictResourceActionType.FUMIGATION,
        priorityScore: 79,
        recommendedDate: new Date(Date.now()),
        status: DistrictResourceStatus.SCHEDULED,
        explanation: "Vector exposure signal has increased over the past week; preventive fumigation is scheduled."
      }
    ]
  });

  await prisma.districtForecastMonthly.createMany({
    data: Array.from({ length: 6 }, (_, index) => {
      const month = new Date();
      month.setUTCMonth(month.getUTCMonth() + index, 1);
      return {
        district: "Panipat, Haryana",
        month,
        heatRisk: 62 + index * 3,
        vectorRisk: 48 + index * 2.5,
        airRisk: 58 + index * 2.2,
        confidence: Math.max(55, 86 - index * 5)
      };
    })
  });

  await prisma.healthCamp.createMany({
    data: [
      {
        schoolId: schools[0].id,
        campType: "ANEMIA_SCREENING",
        date: now,
        participantsCount: 180,
        createdBy: schoolAdmin.id
      },
      {
        schoolId: schools[1].id,
        campType: "VISION_DENTAL",
        date: now,
        participantsCount: 132,
        createdBy: schoolAdmin.id
      }
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
