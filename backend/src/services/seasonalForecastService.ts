import { prisma } from "../config/prisma";
import { bounded, districtFilter, districtWhere } from "./districtAdminUtils";

const MODEL_VERSION = "seasonal-forecast-basic-v1";

const monthKey = (value: Date): string => value.toISOString().slice(0, 7);

const addMonths = (base: Date, months: number): Date => {
  const cloned = new Date(base.getTime());
  cloned.setUTCMonth(cloned.getUTCMonth() + months, 1);
  cloned.setUTCHours(0, 0, 0, 0);
  return cloned;
};

export const getDistrictSeasonalForecast = async (district: string, months: number) => {
  const filter = districtFilter(district);
  const where = districtWhere(district, filter.isAllIndia);

  const climateRows = await prisma.climateData.findMany({
    where,
    orderBy: { date: "asc" },
    take: 360
  });

  const grouped = new Map<
    string,
    {
      count: number;
      tempTotal: number;
      heatDays: number;
      aqiTotal: number;
    }
  >();

  for (const row of climateRows) {
    const key = monthKey(row.date);
    const current = grouped.get(key) || { count: 0, tempTotal: 0, heatDays: 0, aqiTotal: 0 };
    current.count += 1;
    current.tempTotal += row.temperature;
    current.heatDays += row.heatAlertFlag ? 1 : 0;
    current.aqiTotal += row.aqi;
    grouped.set(key, current);
  }

  const historical = [...grouped.entries()]
    .map(([key, value]) => {
      const avgTemp = value.tempTotal / Math.max(1, value.count);
      const heatRatio = value.heatDays / Math.max(1, value.count);
      const avgAqi = value.aqiTotal / Math.max(1, value.count);
      return {
        key,
        avgTemp,
        heatRatio,
        avgAqi,
        heatRisk: bounded((avgTemp - 28) * 4 + heatRatio * 30),
        vectorRisk: bounded(heatRatio * 35 + Math.max(0, 45 - avgTemp) * 0.8),
        airRisk: bounded((avgAqi - 70) * 0.7)
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));

  const tail = historical.slice(Math.max(0, historical.length - 4));
  const avgTail = {
    heatRisk: tail.length ? tail.reduce((sum, item) => sum + item.heatRisk, 0) / tail.length : 40,
    vectorRisk: tail.length ? tail.reduce((sum, item) => sum + item.vectorRisk, 0) / tail.length : 35,
    airRisk: tail.length ? tail.reduce((sum, item) => sum + item.airRisk, 0) / tail.length : 45
  };

  const horizon = Math.max(1, Math.min(12, months));
  const forecast = Array.from({ length: horizon }, (_, index) => {
    const month = addMonths(new Date(), index);
    const seasonalLift = Math.sin((month.getUTCMonth() / 12) * Math.PI * 2);
    const heatRisk = bounded(avgTail.heatRisk + seasonalLift * 8 + index * 0.9);
    const vectorRisk = bounded(avgTail.vectorRisk + seasonalLift * 10 + (index % 3) * 1.3);
    const airRisk = bounded(avgTail.airRisk + (1 - seasonalLift) * 6 + index * 0.7);
    const confidence = bounded(85 - index * 4.5, 45, 90);
    return {
      month: month.toISOString(),
      heatRisk,
      vectorRisk,
      airRisk,
      confidence
    };
  });

  return {
    district: filter.isAllIndia ? "ALL_INDIA" : district,
    generatedAt: new Date().toISOString(),
    months: horizon,
    forecast,
    explainability: {
      modelVersion: MODEL_VERSION,
      assumptions: [
        "Forecast uses district historical climate trend with seasonal lift and basic regression slope.",
        "Confidence decreases for farther forecast months.",
        "Outputs are preventive planning signals and should be reviewed with field context."
      ]
    },
    governanceNotice:
      "Seasonal forecast is an early warning aid for prevention planning and does not provide clinical conclusions."
  };
};
