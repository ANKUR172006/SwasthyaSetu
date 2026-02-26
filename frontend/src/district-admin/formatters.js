export const prettyDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export const asPercent = (value) => `${Number(value || 0).toFixed(1)}%`;

export const asScore = (value) => `${Math.round(Number(value || 0))}/100`;

export const titleCase = (value) =>
  String(value || "")
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ");
