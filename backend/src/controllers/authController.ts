import { Request, Response, NextFunction } from "express";
import * as authService from "../services/authService";
import { ApiError } from "../utils/apiError";

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = await authService.register(req.body);
    res.cookie("refreshToken", session.refreshToken, refreshCookieOptions);
    res.status(201).json({ accessToken: session.accessToken });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const session = await authService.login(email, password);
    res.cookie("refreshToken", session.refreshToken, refreshCookieOptions);
    res.json({ accessToken: session.accessToken });
  } catch (error) {
    next(error);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, "Unauthorized");
    }

    const user = await authService.getMe(req.user.userId);
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.refreshToken as string | undefined;
    if (!token) {
      throw new ApiError(401, "Refresh token missing");
    }

    const session = await authService.rotateRefreshToken(token);
    res.cookie("refreshToken", session.refreshToken, refreshCookieOptions);
    res.json({ accessToken: session.accessToken });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.cookies.refreshToken as string | undefined;
    if (token) {
      await authService.logout(token);
    }
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/"
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
