import { NextFunction, Request, Response } from "express";
import { prisma } from "../config/prisma";

export const audit = (action: string, resource: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    res.on("finish", () => {
      if (res.statusCode < 400) {
        void prisma.auditLog.create({
          data: {
            userId: req.user?.userId,
            action,
            resource,
            ip: req.ip,
            metadata: {
              params: req.params,
              method: req.method
            }
          }
        });
      }
    });

    next();
  };
};
