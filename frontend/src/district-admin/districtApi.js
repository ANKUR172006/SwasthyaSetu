export const loadDistrictAdminData = async ({ districtName, request }) => {
  const encoded = encodeURIComponent(districtName || "Panipat, Haryana");
  const [riskOverview, geoHotspots, outbreakSignals, resourceAllocation, seasonalForecast] = await Promise.all([
    request(`/district/${encoded}/admin/risk-overview`),
    request(`/district/${encoded}/admin/geo-hotspots?windowDays=30`),
    request(`/district/${encoded}/admin/outbreak-signals?windowDays=14`),
    request(`/district/${encoded}/admin/resource-allocation?limit=20`),
    request(`/district/${encoded}/admin/seasonal-forecast?months=6`)
  ]);

  return {
    riskOverview,
    geoHotspots,
    outbreakSignals,
    resourceAllocation,
    seasonalForecast
  };
};

export const generateDistrictReport = async ({ districtName, request }) => {
  const encoded = encodeURIComponent(districtName || "Panipat, Haryana");
  return request(`/district/${encoded}/admin/compliance-report/generate`, {
    method: "POST"
  });
};

export const buildDistrictReportDownloadUrl = ({ districtName, reportId, format, apiBaseUrl }) => {
  const encoded = encodeURIComponent(districtName || "Panipat, Haryana");
  return `${apiBaseUrl}/district/${encoded}/admin/compliance-report/${reportId}/download?format=${format}`;
};

export const runScenarioSimulation = async ({
  districtName,
  request,
  waterQualityImprovementPct,
  wasteManagementImprovementPct
}) => {
  const encoded = encodeURIComponent(districtName || "Panipat, Haryana");
  return request(`/district/${encoded}/admin/scenario-simulation`, {
    method: "POST",
    body: {
      waterQualityImprovementPct,
      wasteManagementImprovementPct
    }
  });
};
