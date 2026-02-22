import { Router } from "express";
import { UserRole } from "@prisma/client";
import * as studentController from "../controllers/studentController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
  createStudentSchema,
  idParamSchema,
  studentListSchema,
  updateStudentSchema
} from "../types/validators";
import { audit } from "../middleware/audit";

const router = Router();

router.use(authenticate);

router.post(
  "/",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(createStudentSchema),
  audit("CREATE", "student"),
  studentController.createStudent
);
router.get(
  "/my-child",
  authorize(UserRole.PARENT),
  studentController.getMyChild
);
router.get(
  "/:id",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(idParamSchema),
  studentController.getStudent
);
router.put(
  "/:id",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(updateStudentSchema),
  audit("UPDATE", "student"),
  studentController.updateStudent
);
router.delete(
  "/:id",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN),
  validate(idParamSchema),
  audit("DELETE", "student"),
  studentController.deleteStudent
);
router.get(
  "/",
  authorize(UserRole.SUPER_ADMIN, UserRole.DISTRICT_ADMIN, UserRole.SCHOOL_ADMIN, UserRole.TEACHER),
  validate(studentListSchema),
  studentController.listStudents
);

export default router;
