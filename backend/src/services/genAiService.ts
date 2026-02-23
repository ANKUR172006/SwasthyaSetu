import { env } from "../config/env";
import { logger } from "../config/logger";
import { prisma } from "../config/prisma";
import { ApiError } from "../utils/apiError";

type MessageLanguage = "en" | "hi";
type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

const toneByRisk: Record<RiskLevel, string> = {
  LOW: "reassuring and brief",
  MEDIUM: "clear and action-oriented",
  HIGH: "urgent, calm, and actionable"
};

const buildParentTemplate = (params: {
  studentName: string;
  riskLevel: RiskLevel;
  condition?: string;
  language: MessageLanguage;
}) => {
  const conditionText = params.condition ? ` (${params.condition})` : "";
  if (params.language === "hi") {
    const urgency = params.riskLevel === "HIGH" ? "तुरंत" : params.riskLevel === "MEDIUM" ? "जल्द" : "नियमित";
    return `नमस्ते, ${params.studentName} के स्वास्थ्य अपडेट${conditionText} के अनुसार ${urgency} स्कूल हेल्थ डेस्क से संपर्क करें। धन्यवाद।`;
  }
  const urgency = params.riskLevel === "HIGH" ? "urgent" : params.riskLevel === "MEDIUM" ? "timely" : "routine";
  return `Hello, health update for ${params.studentName}${conditionText}. Please contact the school health desk for ${urgency} follow-up.`;
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
}) => {
  const language = input.language ?? "en";
  const template = buildParentTemplate({
    studentName: input.studentName,
    riskLevel: input.riskLevel,
    condition: input.condition,
    language
  });

  const systemPrompt = "You generate concise parent communication for school health updates. Never provide diagnosis. Give safe follow-up guidance only.";
  const userPrompt = `Write one ${language === "hi" ? "Hindi" : "English"} SMS under 220 characters for parent of ${input.studentName}. Risk level: ${input.riskLevel}. Tone: ${toneByRisk[input.riskLevel]}. Optional condition: ${input.condition ?? "N/A"}. Include a school follow-up call-to-action.`;
  const llmMessage = await chatCompletion(systemPrompt, userPrompt);

  return {
    message: llmMessage ?? template,
    source: llmMessage ? "llm" : "template",
    model: llmMessage ? env.LLM_MODEL : "template-v1"
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
  const baseSummary =
    language === "hi"
      ? `${school.name}: कुल ${totalStudents} छात्र, औसत जोखिम ${avgRiskValue}, उच्च जोखिम ${highRiskCount}, पिछले 30 दिनों में ${recentCampCount} हेल्थ कैंप।`
      : `${school.name}: ${totalStudents} students, average risk ${avgRiskValue}, ${highRiskCount} high-risk students, ${recentCampCount} health camps in the last 30 days.`;

  const systemPrompt = "You generate short, actionable school health summaries for administrators. Keep to 3 bullet points max.";
  const userPrompt = `Audience: ${input.audience}. Language: ${language}. Data: school=${school.name}, district=${school.district}, students=${totalStudents}, avgRisk=${avgRiskValue}, highRisk=${highRiskCount}, camps30d=${recentCampCount}. Return concise summary with priorities and one next action.`;
  const llmSummary = await chatCompletion(systemPrompt, userPrompt);

  return {
    summary: llmSummary ?? baseSummary,
    source: llmSummary ? "llm" : "template",
    model: llmSummary ? env.LLM_MODEL : "template-v1",
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
