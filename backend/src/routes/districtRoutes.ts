import { Router } from "express";
import { UserRole } from "@prisma/client";
import * as districtController from "../controllers/districtController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
  districtAdminComplianceDownloadSchema,
  districtAdminComplianceGenerateSchema,
  districtAdminGeoHotspotsSchema,
  districtAdminOutbreakSchema,
  districtAdminResourceAllocationSchema,
  districtAdminScenarioSimulationSchema,
  districtAdminSeasonalForecastSchema,
  superAdminPolicySimulationSchema,
  districtParamSchema
} from "../types/validators";

const router = Router();

router.use(authenticate);

router.get(
  "/:name/comparison",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(districtParamSchema),
  districtController.comparison
);
router.get(
  "/:name/climate-risk",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(districtParamSchema),
  districtController.climateRisk
);
router.get(
  "/:name/top-risk-schools",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(districtParamSchema),
  districtController.topRiskSchools
);
router.get(
  "/:name/admin/risk-overview",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN),
  validate(districtParamSchema),
  districtController.adminRiskOverview
);
router.get(
  "/:name/admin/geo-hotspots",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN),
  validate(districtAdminGeoHotspotsSchema),
  districtController.adminGeoHotspots
);
router.get(
  "/:name/admin/outbreak-signals",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN),
  validate(districtAdminOutbreakSchema),
  districtController.adminOutbreakSignals
);
router.get(
  "/:name/admin/resource-allocation",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN),
  validate(districtAdminResourceAllocationSchema),
  districtController.adminResourceAllocation
);
router.get(
  "/:name/admin/seasonal-forecast",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN),
  validate(districtAdminSeasonalForecastSchema),
  districtController.adminSeasonalForecast
);
router.post(
  "/:name/admin/compliance-report/generate",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN),
  validate(districtAdminComplianceGenerateSchema),
  districtController.adminComplianceReportGenerate
);
router.post(
  "/:name/admin/scenario-simulation",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN),
  validate(districtAdminScenarioSimulationSchema),
  districtController.adminScenarioSimulation
);
router.get(
  "/:name/admin/compliance-report/:reportId/download",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN),
  validate(districtAdminComplianceDownloadSchema),
  districtController.adminComplianceReportDownload
);
router.get(
  "/:name/super-admin/national-overview",
  authorize(UserRole.SUPER_ADMIN),
  validate(districtParamSchema),
  districtController.superAdminNationalOverview
);
router.get(
  "/:name/super-admin/climate-impact-trends",
  authorize(UserRole.SUPER_ADMIN),
  validate(districtParamSchema),
  districtController.superAdminClimateImpactTrends
);
router.get(
  "/:name/super-admin/resource-optimization",
  authorize(UserRole.SUPER_ADMIN),
  validate(districtAdminResourceAllocationSchema),
  districtController.superAdminResourceOptimization
);
router.post(
  "/:name/super-admin/policy-simulation",
  authorize(UserRole.SUPER_ADMIN),
  validate(superAdminPolicySimulationSchema),
  districtController.superAdminPolicySimulation
);
router.get(
  "/:name/super-admin/fraud-anomalies",
  authorize(UserRole.SUPER_ADMIN),
  validate(districtParamSchema),
  districtController.superAdminFraudAnomalies
);

export default router;
