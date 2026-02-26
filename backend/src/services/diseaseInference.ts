export type DiseaseRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export type DiseaseCondition =
  | "WATER_BORNE_RISK"
  | "VECTOR_BORNE_RISK"
  | "HEAT_ILLNESS_RISK"
  | "AIR_RESPIRATORY_RISK";

export interface DiseaseSignalInput {
  bmi: number;
  vaccinationStatus: string;
  attendanceRatio: number;
  temperature?: number;
  humidity?: number;
  rainfallMm?: number;
  heatIndex?: number;
  aqi?: number;
  waterQualityScore?: number;
  sanitationScore?: number;
  wasteManagementScore?: number;
  attendanceAnomalyPercent?: number;
  symptomClusterCount?: number;
  inspectionDelayDays?: number;
  hazardReports?: number;
}

export interface ConditionScore {
  condition: DiseaseCondition;
  score: number;
  level: DiseaseRiskLevel;
  confidence: number;
  reasons: string[];
  modelBreakdown?: {
    environmental: number;
    institutional: number;
    rfLike: number;
    gbLike: number;
    anomalyGate: number;
  };
}

export interface DiseaseInferenceResult {
  model_version: string;
  primary_condition: DiseaseCondition;
  triage_score: number;
  likely_conditions: ConditionScore[];
}

const clamp = (value: number, min = 0, max = 1): number =>
  Math.max(min, Math.min(max, value));

const norm = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return 0;
  return clamp((value - min) / (max - min));
};

const inverseNorm = (value: number, min: number, max: number) => 1 - norm(value, min, max);

const logisticCalibration = (x: number) => {
  const z = 5.6 * (x - 0.5);
  return clamp(1 / (1 + Math.exp(-z)));
};

const levelFromScore = (score: number): DiseaseRiskLevel => {
  if (score >= 0.7) return "HIGH";
  if (score >= 0.4) return "MEDIUM";
  return "LOW";
};

const confidenceFromSignals = (reasons: string[]): number => {
  if (reasons.length >= 3) return 0.9;
  if (reasons.length === 2) return 0.75;
  if (reasons.length === 1) return 0.6;
  return 0.45;
};

const confidenceFromEnsemble = (params: {
  reasons: string[];
  rfLike: number;
  gbLike: number;
  anomalyGate: number;
}) => {
  const base = confidenceFromSignals(params.reasons);
  const dispersion =
    Math.abs(params.rfLike - params.gbLike) +
    Math.abs(params.rfLike - params.anomalyGate) +
    Math.abs(params.gbLike - params.anomalyGate);
  const agreementBoost = clamp(0.25 - dispersion / 3, 0, 0.25);
  return Number(clamp(base + agreementBoost, 0.45, 0.96).toFixed(2));
};

const vaccinationFactor = (status: string): number => {
  const normalized = status.trim().toUpperCase();
  if (normalized === "COMPLETE") return 0;
  if (normalized === "PARTIAL") return 0.65;
  if (normalized === "DELAYED") return 0.85;
  if (normalized === "NONE") return 1;
  return 0.7;
};

const institutionalVulnerability = (input: DiseaseSignalInput) => {
  const attendanceAnomaly = norm(Number(input.attendanceAnomalyPercent ?? (1 - input.attendanceRatio) * 100), 0, 30);
  const symptomClusters = norm(Number(input.symptomClusterCount ?? 0), 0, 8);
  const inspectionDelay = norm(Number(input.inspectionDelayDays ?? 0), 0, 30);
  const hazards = norm(Number(input.hazardReports ?? 0), 0, 10);
  return clamp(attendanceAnomaly * 0.35 + symptomClusters * 0.35 + inspectionDelay * 0.15 + hazards * 0.15);
};

const anomalyGateScore = (input: DiseaseSignalInput) => {
  const attendanceGap = norm((1 - Number(input.attendanceRatio ?? 1)) * 100, 0, 35);
  const symptomClusters = norm(Number(input.symptomClusterCount ?? 0), 0, 10);
  const hazards = norm(Number(input.hazardReports ?? 0), 0, 12);
  const inspectionDelay = norm(Number(input.inspectionDelayDays ?? 0), 0, 45);
  return clamp(attendanceGap * 0.3 + symptomClusters * 0.4 + hazards * 0.2 + inspectionDelay * 0.1);
};

const ensembleScore = (params: {
  environmental: number;
  institutional: number;
  anomalyGate: number;
  interaction: number;
}) => {
  const rfLike = clamp(params.environmental * 0.6 + params.institutional * 0.4);
  const gbLike = clamp(
    params.environmental * 0.45 +
      params.institutional * 0.25 +
      params.interaction * 0.3
  );
  const blended = clamp(rfLike * 0.55 + gbLike * 0.35 + params.anomalyGate * 0.1);
  const calibrated = logisticCalibration(blended);
  return {
    rfLike: Number(rfLike.toFixed(4)),
    gbLike: Number(gbLike.toFixed(4)),
    calibrated: Number(calibrated.toFixed(4))
  };
};

const waterBorneRisk = (input: DiseaseSignalInput): ConditionScore => {
  const reasons: string[] = [];
  const waterQualityRisk = inverseNorm(Number(input.waterQualityScore ?? 65), 40, 95);
  const sanitationRisk = inverseNorm(Number(input.sanitationScore ?? 70), 40, 95);
  const wasteRisk = inverseNorm(Number(input.wasteManagementScore ?? 68), 40, 95);
  const rainfallRisk = norm(Number(input.rainfallMm ?? 50), 0, 250);
  const vulnerability = institutionalVulnerability(input);
  const anomalyGate = anomalyGateScore(input);
  const environmental = clamp(
    waterQualityRisk * 0.32 + sanitationRisk * 0.24 + wasteRisk * 0.14 + rainfallRisk * 0.1 + vulnerability * 0.2
  );
  const interaction = clamp(waterQualityRisk * sanitationRisk + rainfallRisk * 0.35);
  const model = ensembleScore({
    environmental,
    institutional: vulnerability,
    anomalyGate,
    interaction
  });
  let score = model.calibrated;

  if (waterQualityRisk >= 0.55) reasons.push("LOW_WATER_QUALITY");
  if (sanitationRisk >= 0.5) reasons.push("POOR_SANITATION");
  if (rainfallRisk >= 0.6) reasons.push("RAINFALL_CONTAMINATION_RISK");
  if (vulnerability >= 0.5) reasons.push("INSTITUTIONAL_VULNERABILITY");

  if (input.attendanceRatio < 0.8) score = clamp(score + 0.05);
  return {
    condition: "WATER_BORNE_RISK",
    score: Number(score.toFixed(4)),
    level: levelFromScore(score),
    confidence: confidenceFromEnsemble({ reasons, rfLike: model.rfLike, gbLike: model.gbLike, anomalyGate }),
    reasons,
    modelBreakdown: {
      environmental: Number(environmental.toFixed(4)),
      institutional: Number(vulnerability.toFixed(4)),
      rfLike: model.rfLike,
      gbLike: model.gbLike,
      anomalyGate: Number(anomalyGate.toFixed(4))
    }
  };
};

const vectorBorneRisk = (input: DiseaseSignalInput): ConditionScore => {
  const reasons: string[] = [];
  const temperatureRisk = norm(Number(input.temperature ?? 32), 24, 40);
  const humidityRisk = norm(Number(input.humidity ?? 55), 35, 95);
  const rainfallRisk = norm(Number(input.rainfallMm ?? 50), 0, 300);
  const wasteRisk = inverseNorm(Number(input.wasteManagementScore ?? 68), 40, 95);
  const vulnerability = institutionalVulnerability(input);
  const anomalyGate = anomalyGateScore(input);
  const environmental = clamp(
    temperatureRisk * 0.24 + humidityRisk * 0.21 + rainfallRisk * 0.2 + wasteRisk * 0.15 + vulnerability * 0.2
  );
  const interaction = clamp(humidityRisk * rainfallRisk + wasteRisk * 0.2 + temperatureRisk * 0.15);
  const model = ensembleScore({
    environmental,
    institutional: vulnerability,
    anomalyGate,
    interaction
  });
  let score = model.calibrated;

  if (humidityRisk >= 0.55 && rainfallRisk >= 0.45) reasons.push("BREEDING_CONDITIONS_FAVORABLE");
  if (wasteRisk >= 0.5) reasons.push("STAGNATION_WASTE_RISK");
  if (vulnerability >= 0.5) reasons.push("INSTITUTIONAL_VULNERABILITY");

  if (input.symptomClusterCount && input.symptomClusterCount >= 3) score = clamp(score + 0.08);
  return {
    condition: "VECTOR_BORNE_RISK",
    score: Number(score.toFixed(4)),
    level: levelFromScore(score),
    confidence: confidenceFromEnsemble({ reasons, rfLike: model.rfLike, gbLike: model.gbLike, anomalyGate }),
    reasons,
    modelBreakdown: {
      environmental: Number(environmental.toFixed(4)),
      institutional: Number(vulnerability.toFixed(4)),
      rfLike: model.rfLike,
      gbLike: model.gbLike,
      anomalyGate: Number(anomalyGate.toFixed(4))
    }
  };
};

const heatIllnessRisk = (input: DiseaseSignalInput): ConditionScore => {
  const reasons: string[] = [];
  const tempRisk = norm(Number(input.temperature ?? 32), 28, 44);
  const heatIndexRisk = norm(Number(input.heatIndex ?? (Number(input.temperature ?? 32) + Number(input.humidity ?? 55) * 0.06)), 30, 52);
  const attendanceVulnerability = norm((1 - Number(input.attendanceRatio ?? 1)) * 100, 0, 30);
  const vulnerability = institutionalVulnerability(input);
  const anomalyGate = anomalyGateScore(input);
  const environmental = clamp(tempRisk * 0.35 + heatIndexRisk * 0.35 + attendanceVulnerability * 0.1 + vulnerability * 0.2);
  const interaction = clamp(tempRisk * heatIndexRisk + attendanceVulnerability * 0.2);
  const model = ensembleScore({
    environmental,
    institutional: vulnerability,
    anomalyGate,
    interaction
  });
  let score = model.calibrated;

  if (tempRisk >= 0.55) reasons.push("HIGH_TEMPERATURE_EXPOSURE");
  if (heatIndexRisk >= 0.6) reasons.push("HIGH_HEAT_INDEX");
  if (vulnerability >= 0.5) reasons.push("INSTITUTIONAL_VULNERABILITY");

  return {
    condition: "HEAT_ILLNESS_RISK",
    score: Number(score.toFixed(4)),
    level: levelFromScore(score),
    confidence: confidenceFromEnsemble({ reasons, rfLike: model.rfLike, gbLike: model.gbLike, anomalyGate }),
    reasons,
    modelBreakdown: {
      environmental: Number(environmental.toFixed(4)),
      institutional: Number(vulnerability.toFixed(4)),
      rfLike: model.rfLike,
      gbLike: model.gbLike,
      anomalyGate: Number(anomalyGate.toFixed(4))
    }
  };
};

const airRespiratoryRisk = (input: DiseaseSignalInput): ConditionScore => {
  const reasons: string[] = [];
  const aqiRisk = norm(Number(input.aqi ?? 120), 50, 350);
  const humidityRisk = norm(Number(input.humidity ?? 55), 30, 95);
  const heatRisk = norm(Number(input.temperature ?? 32), 25, 44);
  const vulnerability = institutionalVulnerability(input);
  const anomalyGate = anomalyGateScore(input);
  const environmental = clamp(aqiRisk * 0.5 + humidityRisk * 0.1 + heatRisk * 0.1 + vulnerability * 0.3);
  const interaction = clamp(aqiRisk * humidityRisk + heatRisk * 0.2 + vulnerability * 0.2);
  const model = ensembleScore({
    environmental,
    institutional: vulnerability,
    anomalyGate,
    interaction
  });
  let score = model.calibrated;

  if (aqiRisk >= 0.5) reasons.push("POOR_AIR_QUALITY");
  if (vulnerability >= 0.5) reasons.push("INSTITUTIONAL_VULNERABILITY");
  if ((input.symptomClusterCount ?? 0) >= 3) reasons.push("SYMPTOM_CLUSTER_SIGNAL");

  if (vaccinationFactor(input.vaccinationStatus) >= 0.8) score = clamp(score + 0.03);

  return {
    condition: "AIR_RESPIRATORY_RISK",
    score: Number(score.toFixed(4)),
    level: levelFromScore(score),
    confidence: confidenceFromEnsemble({ reasons, rfLike: model.rfLike, gbLike: model.gbLike, anomalyGate }),
    reasons,
    modelBreakdown: {
      environmental: Number(environmental.toFixed(4)),
      institutional: Number(vulnerability.toFixed(4)),
      rfLike: model.rfLike,
      gbLike: model.gbLike,
      anomalyGate: Number(anomalyGate.toFixed(4))
    }
  };
};

export const inferLikelyConditions = (input: DiseaseSignalInput): DiseaseInferenceResult => {
  const results: ConditionScore[] = [
    waterBorneRisk(input),
    vectorBorneRisk(input),
    heatIllnessRisk(input),
    airRespiratoryRisk(input)
  ].sort((a, b) => b.score - a.score);

  const triage = clamp(results[0]?.score ?? 0);

  return {
    model_version: "climate-aware-multi-layer-risk-intelligence-v2-ensemble",
    primary_condition: results[0]?.condition ?? "WATER_BORNE_RISK",
    triage_score: Number(triage.toFixed(4)),
    likely_conditions: results
  };
};
