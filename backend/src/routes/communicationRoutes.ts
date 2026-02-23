import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { communicationListSchema, communicationParentAlertSchema } from "../types/validators";
import * as communicationController from "../controllers/communicationController";

const router = Router();

router.use(authenticate);

router.post(
  "/parent-alert",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(communicationParentAlertSchema),
  communicationController.sendParentAlert
);

router.get(
  "/parent-alert",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(communicationListSchema),
  communicationController.listParentAlerts
);

export default router;
