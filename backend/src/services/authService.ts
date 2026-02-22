import crypto from "crypto";
import { UserRole } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { ApiError } from "../utils/apiError";
import { comparePassword, hashPassword } from "../utils/password";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/jwt";

const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");

const refreshExpiryDate = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + env.JWT_REFRESH_EXPIRES_DAYS);
  return date;
};

export const register = async (payload: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  schoolId?: string;
  childStudentId?: string;
}) => {
  const existing = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
  if (existing) {
    throw new ApiError(409, "Email already registered");
  }

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email.toLowerCase(),
      passwordHash: await hashPassword(payload.password),
      role: payload.role,
      schoolId: payload.schoolId,
      childStudentId: payload.childStudentId
    }
  });

  return issueSession(user.id, user.role, user.schoolId);
};

export const login = async (email: string, password: string) => {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw new ApiError(401, "Invalid credentials");
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid credentials");
  }

  return issueSession(user.id, user.role, user.schoolId);
};

export const issueSession = async (userId: string, role: UserRole, schoolId?: string | null) => {
  const accessToken = signAccessToken({ userId, role, schoolId });
  const refreshToken = signRefreshToken({ userId });

  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(refreshToken),
      expiresAt: refreshExpiryDate()
    }
  });

  return { accessToken, refreshToken };
};

export const rotateRefreshToken = async (refreshToken: string) => {
  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);

  const existing = await prisma.refreshToken.findFirst({
    where: {
      userId: payload.userId,
      tokenHash,
      revoked: false,
      expiresAt: { gt: new Date() }
    }
  });

  if (!existing) {
    throw new ApiError(401, "Invalid refresh token");
  }

  await prisma.refreshToken.update({ where: { id: existing.id }, data: { revoked: true } });

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    throw new ApiError(401, "Invalid refresh token");
  }

  return issueSession(user.id, user.role, user.schoolId);
};

export const logout = async (refreshToken: string) => {
  const tokenHash = hashToken(refreshToken);
  await prisma.refreshToken.updateMany({ where: { tokenHash }, data: { revoked: true } });
};

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      schoolId: true,
      childStudentId: true,
      createdAt: true
    }
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return user;
};
