import { Router } from "express";
import * as schoolController from "../controllers/schoolController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { UserRole } from "@prisma/client";
import { validate } from "../middleware/validate";
import { schoolIdParamSchema, schoolListSchema } from "../types/validators";

const router = Router();

router.use(authenticate);
router.get(
  "/",
  authorize(
    UserRole.SUPER_ADMIN,
    UserRole.DISTRICT_ADMIN,
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.PARENT
  ),
  validate(schoolListSchema),
  schoolController.listSchools
);
router.get(
  "/:id/summary",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(schoolIdParamSchema),
  schoolController.schoolSummary
);
router.get(
  "/:id/health-risk",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(schoolIdParamSchema),
  schoolController.schoolHealthRisk
);
router.get(
  "/:id/scheme-coverage",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(schoolIdParamSchema),
  schoolController.schoolSchemeCoverage
);

export default router;
