type RiskSource = "ai-service" | "fallback";

const counters = {
  total: 0,
  aiService: 0,
  fallback: 0
};

export const recordRiskSource = (source: RiskSource) => {
  counters.total += 1;
  if (source === "ai-service") counters.aiService += 1;
  if (source === "fallback") counters.fallback += 1;
};

export const getRiskTelemetry = () => {
  const fallbackRate = counters.total > 0 ? Number((counters.fallback / counters.total).toFixed(4)) : 0;
  return {
    ...counters,
    fallbackRate
  };
};
