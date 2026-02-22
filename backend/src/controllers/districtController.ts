import { Request, Response, NextFunction } from "express";
import * as districtService from "../services/districtService";

export const comparison = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await districtService.districtComparison(String(req.params.name));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const climateRisk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await districtService.districtClimateRisk(String(req.params.name));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const topRiskSchools = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await districtService.districtTopRiskSchools(String(req.params.name));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

