import { env } from "./env";
import { logger } from "./logger";

const looksLikePlaceholder = (value: string): boolean =>
  /replace_with|changeme|example|your_/i.test(value);

const splitCsv = (value: string): string[] =>
  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

export const runStartupChecks = (): void => {
  if (looksLikePlaceholder(env.JWT_ACCESS_SECRET) || looksLikePlaceholder(env.JWT_REFRESH_SECRET)) {
    throw new Error("JWT secrets are placeholders. Set strong production secrets.");
  }

  if (env.NODE_ENV === "production") {
    const corsEntries = splitCsv(env.CORS_ORIGIN);
    if (corsEntries.some((entry) => /localhost|127\.0\.0\.1/i.test(entry))) {
      throw new Error("CORS_ORIGIN contains localhost in production.");
    }
  }

  if (!env.FIELD_ENCRYPTION_KEY) {
    logger.warn("FIELD_ENCRYPTION_KEY is not set. Sensitive field encryption stays disabled.");
  }

  if (env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/i.test(env.AI_SERVICE_URL)) {
    logger.warn({ aiServiceUrl: env.AI_SERVICE_URL }, "AI_SERVICE_URL points to localhost in production.");
  }

  if (!env.LLM_API_KEY) {
    logger.warn("LLM_API_KEY is not set. GenAI endpoints will use fallback templates.");
  }

  if (env.TWILIO_ACCOUNT_SID && (!env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM_NUMBER)) {
    logger.warn("TWILIO_ACCOUNT_SID is set but TWILIO_AUTH_TOKEN or TWILIO_FROM_NUMBER is missing.");
  }
};
