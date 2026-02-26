import React from "react";
import { asScore } from "./formatters";
import { statusToColor } from "./thresholds";

export default function DistrictOutbreakSignals({ data }) {
  if (!data) return null;

  return (
    <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#ffffff" }}>
      <h3 style={{ fontSize: 16, marginBottom: 10 }}>Early Outbreak Signal Detection</h3>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        Multi-school risk flagging only. No diagnostic output.
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {(data.allBlocks || []).map((block) => (
          <div key={block.blockName} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 12 }}>{block.blockName}</span>
              <span style={{ fontSize: 12, color: statusToColor(block.status), fontWeight: 700 }}>{String(block.status).toUpperCase()}</span>
            </div>
            <p style={{ fontSize: 11, color: "#64748b" }}>
              Severity: {asScore(block.severityScore)} | Confidence: {Math.round(block.confidence)}%
            </p>
            <p style={{ fontSize: 11, color: "#334155" }}>
              Attendance drop {block.triadMetrics?.attendanceDropPct?.toFixed(1)}%, symptom cluster {block.triadMetrics?.symptomClusterIndex?.toFixed(1)}, env risk rise {block.triadMetrics?.envRiskRiseIndex?.toFixed(1)}.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
