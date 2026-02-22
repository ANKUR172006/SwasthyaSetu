import { prisma } from "../config/prisma";
import { invalidateDistrictCache } from "./districtService";

const randomInRange = (min: number, max: number): number => Math.random() * (max - min) + min;

const generateClimate = () => {
  const temperature = Number(randomInRange(24, 46).toFixed(2));
  const aqi = Math.floor(randomInRange(60, 350));
  return {
    temperature,
    aqi,
    heatAlertFlag: temperature >= 40
  };
};

export const ingestSimulatedClimateData = async () => {
  const districts = await prisma.school.findMany({
    distinct: ["district"],
    select: { district: true }
  });

  for (const item of districts) {
    const data = generateClimate();
    await prisma.climateData.create({
      data: {
        district: item.district,
        date: new Date(),
        ...data
      }
    });
    await invalidateDistrictCache(item.district);
  }
};
