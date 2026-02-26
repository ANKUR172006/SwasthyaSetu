import { UserRole } from "@prisma/client";

export const DISTRICT_ALL_TOKENS = new Set(["all-india", "all_india", "india", "*"]);

export const districtFilter = (district: string) => {
  const normalized = String(district || "").trim().toLowerCase();
  return {
    normalized,
    isAllIndia: DISTRICT_ALL_TOKENS.has(normalized)
  };
};

export const districtVariants = (district: string): string[] => {
  const normalized = String(district || "").trim();
  if (!normalized) return [];
  const parts = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return [...new Set([normalized, ...parts])];
};

export const districtWhere = (district: string, isAllIndia: boolean) => {
  if (isAllIndia) return {};
  const variants = districtVariants(district);
  return {
    OR: variants.map((value) => ({
      district: {
        contains: value,
        mode: "insensitive" as const
      }
    }))
  };
};

export const scoreToRiskBucket = (score: number): "low" | "moderate" | "high" => {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "moderate";
  return "low";
};

export const bounded = (value: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, Number(value.toFixed(2))));

export const roleToSafeLabel = (role: UserRole): string => {
  switch (role) {
    case UserRole.DISTRICT_ADMIN:
      return "district_admin";
    case UserRole.SUPER_ADMIN:
      return "super_admin";
    case UserRole.SCHOOL_ADMIN:
      return "school_admin";
    case UserRole.TEACHER:
      return "teacher";
    case UserRole.PARENT:
      return "parent";
    default:
      return "unknown";
  }
};
