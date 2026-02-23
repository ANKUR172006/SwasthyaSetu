import { Router } from "express";
import { validate } from "../middleware/validate";
import { clientErrorSchema } from "../types/validators";
import { collectClientError } from "../controllers/clientErrorController";

const router = Router();

router.post("/", validate(clientErrorSchema), collectClientError);

export default router;
