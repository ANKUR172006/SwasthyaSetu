import { Request, Response, NextFunction } from "express";
import * as studentService from "../services/studentService";
import { ApiError } from "../utils/apiError";

export const createStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await studentService.createStudent(req.body);
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
};

export const getStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = await studentService.getStudent(String(req.params.id), req.user);
    res.json(student);
  } catch (error) {
    next(error);
  }
};

export const getMyChild = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }
    const student = await studentService.getMyChild(req.user.userId);
    res.json(student);
  } catch (error) {
    next(error);
  }
};

export const updateStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await studentService.updateStudent(String(req.params.id), req.body);
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const deleteStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await studentService.deleteStudent(String(req.params.id));
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const listStudents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Number(req.query.page ?? 1);
    const pageSize = Number(req.query.pageSize ?? 20);
    const schoolId = req.query.schoolId as string | undefined;
    const result = await studentService.listStudents(page, pageSize, schoolId);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

