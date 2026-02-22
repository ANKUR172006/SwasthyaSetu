import fs from "fs";
import path from "path";
import { SchoolType } from "@prisma/client";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";

const seedSchools = [
  { name: "PM SHRI Model School - Shivajinagar", district: "Pune", type: SchoolType.GOVT },
  { name: "Delhi Nagar Nigam School - Karol Bagh", district: "Delhi", type: SchoolType.GOVT },
  { name: "Bengaluru Vidya Kendra", district: "Bengaluru", type: SchoolType.PRIVATE },
  { name: "Ahmedabad Municipal School - Navrangpura", district: "Ahmedabad", type: SchoolType.GOVT },
  { name: "Kolkata Community School - Salt Lake", district: "Kolkata", type: SchoolType.GOVT },
  { name: "Lucknow Public Learning Centre", district: "Lucknow", type: SchoolType.PRIVATE },
  { name: "Jaipur Nagar School - Bani Park", district: "Jaipur", type: SchoolType.GOVT },
  { name: "Chennai Smart School - T Nagar", district: "Chennai", type: SchoolType.PRIVATE },
  { name: "Hyderabad Model School - Secunderabad", district: "Hyderabad", type: SchoolType.GOVT },
  { name: "Bhopal PM SHRI School - MP Nagar", district: "Bhopal", type: SchoolType.GOVT }
];

const udiseCode = (index: number) => `UDISE${(100000 + index).toString()}`;

const splitCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
};

const normalizeHeader = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");

const pick = (row: Record<string, string>, aliases: string[]): string => {
  for (const alias of aliases) {
    const value = row[alias];
    if (value && value.trim()) {
      return value.trim();
    }
  }
  return "";
};

const inferSchoolType = (value: string): SchoolType => {
  const normalized = value.toLowerCase();
  if (
    normalized.includes("gov") ||
    normalized.includes("government") ||
    normalized.includes("municipal") ||
    normalized.includes("kendriya")
  ) {
    return SchoolType.GOVT;
  }
  return SchoolType.PRIVATE;
};

type ImportResult = {
  source: "csv" | "fallback";
  importedSchools: number;
  skippedRows: number;
};

export const importUdiseCsv = async (csvPath: string): Promise<ImportResult> => {
  const absolutePath = path.resolve(csvPath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`UDISE CSV not found at ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, "utf8");
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length <= 1) {
    return { source: "csv", importedSchools: 0, skippedRows: 0 };
  }

  const header = splitCsvLine(lines[0]).map(normalizeHeader);
  const batch: Array<{
    name: string;
    district: string;
    type: SchoolType;
    udiseCode: string;
    infraScore: number;
  }> = [];
  let skippedRows = 0;

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < header.length; j += 1) {
      row[header[j]] = cells[j] ?? "";
    }

    const name = pick(row, ["school_name", "school", "name", "institution_name"]);
    const district = pick(row, ["district_name", "district"]);
    const state = pick(row, ["state_name", "state", "state_ut"]);
    const districtLabel = state ? `${district}, ${state}` : district;
    const udise = pick(row, ["udise_code", "udise", "school_code", "school_id"]);
    if (!name || !districtLabel || !udise) {
      skippedRows += 1;
      continue;
    }

    const type = inferSchoolType(
      pick(row, ["school_type", "management", "management_category", "govt_private"]) || "private"
    );
    const infraValue = Number(pick(row, ["infra_score", "infrastructure_score"]));
    const infraScore = Number.isFinite(infraValue)
      ? Math.max(0, Math.min(100, infraValue))
      : Number((Math.random() * 35 + 55).toFixed(2));

    batch.push({
      name,
      district: districtLabel,
      type,
      udiseCode: udise,
      infraScore
    });
  }

  const existingBefore = await prisma.school.count();
  await prisma.school.createMany({
    data: batch,
    skipDuplicates: true
  });
  const existingAfter = await prisma.school.count();

  return {
    source: "csv",
    importedSchools: Math.max(existingAfter - existingBefore, 0),
    skippedRows
  };
};

export const syncSimulatedUdiseData = async (): Promise<ImportResult> => {
  const existingCount = await prisma.school.count();
  if (existingCount > 0) {
    return { source: "fallback", importedSchools: 0, skippedRows: 0 };
  }

  for (const [index, school] of seedSchools.entries()) {
    await prisma.school.create({
      data: {
        name: school.name,
        district: school.district,
        type: school.type,
        udiseCode: udiseCode(index + 1),
        infraScore: Number((Math.random() * 50 + 50).toFixed(2))
      }
    });
  }

  return { source: "fallback", importedSchools: seedSchools.length, skippedRows: 0 };
};

export const syncSchoolDirectoryData = async (csvPath?: string): Promise<ImportResult> => {
  if (csvPath && csvPath.trim()) {
    const result = await importUdiseCsv(csvPath.trim());
    logger.info(
      {
        source: result.source,
        importedSchools: result.importedSchools,
        skippedRows: result.skippedRows
      },
      "School directory sync complete from CSV"
    );
    return result;
  }

  const fallbackResult = await syncSimulatedUdiseData();
  logger.info(
    { source: fallbackResult.source, importedSchools: fallbackResult.importedSchools },
    "School directory sync complete from fallback seed"
  );
  return fallbackResult;
};
