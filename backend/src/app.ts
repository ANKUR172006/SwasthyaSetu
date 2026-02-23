import "./types/express";
import express from "express";
import helmet from "helmet";
import cors, { CorsOptions } from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { apiRateLimit } from "./middleware/rateLimit";
import { errorHandler, notFoundHandler } from "./middleware/error";
import authRoutes from "./routes/authRoutes";
import schoolRoutes from "./routes/schoolRoutes";
import studentRoutes from "./routes/studentRoutes";
import districtRoutes from "./routes/districtRoutes";
import healthCampRoutes from "./routes/healthCampRoutes";
import clientErrorRoutes from "./routes/clientErrorRoutes";
import { getRiskTelemetry } from "./services/riskTelemetry";

export const app = express();

const splitAllowedOrigins = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const allowedOrigins = splitAllowedOrigins(env.CORS_ORIGIN);
const allowAllOrigins = allowedOrigins.includes("*");

const buildCorsOriginMatcher = (): CorsOptions["origin"] => {
  if (allowAllOrigins || allowedOrigins.length === 0) {
    return true;
  }

  const fullOrigins = new Set<string>();
  const hostnames = new Set<string>();
  for (const entry of allowedOrigins) {
    if (/^https?:\/\//i.test(entry)) {
      fullOrigins.add(entry.toLowerCase());
      continue;
    }
    hostnames.add(entry.toLowerCase());
  }

  return (requestOrigin, callback) => {
    if (!requestOrigin) {
      callback(null, true);
      return;
    }

    try {
      const parsed = new URL(requestOrigin);
      const origin = parsed.origin.toLowerCase();
      const hostname = parsed.hostname.toLowerCase();
      if (fullOrigins.has(origin) || hostnames.has(hostname)) {
        callback(null, true);
        return;
      }
    } catch {
      // invalid origin string
    }

    callback(new Error("CORS origin not allowed"));
  };
};

app.use(helmet());
app.use(
  cors({
    origin: buildCorsOriginMatcher(),
    credentials: true
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    genReqId: (req, res) => {
      const headerRequestId = req.headers["x-request-id"];
      const requestId =
        typeof headerRequestId === "string" && headerRequestId.trim().length > 0
          ? headerRequestId.trim()
          : randomUUID();
      res.setHeader("X-Request-Id", requestId);
      return requestId;
    }
  })
);
app.use(apiRateLimit);

app.get("/", (_req, res) => res.json({ name: "SwasthyaSetu API", status: "ok" }));
app.get("/health", (_req, res) =>
  res.json({
    status: "ok",
    aiReliability: getRiskTelemetry()
  })
);

app.use("/client-errors", clientErrorRoutes);
app.use("/auth", authRoutes);
app.use("/schools", schoolRoutes);
app.use("/students", studentRoutes);
app.use("/district", districtRoutes);
app.use("/health-camp", healthCampRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
