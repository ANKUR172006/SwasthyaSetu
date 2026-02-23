import { Request, Response, NextFunction } from "express";
import * as communicationService from "../services/communicationService";
import { ApiError } from "../utils/apiError";

export const sendParentAlert = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }
    const data = await communicationService.sendParentAlert(req.body, {
      userId: req.user.userId,
      ip: req.ip
    });
    res.status(202).json(data);
  } catch (error) {
    next(error);
  }
};

export const listParentAlerts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Number(req.query.limit ?? 20);
    const data = await communicationService.listParentAlertLogs(limit);
    res.json(data);
  } catch (error) {
    next(error);
  }
};
