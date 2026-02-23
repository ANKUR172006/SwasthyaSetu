import { Request, Response, NextFunction } from "express";
import * as genAiService from "../services/genAiService";

export const parentMessage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await genAiService.generateParentMessage(req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const schoolSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await genAiService.generateSchoolSummary(req.body);
    res.json(data);
  } catch (error) {
    next(error);
  }
};
