import { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import { logger } from "../config/logger";

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new ApiError(404, "Route not found"));
};

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err instanceof ApiError ? err.statusCode : 500;
  const requestId = (req as Request & { id?: string }).id;
  if (statusCode >= 500) {
    logger.error(
      {
        err,
        requestId,
        method: req.method,
        path: req.path
      },
      "Unhandled API error"
    );
  }

  res.status(statusCode).json({
    error: err.message,
    statusCode,
    requestId
  });
};
