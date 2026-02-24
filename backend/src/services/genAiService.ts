import { env } from "../config/env";
import { logger } from "../config/logger";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";

export const SUPPORTED_MESSAGE_LANGUAGES = [
  "en",
  "hi",
  "mr",
  "bn",
  "ta",
  "te",
  "kn",
  "ml",
  "gu",
  "pa",
  "ur"
] as const;

export type MessageLanguage = (typeof SUPPORTED_MESSAGE_LANGUAGES)[number];
export type ReadingLevel = "simple" | "standard";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

const toneByRisk: Record<RiskLevel, string> = {
  LOW: "reassuring and brief",
  MEDIUM: "clear and action-oriented",
  HIGH: "urgent, calm, and actionable"
};

const languageLabel: Record<MessageLanguage, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
  bn: "Bengali",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  gu: "Gujarati",
  pa: "Punjabi",
  ur: "Urdu"
};

const buildParentTemplate = (params: {
  studentName: string;
  riskLevel: RiskLevel;
  condition?: string;
  language: MessageLanguage;
  readingLevel: ReadingLevel;
}) => {
  const conditionText = params.condition ? ` (${params.condition})` : "";
  const urgencyEn = params.riskLevel === "HIGH" ? "urgent" : params.riskLevel === "MEDIUM" ? "timely" : "routine";

  if (params.language === "en") {
    if (params.readingLevel === "simple") {
      return `Health update: ${params.studentName}${conditionText}. Please call the school health desk today for ${urgencyEn} follow-up.`;
    }
    return `Hello, health update for ${params.studentName}${conditionText}. Please contact the school health desk for ${urgencyEn} follow-up.`;
  }

  if (params.language === "hi") {
    const urgency = params.riskLevel === "HIGH" ? "turant" : params.riskLevel === "MEDIUM" ? "jaldi" : "niyamit";
    if (params.readingLevel === "simple") {
      return `Namaste. ${params.studentName}${conditionText} health update. Kripya ${urgency} school health desk se sampark karein.`;
    }
    return `Namaste, ${params.studentName} ke health update${conditionText} ke anusaar ${urgency} school health desk se sampark karein. Dhanyavaad.`;
  }

  const prefix = params.readingLevel === "simple" ? "Simple message" : "Message";
  return `${prefix} (${languageLabel[params.language]}): Health update for ${params.studentName}${conditionText}. Please contact school health desk for ${urgencyEn} follow-up.`;
};

const chatCompletion = async (systemPrompt: string, userPrompt: string): Promise<string | null> => {
  if (!env.LLM_API_KEY) {
    return null;
  }

  try {
    const endpoint = `${env.LLM_BASE_URL.replace(/\/+$/, "")}/chat/completions`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.LLM_API_KEY}`
      },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        temperature: 0.2,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const body = await response.text();
      logger.warn({ status: response.status, body }, "LLM response non-2xx. Falling back.");
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch (error) {
    logger.warn({ error }, "LLM request failed. Falling back.");
    return null;
  }
};

export const generateParentMessage = async (input: {
  studentName: string;
  riskLevel: RiskLevel;
  condition?: string;
  language?: MessageLanguage;
  readingLevel?: ReadingLevel;
}) => {
  const language = input.language ?? "en";
  const readingLevel = input.readingLevel ?? "simple";
  const template = buildParentTemplate({
    studentName: input.studentName,
    riskLevel: input.riskLevel,
    condition: input.condition,
    language,
    readingLevel
  });

  const systemPrompt =
    "You generate concise parent communication for school health updates. Never provide diagnosis. Give safe follow-up guidance only.";
  const userPrompt = `Write one SMS under 220 characters in ${languageLabel[language]} for parent of ${input.studentName}. Reading level: ${readingLevel}. Risk level: ${input.riskLevel}. Tone: ${toneByRisk[input.riskLevel]}. Optional condition: ${input.condition ?? "N/A"}. Include one clear school follow-up call-to-action.`;
  const llmMessage = await chatCompletion(systemPrompt, userPrompt);

  return {
    message: llmMessage ?? template,
    source: llmMessage ? "llm" : "template",
    model: llmMessage ? env.LLM_MODEL : "template-v2",
    language,
    readingLevel
  };
};

export const generateSchoolSummary = async (input: {
  schoolId: string;
  audience: "SCHOOL_ADMIN" | "DISTRICT_ADMIN";
  language?: MessageLanguage;
}) => {
  const school = await prisma.school.findUnique({
    where: { id: input.schoolId },
    select: { id: true, name: true, district: true }
  });
  if (!school) {
    throw new ApiError(404, "School not found");
  }

  const [totalStudents, avgRisk, highRiskCount, recentCampCount] = await Promise.all([
    prisma.student.count({ where: { schoolId: school.id } }),
    prisma.student.aggregate({ where: { schoolId: school.id }, _avg: { riskScore: true } }),
    prisma.student.count({ where: { schoolId: school.id, riskScore: { gte: 0.7 } } }),
    prisma.healthCamp.count({
      where: {
        schoolId: school.id,
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
      }
    })
  ]);

  const avgRiskValue = Number((avgRisk._avg.riskScore ?? 0).toFixed(2));
  const language = input.language ?? "en";
  const baseSummary = `${school.name}: ${totalStudents} students, average risk ${avgRiskValue}, ${highRiskCount} high-risk students, ${recentCampCount} health camps in the last 30 days.`;

  const systemPrompt = "You generate short, actionable school health summaries for administrators. Keep to 3 bullet points max.";
  const userPrompt = `Audience: ${input.audience}. Language: ${languageLabel[language]}. Data: school=${school.name}, district=${school.district}, students=${totalStudents}, avgRisk=${avgRiskValue}, highRisk=${highRiskCount}, camps30d=${recentCampCount}. Return concise summary with priorities and one next action.`;
  const llmSummary = await chatCompletion(systemPrompt, userPrompt);

  return {
    summary: llmSummary ?? baseSummary,
    source: llmSummary ? "llm" : "template",
    model: llmSummary ? env.LLM_MODEL : "template-v2",
    metrics: {
      schoolId: school.id,
      schoolName: school.name,
      district: school.district,
      totalStudents,
      avgRisk: avgRiskValue,
      highRiskCount,
      recentCampCount
    }
  };
};
