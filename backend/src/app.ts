import "./types/express";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { apiRateLimit } from "./middleware/rateLimit";
import { errorHandler, notFoundHandler } from "./middleware/error";
import authRoutes from "./routes/authRoutes";
import schoolRoutes from "./routes/schoolRoutes";
import studentRoutes from "./routes/studentRoutes";
import districtRoutes from "./routes/districtRoutes";
import healthCampRoutes from "./routes/healthCampRoutes";
import { getRiskTelemetry } from "./services/riskTelemetry";

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(pinoHttp({ logger }));
app.use(apiRateLimit);

app.get("/", (_req, res) => res.json({ name: "SwasthyaSetu API", status: "ok" }));
app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    aiReliability: getRiskTelemetry()
  })
);

app.use("/auth", authRoutes);
app.use("/schools", schoolRoutes);
app.use("/students", studentRoutes);
app.use("/district", districtRoutes);
app.use("/health-camp", healthCampRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
