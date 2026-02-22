import cron from "node-cron";
import { logger } from "../config/logger";
import { ingestSimulatedClimateData } from "../services/climateService";
import { recalculateAllStudentRisk } from "../services/riskService";

export const scheduleBackgroundJobs = () => {
  cron.schedule("0 */6 * * *", async () => {
    logger.info("Running 6-hour climate ingestion and risk recalculation job");
    try {
      await ingestSimulatedClimateData();
      await recalculateAllStudentRisk();
      logger.info("Background job completed");
    } catch (error) {
      logger.error(error, "Background job failed");
    }
  });
};
