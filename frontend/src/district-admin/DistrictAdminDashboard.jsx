import React, { useEffect, useMemo, useState } from "react";
import DistrictRiskOverview from "./DistrictRiskOverview";
import DistrictGeoHeatmap from "./DistrictGeoHeatmap";
import DistrictOutbreakSignals from "./DistrictOutbreakSignals";
import DistrictResourceAllocation from "./DistrictResourceAllocation";
import DistrictSeasonalForecast from "./DistrictSeasonalForecast";
import DistrictComplianceReport from "./DistrictComplianceReport";
import { loadDistrictAdminData } from "./districtApi";

export default function DistrictAdminDashboard({ districtName, request, apiBaseUrl }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const payload = await loadDistrictAdminData({ districtName, request });
        if (mounted) {
          setData(payload);
        }
      } catch (err) {
        if (mounted) {
          setError(String(err?.message || "Unable to load district admin dashboard"));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [districtName, request]);

  const explainability = useMemo(() => {
    if (!data) return [];
    return [
      {
        name: "District Risk Aggregation",
        version: data.riskOverview?.explainability?.modelVersion,
        confidence: data.riskOverview?.explainability?.confidence,
        contributors: data.riskOverview?.explainability?.contributors
      },
      {
        name: "Geo Hotspot Detection",
        version: data.geoHotspots?.hotspots?.[0]?.explainability?.modelVersion || "geo-hotspot-clustering-v1",
        confidence: data.geoHotspots?.hotspots?.[0]?.explainability?.confidence,
        contributors: data.geoHotspots?.hotspots?.[0]?.explainability?.contributors
      },
      {
        name: "Outbreak Signal Detection",
        version: data.outbreakSignals?.allBlocks?.[0]?.explainability?.modelVersion || "multi-school-anomaly-v1",
        confidence: data.outbreakSignals?.allBlocks?.[0]?.confidence,
        contributors: data.outbreakSignals?.allBlocks?.[0]?.explainability?.contributors
      },
      {
        name: "Resource Allocation",
        version: data.resourceAllocation?.recommendations?.[0]?.explainability?.modelVersion || "resource-priority-ranking-v1",
        confidence: data.resourceAllocation?.recommendations?.[0]?.explainability?.confidence,
        contributors: data.resourceAllocation?.recommendations?.[0]?.explainability?.contributors
      },
      {
        name: "Seasonal Forecast",
        version: data.seasonalForecast?.explainability?.modelVersion,
        confidence: data.seasonalForecast?.forecast?.[0]?.confidence,
        contributors: null
      }
    ];
  }, [data]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1e3a8a", borderRadius: 10, padding: 10, fontSize: 12 }}>
        District governance view: preventive intelligence only. Outputs are risk flags and operational priorities, not diagnosis.
      </div>
      {loading && <p style={{ fontSize: 12, color: "#64748b" }}>Loading district intelligence modules...</p>}
      {error && <p style={{ fontSize: 12, color: "#dc2626" }}>{error}</p>}
      {data && (
        <>
          <DistrictRiskOverview data={data.riskOverview} />
          <DistrictGeoHeatmap data={data.geoHotspots} />
          <DistrictOutbreakSignals data={data.outbreakSignals} />
          <DistrictResourceAllocation data={data.resourceAllocation} />
          <DistrictSeasonalForecast data={data.seasonalForecast} />
          <DistrictComplianceReport districtName={districtName} request={request} apiBaseUrl={apiBaseUrl} />

          <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#ffffff" }}>
            <h3 style={{ fontSize: 16, marginBottom: 10 }}>AI Explainability and Audit Summary</h3>
            {explainability.map((item) => (
              <div key={item.name} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700 }}>{item.name}</p>
                <p style={{ margin: "4px 0", fontSize: 11, color: "#64748b" }}>
                  Model: {item.version || "N/A"} | Confidence: {Math.round(Number(item.confidence || 0))}%
                </p>
                {item.contributors && (
                  <pre style={{ margin: 0, background: "#f8fafc", borderRadius: 6, padding: 8, fontSize: 10, overflowX: "auto" }}>
                    {JSON.stringify(item.contributors, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}
