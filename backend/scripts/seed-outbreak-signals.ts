import "dotenv/config";
import {
  DistrictAlertStatus,
  DistrictAlertType,
  DistrictReportType,
  DistrictResourceActionType,
  DistrictResourceStatus,
  PrismaClient,
  UserRole
} from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_DISTRICT = "Panipat, Haryana";

const now = new Date();
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 60 * 60 * 1000);

async function main() {
  const district = process.argv[2] || DEFAULT_DISTRICT;

  const geoProfiles = await prisma.schoolGeoProfile.findMany({
    where: {
      school: {
        district: {
          contains: district.split(",")[0],
          mode: "insensitive"
        }
      }
    },
    select: {
      blockName: true
    }
  });

  const blocks = [...new Set(geoProfiles.map((g) => g.blockName))];
  if (blocks.length === 0) {
    throw new Error(`No school geo profiles found for district: ${district}`);
  }

  const focusBlocks = blocks.slice(0, Math.min(3, blocks.length));

  // 1) Field reports: amplify water/vector/heat signals.
  await prisma.districtFieldReport.createMany({
    data: focusBlocks.flatMap((block, idx) => [
      {
        district,
        blockName: block,
        reportType: DistrictReportType.WATER,
        severity: 7 + (idx % 2),
        sourceRole: UserRole.TEACHER,
        reportedAt: daysAgo(0)
      },
      {
        district,
        blockName: block,
        reportType: DistrictReportType.VECTOR,
        severity: 8,
        sourceRole: UserRole.DISTRICT_ADMIN,
        reportedAt: daysAgo(1)
      },
      {
        district,
        blockName: block,
        reportType: DistrictReportType.HEAT,
        severity: 6 + idx,
        sourceRole: UserRole.SCHOOL_ADMIN,
        reportedAt: daysAgo(2)
      }
    ])
  });

  // 2) Attendance + symptom + env delta: trigger outbreak triad.
  const attendanceRows = focusBlocks.flatMap((block, blockIdx) =>
    Array.from({ length: 7 }, (_, day) => ({
      district,
      blockName: block,
      date: daysAgo(day),
      schoolsReporting: 3 + (blockIdx % 2),
      attendanceDropPct: 6.2 + day * 0.25,
      symptomClusterIndex: 0.48 + day * 0.02,
      envRiskDelta: 0.33 + day * 0.015
    }))
  );

  await prisma.districtAttendanceSignalDaily.createMany({ data: attendanceRows });

  // 3) Active environmental alerts.
  await prisma.districtEnvironmentalAlert.createMany({
    data: [
      {
        district,
        alertType: DistrictAlertType.HEAT,
        severity: 8,
        startsAt: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() + 36 * 60 * 60 * 1000),
        status: DistrictAlertStatus.ACTIVE
      },
      {
        district,
        alertType: DistrictAlertType.WATER,
        severity: 7,
        startsAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() + 48 * 60 * 60 * 1000),
        status: DistrictAlertStatus.ACTIVE
      },
      {
        district,
        alertType: DistrictAlertType.VECTOR,
        severity: 8,
        startsAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
        endsAt: new Date(now.getTime() + 72 * 60 * 60 * 1000),
        status: DistrictAlertStatus.ACTIVE
      }
    ]
  });

  // 4) Add a few high-priority operational recommendations.
  await prisma.districtResourceRecommendation.createMany({
    data: focusBlocks.map((block, idx) => ({
      district,
      blockName: block,
      actionType:
        idx % 3 === 0
          ? DistrictResourceActionType.INSPECTION
          : idx % 3 === 1
            ? DistrictResourceActionType.WATER_TESTING
            : DistrictResourceActionType.FUMIGATION,
      priorityScore: 82 - idx * 3,
      recommendedDate: new Date(now.getTime() - idx * 24 * 60 * 60 * 1000),
      status: DistrictResourceStatus.RECOMMENDED,
      explanation:
        "Auto-seeded high-signal recommendation for outbreak prevention and rapid response planning."
    }))
  });

  // 5) Push near-term climate stress records for trend modules.
  await prisma.climateData.createMany({
    data: Array.from({ length: 7 }, (_, i) => ({
      district,
      date: daysAgo(i),
      temperature: 39 + (i % 3),
      aqi: 162 + i * 3,
      heatAlertFlag: true
    }))
  });

  console.log(`Injected outbreak activation data for district: ${district}`);
  console.log(`Blocks: ${focusBlocks.join(", ")}`);
  console.log("Suggested UI checks:");
  console.log("- District Admin > Early Outbreak Signal Detection");
  console.log("- District Admin > Geo Heatmap and Resource Allocation");
  console.log("- Super Admin > National Overview and Outbreak Engine");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
