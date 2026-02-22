import { Router } from "express";
import * as authController from "../controllers/authController";
import { validate } from "../middleware/validate";
import { authRateLimit } from "../middleware/rateLimit";
import { authenticate } from "../middleware/auth";
import { loginSchema, registerSchema } from "../types/validators";

const router = Router();

router.post("/login", authRateLimit, validate(loginSchema), authController.login);
router.post("/register", authRateLimit, validate(registerSchema), authController.register);
router.post("/refresh", authController.refresh);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.me);

export default router;
