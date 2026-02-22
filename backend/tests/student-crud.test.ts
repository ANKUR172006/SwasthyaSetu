import express from "express";
import request from "supertest";
import studentRoutes from "../src/routes/studentRoutes";

jest.mock("../src/services/studentService", () => ({
  createStudent: jest.fn().mockResolvedValue({ id: "11111111-1111-1111-1111-111111111111" }),
  getStudent: jest.fn().mockResolvedValue({ id: "11111111-1111-1111-1111-111111111111" }),
  updateStudent: jest.fn().mockResolvedValue({ id: "11111111-1111-1111-1111-111111111111", gender: "F" }),
  deleteStudent: jest.fn().mockResolvedValue({ deleted: true }),
  listStudents: jest.fn().mockResolvedValue({ data: [], pagination: {} })
}));

jest.mock("../src/middleware/auth", () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { userId: "u1", role: "SUPER_ADMIN" };
    next();
  }
}));

jest.mock("../src/middleware/rbac", () => ({
  authorize: () => (_req: any, _res: any, next: any) => next()
}));

describe("Student CRUD routes", () => {
  const app = express();
  app.use(express.json());
  app.use("/students", studentRoutes);

  const id = "11111111-1111-1111-1111-111111111111";
  const schoolId = "22222222-2222-2222-2222-222222222222";

  it("POST /students", async () => {
    const response = await request(app).post("/students").send({
      schoolId,
      class: "8A",
      gender: "F",
      heightCm: 145,
      weightKg: 40,
      vaccinationStatus: "COMPLETE",
      attendanceRatio: 0.95
    });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(id);
  });

  it("GET /students/:id", async () => {
    const response = await request(app).get(`/students/${id}`);
    expect(response.status).toBe(200);
  });

  it("PUT /students/:id", async () => {
    const response = await request(app).put(`/students/${id}`).send({ gender: "F" });
    expect(response.status).toBe(200);
  });

  it("DELETE /students/:id", async () => {
    const response = await request(app).delete(`/students/${id}`);
    expect(response.status).toBe(200);
    expect(response.body.deleted).toBe(true);
  });
});
