import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { ApiError } from "../utils/apiError";

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    next(new ApiError(401, "Unauthorized"));
    return;
  }

  try {
    const token = authHeader.split(" ")[1];
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      role: payload.role as Express.UserPayload["role"],
      schoolId: payload.schoolId
    };
    next();
  } catch {
    next(new ApiError(401, "Unauthorized"));
  }
};
