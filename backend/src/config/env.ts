import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().default(7),
  REDIS_URL: z.string().min(1),
  AI_SERVICE_URL: z.string().url().default("http://ai-service:8000"),
  CORS_ORIGIN: z.string().default("*"),
  FIELD_ENCRYPTION_KEY: z.string().optional(),
  UDISE_CSV_PATH: z.string().optional()
});

export const env = envSchema.parse(process.env);
