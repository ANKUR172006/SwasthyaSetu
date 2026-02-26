import React from "react";
import { asPercent, asScore, titleCase } from "./formatters";

export default function DistrictRiskOverview({ data }) {
  if (!data) return null;

  return (
    <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#ffffff" }}>
      <h3 style={{ fontSize: 16, marginBottom: 10 }}>District Risk Overview</h3>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        Preventive intelligence only. Not a diagnosis.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 12 }}>
        <Stat label="Low Risk Schools" value={asPercent(data.riskDistribution?.lowPct)} color="#16a34a" />
        <Stat label="Moderate Risk Schools" value={asPercent(data.riskDistribution?.moderatePct)} color="#f59e0b" />
        <Stat label="High Risk Schools" value={asPercent(data.riskDistribution?.highPct)} color="#dc2626" />
        <Stat label="Vulnerability Index" value={asScore(data.districtVulnerabilityIndex)} color="#0f172a" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Top Vulnerability Zones</p>
          {(data.topVulnerabilityZones || []).slice(0, 5).map((zone) => (
            <div key={zone.blockName} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{zone.blockName}</span>
                <span style={{ fontSize: 12 }}>{asScore(zone.riskIndex)}</span>
              </div>
              <p style={{ fontSize: 11, color: "#64748b" }}>{(zone.drivers || []).map(titleCase).join(", ")}</p>
            </div>
          ))}
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 12, marginBottom: 6 }}>Active Environmental Alerts</p>
          {(data.activeEnvironmentalAlerts || []).map((alert, index) => (
            <div key={`${alert.alertType}-${index}`} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 8, marginBottom: 6 }}>
              <p style={{ fontSize: 12, fontWeight: 600 }}>{titleCase(alert.alertType)}</p>
              <p style={{ fontSize: 11, color: "#64748b" }}>Severity {alert.severity}/10 • {titleCase(alert.status)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
      <p style={{ fontSize: 11, color: "#64748b" }}>{label}</p>
      <p style={{ fontSize: 20, fontWeight: 800, color }}>{value}</p>
    </div>
  );
}
