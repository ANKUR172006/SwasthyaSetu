import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { genAiParentMessageSchema, genAiSchoolSummarySchema } from "../types/validators";
import * as genAiController from "../controllers/genAiController";

const router = Router();

router.use(authenticate);

router.post(
  "/parent-message",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(genAiParentMessageSchema),
  genAiController.parentMessage
);

router.post(
  "/school-summary",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(genAiSchoolSummarySchema),
  genAiController.schoolSummary
);

export default router;
