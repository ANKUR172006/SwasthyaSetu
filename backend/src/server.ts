import { app } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { redis } from "./config/redis";
import { logger } from "./config/logger";
import { scheduleBackgroundJobs } from "./jobs/scheduler";
import { syncSchoolDirectoryData } from "./services/ingestionService";

const bootstrap = async () => {
  try {
    await prisma.$connect();
    await redis.ping();
    await syncSchoolDirectoryData(env.UDISE_CSV_PATH);
    scheduleBackgroundJobs();

    app.listen(env.PORT, () => {
      logger.info(`Backend running on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error(error, "Failed to boot service");
    process.exit(1);
  }
};

void bootstrap();
