import { Router } from "express";
import { UserRole } from "@prisma/client";
import * as districtController from "../controllers/districtController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { districtParamSchema } from "../types/validators";

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

export default router;
