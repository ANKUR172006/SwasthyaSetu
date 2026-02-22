import { Router } from "express";
import { UserRole } from "@prisma/client";
import * as healthCampController from "../controllers/healthCampController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { createHealthCampSchema, healthCampBySchoolSchema } from "../types/validators";
import { audit } from "../middleware/audit";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(createHealthCampSchema),
  audit("CREATE", "health_camp"),
  healthCampController.createHealthCamp
);
router.get(
  "/:school_id",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(healthCampBySchoolSchema),
  healthCampController.listHealthCampBySchool
);

export default router;
