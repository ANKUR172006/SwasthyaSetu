import { Request, Response, NextFunction } from "express";
import { logger } from "../config/logger";

export const collectClientError = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestId = (req as Request & { id?: string }).id;
    const { source, level, message, details, path } = req.body;
    const logFn = level === "info" ? logger.info.bind(logger) : level === "warn" ? logger.warn.bind(logger) : logger.error.bind(logger);
    logFn(
      {
        requestId,
        source,
        path,
        details,
        userAgent: req.headers["user-agent"]
      },
      message
    );
    res.status(202).json({ accepted: true });
  } catch (error) {
    next(error);
  }
};
