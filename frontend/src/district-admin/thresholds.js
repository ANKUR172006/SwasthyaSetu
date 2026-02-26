export const RISK_COLORS = {
  low: "#16a34a",
  moderate: "#f59e0b",
  high: "#dc2626"
};

export const statusToColor = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "high") return RISK_COLORS.high;
  if (normalized === "elevated" || normalized === "moderate") return RISK_COLORS.moderate;
  return RISK_COLORS.low;
};

export const clampConfidence = (value) => Math.max(0, Math.min(100, Number(value || 0)));
