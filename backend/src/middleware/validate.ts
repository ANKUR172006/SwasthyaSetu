import { AnyZodObject } from "zod";
import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/apiError";

export const validate = (schema: AnyZodObject) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    if (!parsed.success) {
      next(new ApiError(400, parsed.error.errors.map((e) => e.message).join(", ")));
      return;
    }

    req.body = parsed.data.body;
    req.params = parsed.data.params;
    req.query = parsed.data.query;
    next();
  };
};
