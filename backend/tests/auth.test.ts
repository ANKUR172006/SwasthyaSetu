import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import authRoutes from "../src/routes/authRoutes";

jest.mock("../src/services/authService", () => ({
  login: jest.fn().mockResolvedValue({ accessToken: "a-token", refreshToken: "r-token" }),
  register: jest.fn().mockResolvedValue({ accessToken: "a-token", refreshToken: "r-token" }),
  getMe: jest.fn().mockResolvedValue({ id: "u1", name: "Demo" })
}));

jest.mock("../src/middleware/auth", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: "u1", role: "SUPER_ADMIN" };
    next();
  }
}));

describe("Auth routes", () => {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/auth", authRoutes);

  it("POST /auth/login returns access token", async () => {
    const response = await request(app).post("/auth/login").send({
      email: "admin@test.com",
      password: "password123"
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toBe("a-token");
  });

  it("GET /auth/me returns user", async () => {
    const response = await request(app).get("/auth/me").set("Authorization", "Bearer any");
    expect(response.status).toBe(200);
    expect(response.body.id).toBe("u1");
  });
});
