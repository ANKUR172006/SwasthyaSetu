import React from "react";
import { asScore, prettyDate, titleCase } from "./formatters";

export default function DistrictResourceAllocation({ data }) {
  if (!data) return null;

  return (
    <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#ffffff" }}>
      <h3 style={{ fontSize: 16, marginBottom: 10 }}>Resource Allocation Engine</h3>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        Priority ranking by severity, population load, delay, and environmental burden.
      </p>
      {(data.recommendations || []).map((item) => (
        <div key={item.recommendationId} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{titleCase(item.actionType)}</p>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{asScore(item.priorityScore)}</p>
          </div>
          <p style={{ margin: "4px 0", fontSize: 11, color: "#334155" }}>{item.blockName} • {titleCase(item.status)}</p>
          <p style={{ margin: "4px 0", fontSize: 11, color: "#64748b" }}>Window: {prettyDate(item.recommendedDate)}</p>
          <p style={{ margin: "4px 0", fontSize: 11, color: "#334155" }}>{item.explanation}</p>
        </div>
      ))}
    </section>
  );
}
