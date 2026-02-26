import React from "react";
import { asScore } from "./formatters";

export default function DistrictSeasonalForecast({ data }) {
  if (!data) return null;

  return (
    <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#ffffff" }}>
      <h3 style={{ fontSize: 16, marginBottom: 10 }}>Seasonal Forecast View</h3>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        Basic seasonal forecasting for heat, vector, and air-quality vulnerability.
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={th}>Month</th>
              <th style={th}>Heat Risk</th>
              <th style={th}>Vector Risk</th>
              <th style={th}>Air Risk</th>
              <th style={th}>Confidence</th>
            </tr>
          </thead>
          <tbody>
            {(data.forecast || []).map((row) => (
              <tr key={row.month}>
                <td style={td}>{new Date(row.month).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                <td style={td}>{asScore(row.heatRisk)}</td>
                <td style={td}>{asScore(row.vectorRisk)}</td>
                <td style={td}>{asScore(row.airRisk)}</td>
                <td style={td}>{Math.round(row.confidence)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const th = { textAlign: "left", borderBottom: "1px solid #e2e8f0", padding: "6px" };
const td = { borderBottom: "1px solid #f1f5f9", padding: "6px" };
