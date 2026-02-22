import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface UserPayload {
      userId: string;
      role: UserRole;
      schoolId?: string | null;
    }

    interface Request {
      user?: UserPayload;
    }
  }
}

export {};
