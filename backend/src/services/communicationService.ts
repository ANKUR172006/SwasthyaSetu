import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { generateParentMessage } from "./genAiService";
import { logger } from "../config/logger";

type ParentAlertInput = {
  phone: string;
  studentName: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  condition?: string;
  language?: "en" | "hi" | "mr" | "bn" | "ta" | "te" | "kn" | "ml" | "gu" | "pa" | "ur";
  readingLevel?: "simple" | "standard";
  message?: string;
};

const isTwilioConfigured = (): boolean =>
  Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER);

const normalizePhone = (value: string): string => {
  const digits = String(value || "").replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  return digits.startsWith("91") ? `+${digits}` : `+91${digits}`;
};

const sendViaTwilio = async (to: string, body: string) => {
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`;
  const form = new URLSearchParams({
    To: to,
    From: String(env.TWILIO_FROM_NUMBER),
    Body: body
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: form.toString()
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Twilio send failed (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as { sid?: string; status?: string };
  return {
    providerMessageId: payload.sid ?? null,
    providerStatus: payload.status ?? "queued"
  };
};

export const sendParentAlert = async (
  payload: ParentAlertInput,
  actor: { userId?: string; ip?: string }
) => {
  const phone = normalizePhone(payload.phone);
  const drafted = payload.message
    ? { message: payload.message, source: "manual", model: "manual-v1" }
      : await generateParentMessage({
        studentName: payload.studentName,
        riskLevel: payload.riskLevel,
        condition: payload.condition,
        language: payload.language,
        readingLevel: payload.readingLevel
      });

  let status: "sent" | "simulated" = "simulated";
  let provider: "twilio" | "simulated" = "simulated";
  let providerMessageId: string | null = null;
  let providerStatus = "simulated";

  if (isTwilioConfigured()) {
    try {
      const twilio = await sendViaTwilio(phone, drafted.message);
      status = "sent";
      provider = "twilio";
      providerMessageId = twilio.providerMessageId;
      providerStatus = twilio.providerStatus;
    } catch (error) {
      logger.warn({ error }, "Twilio provider failed, falling back to simulated send.");
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: actor.userId,
      action: "SEND",
      resource: "parent_alert",
      ip: actor.ip,
      metadata: {
        phoneLast4: phone.slice(-4),
        studentName: payload.studentName,
        riskLevel: payload.riskLevel,
        language: payload.language ?? "en",
        readingLevel: payload.readingLevel ?? "simple",
        messagePreview: drafted.message.slice(0, 140),
        status,
        provider,
        providerStatus,
        providerMessageId,
        source: drafted.source
      }
    }
  });

  return {
    status,
    provider,
    providerStatus,
    providerMessageId,
    message: drafted.message,
    source: drafted.source,
    model: drafted.model
  };
};

export const listParentAlertLogs = async (limit: number) => {
  const rows = await prisma.auditLog.findMany({
    where: { resource: "parent_alert" },
    orderBy: { createdAt: "desc" },
    take: limit
  });

  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    userId: row.userId,
    metadata: row.metadata
  }));
};
