import { Request, Response, NextFunction } from "express";
import * as healthCampService from "../services/healthCampService";
import { ApiError } from "../utils/apiError";

export const createHealthCamp = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    const created = await healthCampService.createHealthCamp({
      ...req.body,
      createdBy: req.user.userId
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

export const listHealthCampBySchool = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await healthCampService.listHealthCampsBySchool(String(req.params.school_id));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

