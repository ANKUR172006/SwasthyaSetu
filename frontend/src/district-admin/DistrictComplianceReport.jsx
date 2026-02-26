import React, { useMemo, useState } from "react";
import {
  buildDistrictReportDownloadUrl,
  generateDistrictReport,
  runScenarioSimulation
} from "./districtApi";
import { prettyDate } from "./formatters";

export default function DistrictComplianceReport({ districtName, request, apiBaseUrl }) {
  const [state, setState] = useState({ loading: false, report: null, error: "" });
  const [scenario, setScenario] = useState({
    waterQualityImprovementPct: 20,
    wasteManagementImprovementPct: 10,
    loading: false,
    result: null
  });

  const links = useMemo(() => {
    if (!state.report?.reportId || !apiBaseUrl) return null;
    return {
      pdf: buildDistrictReportDownloadUrl({
        districtName,
        reportId: state.report.reportId,
        format: "pdf",
        apiBaseUrl
      }),
      csv: buildDistrictReportDownloadUrl({
        districtName,
        reportId: state.report.reportId,
        format: "csv",
        apiBaseUrl
      })
    };
  }, [state.report, districtName, apiBaseUrl]);

  const handleGenerate = async () => {
    setState({ loading: true, report: null, error: "" });
    try {
      const report = await generateDistrictReport({ districtName, request });
      setState({ loading: false, report, error: "" });
    } catch (error) {
      setState({ loading: false, report: null, error: String(error?.message || "Report generation failed") });
    }
  };

  const handleSimulation = async () => {
    setScenario((prev) => ({ ...prev, loading: true }));
    try {
      const result = await runScenarioSimulation({
        districtName,
        request,
        waterQualityImprovementPct: scenario.waterQualityImprovementPct,
        wasteManagementImprovementPct: scenario.wasteManagementImprovementPct
      });
      setScenario((prev) => ({ ...prev, loading: false, result }));
    } catch {
      setScenario((prev) => ({ ...prev, loading: false }));
    }
  };

  return (
    <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#ffffff" }}>
      <h3 style={{ fontSize: 16, marginBottom: 10 }}>District Compliance & Sustainability Report</h3>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        Download governance-ready PDF + CSV with risk distribution, trends, vulnerability index, and preventive action plan.
      </p>
      <button
        onClick={handleGenerate}
        disabled={state.loading}
        style={{ border: "none", borderRadius: 8, background: "#0f766e", color: "#fff", padding: "8px 12px", cursor: "pointer", fontWeight: 700 }}
      >
        {state.loading ? "Generating..." : "Generate Compliance Report"}
      </button>
      {state.error && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 8 }}>{state.error}</p>}
      {state.report && (
        <div style={{ marginTop: 10, border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
          <p style={{ fontSize: 12, margin: 0, fontWeight: 700 }}>Report ID: {state.report.reportId}</p>
          <p style={{ fontSize: 11, color: "#64748b", margin: "4px 0" }}>Generated: {prettyDate(state.report.generatedAt)}</p>
          {links && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <a href={links.pdf} style={linkStyle}>Download PDF</a>
              <a href={links.csv} style={linkStyle}>Download CSV</a>
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 12, border: "1px solid #e2e8f0", borderRadius: 8, padding: 10 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>Scenario Simulation</p>
        <p style={{ margin: "4px 0", fontSize: 11, color: "#64748b" }}>
          Project district risk reduction from water and waste improvements.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <label style={{ fontSize: 11 }}>
            Water quality improvement (%)
            <input
              type="number"
              min="0"
              max="40"
              value={scenario.waterQualityImprovementPct}
              onChange={(e) =>
                setScenario((prev) => ({
                  ...prev,
                  waterQualityImprovementPct: Number(e.target.value || 0)
                }))
              }
              style={inputStyle}
            />
          </label>
          <label style={{ fontSize: 11 }}>
            Waste management improvement (%)
            <input
              type="number"
              min="0"
              max="40"
              value={scenario.wasteManagementImprovementPct}
              onChange={(e) =>
                setScenario((prev) => ({
                  ...prev,
                  wasteManagementImprovementPct: Number(e.target.value || 0)
                }))
              }
              style={inputStyle}
            />
          </label>
        </div>
        <button
          onClick={handleSimulation}
          disabled={scenario.loading}
          style={{ marginTop: 8, border: "none", borderRadius: 8, background: "#334155", color: "#fff", padding: "7px 11px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}
        >
          {scenario.loading ? "Simulating..." : "Run Scenario"}
        </button>
        {scenario.result && (
          <p style={{ marginTop: 8, fontSize: 12 }}>
            Projected reduction in district risk: <strong>{scenario.result.projectedReductionPct.toFixed(1)}%</strong>
          </p>
        )}
      </div>
    </section>
  );
}

const linkStyle = {
  display: "inline-block",
  background: "#1d4ed8",
  color: "#fff",
  padding: "6px 10px",
  borderRadius: 6,
  textDecoration: "none",
  fontSize: 12,
  fontWeight: 700
};

const inputStyle = {
  width: "100%",
  marginTop: 4,
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  padding: "6px 8px"
};
