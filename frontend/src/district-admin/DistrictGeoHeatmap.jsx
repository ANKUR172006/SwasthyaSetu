import React from "react";
import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { asScore, titleCase } from "./formatters";

const defaultCenter = [28.6139, 77.209];

export default function DistrictGeoHeatmap({ data }) {
  if (!data) return null;

  const points = (data.hotspots || []).filter(
    (item) => Number.isFinite(item?.centroid?.latitude) && Number.isFinite(item?.centroid?.longitude)
  );

  const center = points.length
    ? [points[0].centroid.latitude, points[0].centroid.longitude]
    : defaultCenter;

  return (
    <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, background: "#ffffff" }}>
      <h3 style={{ fontSize: 16, marginBottom: 10 }}>Geo Heatmap</h3>
      <p style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
        High-risk clusters and environmental hotspots for district preventive operations.
      </p>
      <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", marginBottom: 10 }}>
        <MapContainer center={center} zoom={10} style={{ height: 300, width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {points.map((cluster) => (
            <CircleMarker
              key={cluster.clusterId}
              center={[cluster.centroid.latitude, cluster.centroid.longitude]}
              radius={Math.max(8, Math.min(18, cluster.schoolCount * 2))}
              pathOptions={{ color: cluster.severity >= 75 ? "#dc2626" : cluster.severity >= 50 ? "#f59e0b" : "#16a34a", fillOpacity: 0.45 }}
            >
              <Popup>
                <div>
                  <p style={{ margin: 0, fontWeight: 700 }}>{titleCase(cluster.hotspotType)}</p>
                  <p style={{ margin: 0 }}>Severity: {asScore(cluster.severity)}</p>
                  <p style={{ margin: 0 }}>Schools: {cluster.schoolCount}</p>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <p style={{ fontSize: 11, color: "#64748b" }}>
        Preventive intelligence only. Cluster labels indicate operational priority, not diagnosis.
      </p>
    </section>
  );
}
