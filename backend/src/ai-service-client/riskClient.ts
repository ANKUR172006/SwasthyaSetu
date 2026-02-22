import axios from "axios";
import { env } from "../config/env";
import { logger } from "../config/logger";
import { recordRiskSource } from "../services/riskTelemetry";

export interface RiskInput {
  bmi: number;
  vaccination_status: string;
  temperature: number;
  aqi: number;
  attendance_ratio: number;
}

export interface RiskResponse {
  score: number;
  level: "LOW" | "MEDIUM" | "HIGH";
  model_version: string;
  reason_codes: string[];
  contributions: {
    bmi: number;
    vaccination: number;
    temperature: number;
    aqi: number;
    attendance: number;
  };
  source: "ai-service" | "fallback";
}

const toAiBaseUrl = (value: string): string =>
  /^https?:\/\//i.test(value) ? value : `http://${value}`;

const bmiFactor = (bmi: number): number => {
  if (bmi < 16.5) return 1.0;
  if (bmi < 18.5) return 0.7;
  if (bmi <= 24.9) return 0.2;
  if (bmi <= 29.9) return 0.6;
  return 0.9;
};

const vaccinationDelayFactor = (status: string): number => {
  const normalized = status.trim().toUpperCase();
  const mapping: Record<string, number> = {
    COMPLETE: 0.0,
    PARTIAL: 0.6,
    DELAYED: 0.8,
    NONE: 1.0
  };
  return mapping[normalized] ?? 0.7;
};

const heatwaveFactor = (temperature: number): number => {
  if (temperature >= 45) return 1.0;
  if (temperature >= 40) return 0.8;
  if (temperature >= 35) return 0.5;
  return 0.2;
};

const aqiFactor = (aqi: number): number => {
  if (aqi >= 300) return 1.0;
  if (aqi >= 200) return 0.8;
  if (aqi >= 120) return 0.5;
  return 0.2;
};

const attendanceFactor = (ratio: number): number => 1.0 - ratio;

const scoreLevel = (score: number): "LOW" | "MEDIUM" | "HIGH" => {
  if (score >= 0.7) return "HIGH";
  if (score >= 0.4) return "MEDIUM";
  return "LOW";
};

const buildReasonCodes = (components: {
  bmi: number;
  vaccination: number;
  temperature: number;
  aqi: number;
  attendance: number;
}): string[] => {
  const reasons: string[] = [];
  if (components.bmi >= 0.2) reasons.push("BMI_OUT_OF_HEALTHY_RANGE");
  if (components.vaccination >= 0.14) reasons.push("VACCINATION_DELAY_OR_INCOMPLETE");
  if (components.temperature >= 0.16) reasons.push("HEAT_STRESS_RISK");
  if (components.aqi >= 0.12) reasons.push("AIR_QUALITY_EXPOSURE");
  if (components.attendance >= 0.05) reasons.push("LOW_ATTENDANCE_PATTERN");
  if (reasons.length === 0) reasons.push("BASELINE_LOW_RISK");
  return reasons;
};

const fallbackRiskScore = (payload: RiskInput): RiskResponse => {
  const contributions = {
    bmi: Number((bmiFactor(payload.bmi) * 0.3).toFixed(4)),
    vaccination: Number((vaccinationDelayFactor(payload.vaccination_status) * 0.2).toFixed(4)),
    temperature: Number((heatwaveFactor(payload.temperature) * 0.25).toFixed(4)),
    aqi: Number((aqiFactor(payload.aqi) * 0.15).toFixed(4)),
    attendance: Number((attendanceFactor(payload.attendance_ratio) * 0.1).toFixed(4))
  };
  const score = Number(
    Math.max(0, Math.min(1, contributions.bmi + contributions.vaccination + contributions.temperature + contributions.aqi + contributions.attendance)).toFixed(4)
  );

  return {
    score,
    level: scoreLevel(score),
    model_version: "risk-engine-fallback-v1",
    reason_codes: buildReasonCodes(contributions),
    contributions,
    source: "fallback"
  };
};

export const calculateRisk = async (payload: RiskInput): Promise<RiskResponse> => {
  try {
    const response = await axios.post<RiskResponse>(`${toAiBaseUrl(env.AI_SERVICE_URL)}/calculate-risk`, payload, {
      timeout: 5000
    });
    const data = response.data;
    const result: RiskResponse = {
      score: data.score,
      level: data.level,
      model_version: data.model_version ?? "risk-engine-rule-v2",
      reason_codes: data.reason_codes ?? [],
      contributions: data.contributions ?? {
        bmi: 0,
        vaccination: 0,
        temperature: 0,
        aqi: 0,
        attendance: 0
      },
      source: "ai-service"
    };
    recordRiskSource("ai-service");
    return result;
  } catch (error) {
    logger.warn({ error }, "AI scoring service unavailable; using fallback scoring");
    const fallback = fallbackRiskScore(payload);
    recordRiskSource("fallback");
    return fallback;
  }
};
