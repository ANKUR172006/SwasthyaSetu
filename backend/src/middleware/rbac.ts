import { UserRole } from "@prisma/client";
import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new ApiError(401, "Unauthorized"));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new ApiError(403, "Forbidden"));
      return;
    }

    next();
  };
};
