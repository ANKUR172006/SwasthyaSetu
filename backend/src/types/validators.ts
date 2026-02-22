import { UserRole } from "@prisma/client";
import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.nativeEnum(UserRole),
    schoolId: z.string().uuid().optional(),
    childStudentId: z.string().uuid().optional()
  }),
  params: z.object({}),
  query: z.object({})
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  }),
  params: z.object({}),
  query: z.object({})
});

export const idParamSchema = z.object({
  body: z.object({}),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({})
});

export const schoolIdParamSchema = z.object({
  body: z.object({}),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({})
});

export const schoolListSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    district: z.string().min(1).optional(),
    state: z.string().min(1).optional(),
    search: z.string().min(1).optional()
  })
});

export const districtParamSchema = z.object({
  body: z.object({}),
  params: z.object({ name: z.string().min(2) }),
  query: z.object({})
});

export const createStudentSchema = z.object({
  body: z.object({
    schoolId: z.string().uuid(),
    class: z.string().min(1).max(40),
    gender: z.string().min(1).max(20),
    heightCm: z.number().positive(),
    weightKg: z.number().positive(),
    vaccinationStatus: z.string().min(1),
    attendanceRatio: z.number().min(0).max(1).default(1)
  }),
  params: z.object({}),
  query: z.object({})
});

export const updateStudentSchema = z.object({
  body: z.object({
    class: z.string().min(1).max(40).optional(),
    gender: z.string().min(1).max(20).optional(),
    heightCm: z.number().positive().optional(),
    weightKg: z.number().positive().optional(),
    vaccinationStatus: z.string().min(1).optional(),
    attendanceRatio: z.number().min(0).max(1).optional()
  }),
  params: z.object({ id: z.string().uuid() }),
  query: z.object({})
});

export const createHealthCampSchema = z.object({
  body: z.object({
    schoolId: z.string().uuid(),
    campType: z.string().min(1).max(100),
    date: z.string().datetime(),
    participantsCount: z.number().int().nonnegative()
  }),
  params: z.object({}),
  query: z.object({})
});

export const healthCampBySchoolSchema = z.object({
  body: z.object({}),
  params: z.object({ school_id: z.string().uuid() }),
  query: z.object({})
});

export const studentListSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
    schoolId: z.string().uuid().optional()
  })
});
