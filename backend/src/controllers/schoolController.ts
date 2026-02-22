import { Request, Response, NextFunction } from "express";
import * as schoolService from "../services/schoolService";

export const listSchools = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const district = typeof req.query.district === "string" ? req.query.district : undefined;
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const data = await schoolService.listSchools({ page, pageSize, district, state, search });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const schoolSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await schoolService.getSchoolSummary(String(req.params.id));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const schoolHealthRisk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await schoolService.getSchoolHealthRisk(String(req.params.id));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const schoolSchemeCoverage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await schoolService.getSchoolSchemeCoverage(String(req.params.id));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

