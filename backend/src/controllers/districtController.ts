import { Request, Response, NextFunction } from "express";
import * as districtService from "../services/districtService";
import { getDistrictRiskOverview } from "../services/districtRiskAggregationService";
import { getDistrictGeoHotspots } from "../services/geoHotspotService";
import { getDistrictOutbreakSignals } from "../services/outbreakSignalService";
import { getDistrictResourceAllocation } from "../services/resourceAllocationService";
import { getDistrictSeasonalForecast } from "../services/seasonalForecastService";
import {
  generateDistrictComplianceReport,
  getDistrictComplianceReportDownload
} from "../services/complianceReportService";
import { simulateDistrictRiskScenario } from "../services/districtRiskAggregationService";
import {
  getClimateImpactTrends,
  getFraudAnomalies,
  getNationalRiskOverview,
  getResourceOptimization,
  runPolicySimulation
} from "../services/superAdminService";

export const comparison = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await districtService.districtComparison(String(req.params.name));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const climateRisk = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await districtService.districtClimateRisk(String(req.params.name));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const topRiskSchools = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await districtService.districtTopRiskSchools(String(req.params.name));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const adminRiskOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDistrictRiskOverview(String(req.params.name));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const adminGeoHotspots = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDistrictGeoHotspots(
      String(req.params.name),
      Number(req.query.windowDays || 30)
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const adminOutbreakSignals = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDistrictOutbreakSignals(
      String(req.params.name),
      Number(req.query.windowDays || 14)
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const adminResourceAllocation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDistrictResourceAllocation(
      String(req.params.name),
      Number(req.query.limit || 20)
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const adminSeasonalForecast = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getDistrictSeasonalForecast(
      String(req.params.name),
      Number(req.query.months || 6)
    );
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const adminComplianceReportGenerate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await generateDistrictComplianceReport(
      String(req.params.name),
      String(req.user?.userId || "")
    );
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

export const adminComplianceReportDownload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const format = String(req.query.format || "pdf").toLowerCase() as "pdf" | "csv";
    const file = await getDistrictComplianceReportDownload(String(req.params.reportId), format);
    if (!file) {
      res.status(404).json({ error: "Report file not found" });
      return;
    }
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename=\"${file.filename}\"`);
    res.sendFile(file.filePath);
  } catch (error) {
    next(error);
  }
};

export const adminScenarioSimulation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await simulateDistrictRiskScenario(String(req.params.name), {
      waterQualityImprovementPct: Number(req.body?.waterQualityImprovementPct || 0),
      wasteManagementImprovementPct: Number(req.body?.wasteManagementImprovementPct || 0)
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const superAdminNationalOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getNationalRiskOverview(String(req.params.name));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const superAdminClimateImpactTrends = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getClimateImpactTrends(String(req.params.name));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const superAdminResourceOptimization = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getResourceOptimization(String(req.params.name), Number(req.query.limit || 20));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const superAdminPolicySimulation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await runPolicySimulation(String(req.params.name), {
      waterQualityImprovementPct: Number(req.body?.waterQualityImprovementPct || 0),
      treeCoverIncreasePct: Number(req.body?.treeCoverIncreasePct || 0)
    });
    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const superAdminFraudAnomalies = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await getFraudAnomalies(String(req.params.name));
    res.json(data);
  } catch (error) {
    next(error);
  }
};

