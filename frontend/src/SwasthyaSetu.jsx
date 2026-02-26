/**
 * SwasthyaSetu – Green Bharat School Intelligence Platform
 * A comprehensive school health & sustainability monitoring dashboard
 * Built with React, Tailwind-compatible inline styles, Recharts, Lucide React
 * 
 * Architecture:
 * - Role-based authentication (mock JWT)
 * - Dynamic dashboards per role
 * - Student health profiles
 * - Health camp management
 * - Government scheme tracking
 * - Climate & sustainability module
 */

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";
import {
  Shield, Users, Heart, AlertTriangle, Bell, Settings,
  LogOut, Menu, X, ChevronRight, ChevronDown, Sun, Moon,
  Activity, Thermometer, Droplets, Leaf, TreePine, Wind,
  BookOpen, Syringe, Eye, Phone, MessageSquare, Download,
  Plus, Filter, Search, TrendingUp, TrendingDown, Award,
  MapPin, Calendar, Clock, CheckCircle, XCircle, AlertCircle,
  User, FileText, BarChart2, Home, Zap, Star, ArrowRight,
  Building2, GraduationCap, Stethoscope, Baby
} from "lucide-react";

// ============================================================
// MOCK DATA
// ============================================================

const ROLES = {
  SUPER_ADMIN: "super_admin",
  SCHOOL_ADMIN: "school_admin",
  TEACHER: "teacher",
  HEALTH_WORKER: "health_worker",
  PARENT: "parent",
};

const runtimeConfig = (typeof window !== "undefined" && window.__APP_CONFIG__) ? window.__APP_CONFIG__ : {};
const normalizeApiBaseUrl = (value) => {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9.-]+(?::\d+)?$/i.test(raw)) {
    const [host, port] = raw.split(":");
    const normalizedHost =
      host.includes(".") || host === "localhost" || host === "127.0.0.1"
        ? host
        : `${host}.onrender.com`;
    const withPort = port ? `${normalizedHost}:${port}` : normalizedHost;
    return `${import.meta.env.DEV ? "http" : "https"}://${withPort}`;
  }
  return raw;
};
const runtimeApiBaseUrl = normalizeApiBaseUrl(runtimeConfig.API_BASE_URL);
const buildApiBaseUrl = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL);
const rawApiBaseUrl = runtimeApiBaseUrl || buildApiBaseUrl;
const hasPlaceholderApiUrl = /replace_with_backend_url/i.test(rawApiBaseUrl);
const API_BASE_URL = rawApiBaseUrl && !hasPlaceholderApiUrl ? rawApiBaseUrl : (import.meta.env.DEV ? "http://localhost:8080" : "");
const PROD_BACKEND_CANDIDATES = [API_BASE_URL, "https://swasthyasetu-backend.onrender.com"].filter(Boolean);
const API_CONFIG_ERROR = (() => {
  if (import.meta.env.DEV) return "";
  if (!API_BASE_URL) return "Missing API base URL. Set VITE_API_BASE_URL on frontend service.";
  try {
    const parsed = new URL(API_BASE_URL);
    if (parsed.protocol !== "https:") {
      return "API base URL must use HTTPS in production.";
    }
    return "";
  } catch {
    return "Invalid API base URL format.";
  }
})();

const ROLE_LOGIN_MAP = {
  [ROLES.SUPER_ADMIN]: { email: "superadmin@swasthyasetu.in", password: "Admin@1234" },
  [ROLES.SCHOOL_ADMIN]: { email: "schooladmin.pune@swasthyasetu.in", password: "Admin@1234" },
  [ROLES.TEACHER]: { email: "teacher.pune@swasthyasetu.in", password: "Admin@1234" },
  [ROLES.HEALTH_WORKER]: { email: "district.pune@swasthyasetu.in", password: "Admin@1234" },
  [ROLES.PARENT]: { email: "parent.pune@swasthyasetu.in", password: "Admin@1234" },
};

const BACKEND_ROLE_TO_UI_ROLE = {
  SUPER_ADMIN: ROLES.SUPER_ADMIN,
  DISTRICT_ADMIN: ROLES.HEALTH_WORKER,
  SCHOOL_ADMIN: ROLES.SCHOOL_ADMIN,
  TEACHER: ROLES.TEACHER,
  PARENT: ROLES.PARENT,
};

const BACKEND_ROLE_LABEL = {
  SUPER_ADMIN: "Super Admin",
  DISTRICT_ADMIN: "District Admin",
  SCHOOL_ADMIN: "School Admin",
  TEACHER: "Teacher",
  PARENT: "Parent",
};

const DISTRICT_ANALYTICS_ROLES = new Set(["SUPER_ADMIN", "DISTRICT_ADMIN"]);
const DISTRICT_COMPARISON_ROLES = new Set(["SUPER_ADMIN", "DISTRICT_ADMIN", "SCHOOL_ADMIN"]);

const UI_ROLE_TO_BACKEND_ROLE = {
  [ROLES.SUPER_ADMIN]: "SUPER_ADMIN",
  [ROLES.SCHOOL_ADMIN]: "SCHOOL_ADMIN",
  [ROLES.TEACHER]: "TEACHER",
  [ROLES.HEALTH_WORKER]: "DISTRICT_ADMIN",
  [ROLES.PARENT]: "PARENT",
};

const UI_ROLE_TO_DEFAULT_NAME = {
  [ROLES.SUPER_ADMIN]: "Platform Super Admin",
  [ROLES.SCHOOL_ADMIN]: "School Admin",
  [ROLES.TEACHER]: "Teacher",
  [ROLES.HEALTH_WORKER]: "District Admin",
  [ROLES.PARENT]: "Parent User",
};

const API_TIMEOUT_MS = 8000;
const API_WARMUP_TIMEOUT_MS = 35000;
const API_MAX_RETRIES = 3;
const API_COLD_START_MAX_WAIT_MS = 90000;
const API_COLD_START_POLL_MS = 2500;
const runtimePersistSession = String(runtimeConfig.PERSIST_SESSION || "").toLowerCase();
const PERSIST_SESSION = (runtimePersistSession ? runtimePersistSession === "true" : String(import.meta.env.VITE_PERSIST_SESSION || "false").toLowerCase() === "true");
let lastClientErrorAt = 0;
let warmupPromise = null;

const emitClientError = (errorPayload) => {
  const now = Date.now();
  if (now - lastClientErrorAt < 5000) {
    return;
  }
  lastClientErrorAt = now;
  const targets = [API_BASE_URL, ...PROD_BACKEND_CANDIDATES].filter(Boolean);
  const payload = {
    source: "frontend",
    message: errorPayload.message || "frontend_error",
    level: errorPayload.level || "error",
    details: errorPayload.details || {},
    path: typeof window !== "undefined" ? window.location.pathname : ""
  };
  for (const target of [...new Set(targets)]) {
    fetch(`${target}/client-errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true
    }).catch(() => {});
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getApiCandidates = () => [...new Set([API_BASE_URL, ...PROD_BACKEND_CANDIDATES].filter(Boolean))];

const isTransientApiError = (error) => {
  const status = Number(error?.status || 0);
  return error?.name === "AbortError" || status === 0 || status === 429 || status >= 500;
};

const requestJson = async (baseUrl, path, { method = "GET", body, token, timeoutMs = API_TIMEOUT_MS } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (!response.ok) {
      let message = "Request failed";
      try {
        const data = await response.json();
        message = data.error || data.detail || message;
      } catch {
        // ignore parse errors
      }
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    if (response.status === 204) {
      return null;
    }

    return response.json();
  } finally {
    clearTimeout(timer);
  }
};

const apiRequest = async (path, options = {}) => {
  if (API_CONFIG_ERROR) {
    throw new Error(API_CONFIG_ERROR);
  }

  const candidates = getApiCandidates();
  const errors = [];
  for (const baseUrl of candidates) {
    for (let attempt = 1; attempt <= API_MAX_RETRIES; attempt += 1) {
      try {
        return await requestJson(baseUrl, path, {
          ...options,
          timeoutMs: attempt === 1 ? API_WARMUP_TIMEOUT_MS : API_TIMEOUT_MS
        });
      } catch (error) {
        const isTimeout = error?.name === "AbortError";
        const status = Number(error?.status || 0);
        const isServerBusy = status >= 500 || status === 429;
        const isNetwork = status === 0;
        const shouldRetry = attempt < API_MAX_RETRIES && (isTimeout || isServerBusy || isNetwork);

        if (!shouldRetry) {
          errors.push({ baseUrl, error });
          break;
        }

        await sleep(1000 * attempt);
      }
    }
  }

  const timeoutFailure = errors.find((entry) => entry.error?.name === "AbortError");
  if (timeoutFailure) {
    emitClientError({
      message: "api_timeout",
      level: "warn",
      details: { path, baseUrl: timeoutFailure.baseUrl }
    });
    throw new Error("Request timed out. Please try again.");
  }
  const firstMeaningfulFailure = errors.find((entry) => Number(entry.error?.status || 0) >= 400);
  if (firstMeaningfulFailure) {
    emitClientError({
      message: "api_request_failed",
      details: {
        path,
        statusCode: Number(firstMeaningfulFailure.error?.status || 0),
        baseUrl: firstMeaningfulFailure.baseUrl
      }
    });
    throw new Error(firstMeaningfulFailure.error?.message || "Request failed");
  }
  emitClientError({ message: "api_unreachable", details: { path } });
  throw new Error("Unable to reach backend API. Please check deployment and CORS settings.");
};

const pingWarmupOnce = async () => {
  const candidates = getApiCandidates();
  let lastError = new Error("Unable to reach backend API. Please check deployment and CORS settings.");
  for (const baseUrl of candidates) {
    try {
      return await requestJson(baseUrl, "/warmup", { timeoutMs: 12000 });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
};

const ensureBackendAwake = async ({ force = false } = {}) => {
  if (API_CONFIG_ERROR) {
    throw new Error(API_CONFIG_ERROR);
  }
  if (warmupPromise && !force) {
    return warmupPromise;
  }
  warmupPromise = (async () => {
    const deadline = Date.now() + API_COLD_START_MAX_WAIT_MS;
    let lastError = null;
    while (Date.now() < deadline) {
      try {
        await pingWarmupOnce();
        return;
      } catch (error) {
        lastError = error;
        if (!isTransientApiError(error)) {
          throw error;
        }
        await sleep(API_COLD_START_POLL_MS);
      }
    }
    throw lastError || new Error("Backend is waking up. Please try again in a moment.");
  })();

  try {
    await warmupPromise;
  } finally {
    warmupPromise = null;
  }
};

const riskLabelFromScore = (score) => {
  if (score >= 0.7) return "High";
  if (score >= 0.4) return "Medium";
  return "Low";
};

const hasItems = (value) => Array.isArray(value) && value.length > 0;

const classLevelFromName = (className) => {
  const normalized = String(className || "").trim();
  if (!normalized) return null;
  const match = normalized.match(/(\d{1,2})/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeClassLabel = (className) => {
  const level = classLevelFromName(className);
  if (!level) return "Class NA";
  return `Class ${level}`;
};

const deriveStudentCategory = (student) => {
  const attendance = Number(student?.attendance ?? 0);
  const bmi = Number(student?.bmi ?? 0);
  const risk = String(student?.riskScore || "Low");
  if (risk === "High" || attendance < 75) return "Critical";
  if (risk === "Medium" || bmi < 16 || bmi > 28) return "At Risk";
  if (!student?.vaccinated || attendance < 85) return "Watchlist";
  return "Stable";
};

const buildHealthDistribution = (studentList) => {
  const total = Math.max(1, studentList.length);
  const bucket = { healthy: 0, mild: 0, moderate: 0, high: 0 };
  studentList.forEach((item) => {
    if (item.riskScore === "High") {
      bucket.high += 1;
      return;
    }
    if (item.riskScore === "Medium") {
      bucket.moderate += 1;
      return;
    }
    if (!item.vaccinated || Number(item.bmi || 0) < 16.5 || Number(item.bmi || 0) > 25) {
      bucket.mild += 1;
      return;
    }
    bucket.healthy += 1;
  });
  return [
    { name: "Healthy", value: Math.round((bucket.healthy * 100) / total), color: "#22c55e" },
    { name: "Mild Issues", value: Math.round((bucket.mild * 100) / total), color: "#f59e0b" },
    { name: "Moderate", value: Math.round((bucket.moderate * 100) / total), color: "#f97316" },
    { name: "High Risk", value: Math.round((bucket.high * 100) / total), color: "#ef4444" },
  ];
};

const buildAttendanceInsightData = (studentList) => {
  const classMap = new Map();
  studentList.forEach((student) => {
    const label = normalizeClassLabel(student.class);
    const current = classMap.get(label) || { attendanceTotal: 0, incidents: 0, count: 0, level: classLevelFromName(label) || 99 };
    current.attendanceTotal += Number(student.attendance || 0);
    current.incidents += student.riskScore === "High" ? 2 : student.riskScore === "Medium" ? 1 : 0;
    current.count += 1;
    classMap.set(label, current);
  });

  const computed = [...classMap.entries()]
    .map(([label, value]) => ({
      month: label.replace("Class ", "C"),
      attendance: Math.round(value.attendanceTotal / Math.max(1, value.count)),
      healthIncidents: value.incidents,
      level: value.level
    }))
    .sort((a, b) => a.level - b.level)
    .slice(0, 9);

  return computed.length > 0 ? computed : attendanceData;
};

const buildScoreDomain = (ranking) => {
  if (!Array.isArray(ranking) || ranking.length === 0) return [0, 100];
  const values = ranking.map((item) => Number(item.score)).filter(Number.isFinite);
  if (values.length === 0) return [0, 100];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max - min < 5) {
    return [Math.max(0, Math.floor(min - 3)), Math.min(100, Math.ceil(max + 3))];
  }
  return [Math.max(0, Math.floor(min - 2)), Math.min(100, Math.ceil(max + 2))];
};

const buildAttendanceSignals = (studentList) => {
  const normalized = Array.isArray(studentList) ? studentList : [];
  const chronic = normalized
    .filter((student) => Number(student?.attendance || 0) < 75)
    .sort((a, b) => Number(a.attendance || 0) - Number(b.attendance || 0));

  const classMap = new Map();
  normalized.forEach((student) => {
    const className = String(student?.class || "Class NA");
    const current = classMap.get(className) || { total: 0, lowCount: 0, count: 0 };
    const attendance = Number(student?.attendance || 0);
    current.total += attendance;
    current.count += 1;
    if (attendance < 80) current.lowCount += 1;
    classMap.set(className, current);
  });

  const classAlerts = [...classMap.entries()]
    .map(([className, value]) => ({
      className,
      avgAttendance: Math.round(value.total / Math.max(1, value.count)),
      lowAttendanceStudents: value.lowCount,
      students: value.count
    }))
    .filter((item) => item.avgAttendance < 82 || item.lowAttendanceStudents >= 3)
    .sort((a, b) => a.avgAttendance - b.avgAttendance);

  const overallAverage = normalized.length
    ? Math.round(normalized.reduce((sum, student) => sum + Number(student?.attendance || 0), 0) / normalized.length)
    : 0;

  return {
    chronicAbsentees: chronic,
    classAlerts,
    overallAverage
  };
};

const parseSymptomList = (text) =>
  String(text || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const buildSymptomClusterSignals = (reports, lookbackDays = 3) => {
  const now = Date.now();
  const windowMs = lookbackDays * 24 * 60 * 60 * 1000;
  const recent = (Array.isArray(reports) ? reports : []).filter((item) => {
    if (String(item?.leaveType || "").toUpperCase() !== "SICK") return false;
    const ts = new Date(item?.reportedAt || item?.date || 0).getTime();
    return Number.isFinite(ts) && now - ts <= windowMs;
  });

  const clusterMap = new Map();
  recent.forEach((report) => {
    const className = String(report?.className || "Unknown Class");
    parseSymptomList(report?.symptoms).forEach((symptom) => {
      const key = `${className}::${symptom}`;
      const current = clusterMap.get(key) || { className, symptom, count: 0, students: [] };
      current.count += 1;
      current.students.push(report.studentName || report.studentId || "Student");
      clusterMap.set(key, current);
    });
  });

  return [...clusterMap.values()]
    .filter((entry) => entry.count >= 2)
    .sort((a, b) => b.count - a.count);
};

const buildOutbreakSignals = (studentsData, sickLeaveReports) => {
  const attendanceSignals = buildAttendanceSignals(studentsData);
  const symptomClusters = buildSymptomClusterSignals(sickLeaveReports, 3);
  const highRisk = (Array.isArray(studentsData) ? studentsData : []).filter((student) => student.riskScore === "High");
  const highConcernSymptoms = new Set(["fever", "vomiting", "rash", "cough", "jaundice", "breathlessness"]);
  const highConcernClusterCount = symptomClusters.filter((cluster) => highConcernSymptoms.has(String(cluster.symptom || "").toLowerCase())).length;
  const triageScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        highRisk.length * 4 +
          attendanceSignals.chronicAbsentees.length * 3 +
          symptomClusters.length * 10 +
          highConcernClusterCount * 8
      )
    )
  );

  const spreadLevel = triageScore >= 70 ? "High" : triageScore >= 40 ? "Medium" : "Low";
  const likelyDiseaseFamily =
    symptomClusters.find((cluster) => ["fever", "vomiting", "rash"].includes(String(cluster.symptom || "").toLowerCase()))
      ? "Vector/Fever Cluster (Dengue-like)"
      : symptomClusters.find((cluster) => ["cough", "breathlessness"].includes(String(cluster.symptom || "").toLowerCase()))
        ? "Respiratory Cluster"
        : symptomClusters.find((cluster) => ["jaundice"].includes(String(cluster.symptom || "").toLowerCase()))
          ? "Water/Food-borne Cluster"
          : "General Health Risk";

  return {
    attendanceSignals,
    symptomClusters,
    triageScore,
    spreadLevel,
    likelyDiseaseFamily
  };
};

const buildOutbreakTrendSeries = (reports, days = 10) => {
  const source = Array.isArray(reports) ? reports : [];
  return Array.from({ length: days }, (_, idx) => {
    const offset = days - idx - 1;
    const day = new Date(Date.now() - offset * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    const dayReports = source.filter((item) => String(item?.date || item?.reportedAt || "").slice(0, 10) === key);
    const symptomCount = dayReports.reduce((acc, entry) => acc + parseSymptomList(entry?.symptoms).length, 0);
    return {
      day: day.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      sickLeaves: dayReports.length,
      symptoms: symptomCount
    };
  });
};

const toDisplaySchoolLabel = (name) => {
  const normalized = String(name || "Unknown School").trim();
  return normalized.length > 24 ? `${normalized.slice(0, 24)}...` : normalized;
};

const mockUsers = [
  { id: 1, name: "Rajesh Kumar Sharma", email: "admin@district.gov.in", role: ROLES.SUPER_ADMIN, district: "Panipat", state: "Haryana" },
  { id: 2, name: "Priya Agarwal", email: "school@gpschool.edu.in", role: ROLES.SCHOOL_ADMIN, school: "Govt. Primary School No. 47", udise: "09231400101" },
  { id: 3, name: "Sunita Devi", email: "teacher@gpschool.edu.in", role: ROLES.TEACHER, class: "Class 6-A", school: "Govt. Primary School No. 47" },
  { id: 4, name: "Dr. Mohan Verma", email: "health@district.gov.in", role: ROLES.HEALTH_WORKER, assigned: "Zone 3" },
  { id: 5, name: "Ramesh Yadav", email: "parent@gmail.com", role: ROLES.PARENT, childId: "STU-2024-047" },
];

const generateStudents = () => {
  const names = ["Aarav Sharma", "Priya Singh", "Rohan Gupta", "Ananya Mishra", "Vikram Patel", "Sneha Yadav", "Arjun Kumar", "Pooja Tiwari", "Rahul Verma", "Divya Chauhan", "Amit Pandey", "Kavita Joshi", "Suresh Nair", "Meera Iyer", "Kiran Reddy", "Aditya Rao", "Geeta Pillai", "Mohit Desai", "Ritu Shah", "Deepak Saxena", "Nisha Tripathi", "Manish Dubey", "Sunita Lal", "Abhishek Malhotra", "Preeti Bajaj", "Sanjay Khanna", "Rekha Aggarwal", "Vinod Bhatia", "Usha Kohli", "Tarun Arora", "Shobha Mehra", "Girish Kapoor", "Anita Srivastava", "Sunil Chandra", "Mamta Rastogi", "Ravi Shankar", "Lalita Prasad", "Hemant Maurya", "Sushma Singh", "Devendra Yadav", "Pushpa Tiwari", "Naresh Sahu", "Saroj Rawat", "Bhupesh Thakur", "Kamla Nishad", "Dinesh Bind", "Sheela Prajapati", "Ramkali Vishwakarma", "Hari Prasad", "Shanti Devi"];
  const classes = ["Nursery", "LKG", "UKG", "Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"];
  const sections = ["A", "B", "C"];
  const bloodGroups = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
  const risks = ["Low", "Low", "Low", "Medium", "Medium", "High"];
  const conditions = ["Healthy", "Anemia", "Malnutrition", "Obesity", "Vision Problem", "Dental Issue", "Skin Condition", "None"];

  return Array.from({ length: 120 }, (_, i) => {
    const name = names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : "");
    const age = Math.floor(Math.random() * 14) + 4;
    const heightCm = 80 + age * 6 + Math.floor(Math.random() * 20) - 10;
    const weightKg = 12 + age * 2.5 + Math.floor(Math.random() * 10) - 5;
    const bmi = (weightKg / ((heightCm / 100) ** 2)).toFixed(1);
    const cls = classes[Math.floor(Math.random() * classes.length)];
    const risk = risks[Math.floor(Math.random() * risks.length)];

    return {
      id: `STU-2024-${String(i + 1).padStart(3, "0")}`,
      name,
      age,
      gender: i % 2 === 0 ? "Male" : "Female",
      class: cls,
      section: sections[Math.floor(Math.random() * sections.length)],
      bloodGroup: bloodGroups[Math.floor(Math.random() * bloodGroups.length)],
      height: heightCm,
      weight: parseFloat(weightKg.toFixed(1)),
      bmi: parseFloat(bmi),
      riskScore: risk,
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      vaccinated: Math.random() > 0.3,
      midDayMeal: Math.random() > 0.2,
      ayushmanCard: Math.random() > 0.5,
      rbsk: Math.random() > 0.4,
      attendance: Math.floor(Math.random() * 40) + 60,
      lastCheckup: `${Math.floor(Math.random() * 28) + 1}/0${Math.floor(Math.random() * 3) + 1}/2025`,
      parentPhone: `98${Math.floor(Math.random() * 100000000).toString().padStart(8, "0")}`,
      address: `Village ${["Rampur", "Sitapur", "Mathura", "Agra"][Math.floor(Math.random() * 4)]}, UP`,
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
    };
  });
};

const students = generateStudents();

const mapBackendStudent = (student, idx = 0) => {
  const riskScore = riskLabelFromScore(Number(student.riskScore ?? 0));
  const recommendedActions = Array.isArray(student?.riskExplanation?.recommended_actions)
    ? student.riskExplanation.recommended_actions
    : [];
  const reasonCodes = Array.isArray(student?.riskExplanation?.reason_codes)
    ? student.riskExplanation.reason_codes
    : [];
  const conditionSignals = student?.riskExplanation?.condition_signals;
  const likelyConditions = Array.isArray(conditionSignals?.likely_conditions)
    ? conditionSignals.likely_conditions
    : [];
  const predictedConditionCode = String(
    student?.riskExplanation?.likely_condition ||
      conditionSignals?.primary_condition ||
      (likelyConditions[0]?.condition || "")
  );
  const readableCondition = predictedConditionCode
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ")
    .replace(" Risk", "");
  const normalizedClass = normalizeClassLabel(student.className || student.class || "");
  const classSuffixMatch = String(student.className || student.class || "").trim().match(/[A-Za-z]$/);
  const section = classSuffixMatch ? classSuffixMatch[0].toUpperCase() : ["A", "B", "C"][idx % 3];
  const eligibility = student?.schemeEligibility || {};
  const vaccinated = String(student.vaccinationStatus || "").toUpperCase() === "COMPLETE";
  const attendance = Math.round(Number(student.attendanceRatio ?? 0.9) * 100);
  const bmiValue = Number(student.bmi ?? 0);
  const fallbackName = `Student ${String(idx + 1).padStart(3, "0")}`;
  return {
    id: student.id,
    name: String(student.name || fallbackName),
    age: 6 + (idx % 11),
    gender: student.gender || "Unknown",
    class: normalizedClass,
    section,
    bloodGroup: ["A+", "B+", "O+", "AB+"][idx % 4],
    height: Number(student.heightCm ?? 0),
    weight: Number(student.weightKg ?? 0),
    bmi: bmiValue,
    riskScore,
    condition: riskScore === "High" ? "Needs Clinical Review" : riskScore === "Medium" ? "Under Observation" : "Healthy",
    vaccinated,
    midDayMeal: String(eligibility?.middayMealStatus || "REGULAR").toUpperCase() !== "NONE",
    ayushmanCard: typeof eligibility?.ayushmanEligible === "boolean" ? eligibility.ayushmanEligible : riskScore !== "Low",
    rbsk: typeof eligibility?.rbsrFlag === "boolean" ? eligibility.rbsrFlag : !vaccinated,
    attendance,
    lastCheckup: new Date(student.createdAt || Date.now()).toLocaleDateString("en-IN"),
    parentPhone: `98${String(10000000 + idx * 137).slice(0, 8)}`,
    address: "Ward-level school catchment, India",
    photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.id}`,
    category: deriveStudentCategory({ riskScore, attendance, bmi: bmiValue, vaccinated }),
    predictedCondition: readableCondition || "General Risk",
    likelyConditions,
    recommendedActions,
    reasonCodes
  };
};

const toReadableReason = (reasonCode) =>
  String(reasonCode || "")
    .toLowerCase()
    .split("_")
    .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join(" ");

const buildDietAdvice = (student) => {
  const tips = [];
  const condition = String(student?.condition || "").toLowerCase();
  const reasons = Array.isArray(student?.reasonCodes) ? student.reasonCodes : [];

  if (condition.includes("anemia") || reasons.includes("BMI_OUT_OF_HEALTHY_RANGE")) {
    tips.push("Add iron-rich foods daily: spinach, lentils, jaggery, dates, and roasted chana.");
    tips.push("Pair meals with vitamin C sources like lemon or amla for better iron absorption.");
  }

  if (condition.includes("malnutrition") || student?.riskScore === "High") {
    tips.push("Provide 3 balanced meals + 2 healthy snacks with protein (eggs/paneer/dal) each day.");
    tips.push("Track weight weekly and share updates during school health follow-up.");
  }

  if (condition.includes("obesity")) {
    tips.push("Reduce sugary drinks and fried snacks; prefer fruits, sprouts, and home-cooked meals.");
    tips.push("Encourage 45-60 minutes of daily physical activity with adequate hydration.");
  }

  if (tips.length === 0) {
    tips.push("Maintain a balanced plate: cereal + protein + vegetables + fruit + enough water.");
    tips.push("Follow regular meal timing and avoid long gaps between meals.");
  }

  return tips.slice(0, 4);
};

const mapBackendCamp = (camp) => {
  const parsedDate = camp?.date ? new Date(camp.date) : null;
  const hasValidDate = parsedDate instanceof Date && !Number.isNaN(parsedDate.valueOf());
  return {
    id: camp.id,
    name: `${camp.campType} Camp`,
    type: camp.campType,
    date: hasValidDate ? parsedDate.toISOString().slice(0, 10) : "TBD",
    status: hasValidDate && parsedDate > new Date() ? "Upcoming" : "Completed",
    students: camp.participantsCount,
    venue: "School Premises",
    doctor: "District Medical Team",
  };
};

const attendanceData = [
  { month: "Apr", attendance: 88, healthIncidents: 12 },
  { month: "May", attendance: 85, healthIncidents: 18 },
  { month: "Jun", attendance: 72, healthIncidents: 28 },
  { month: "Jul", attendance: 78, healthIncidents: 22 },
  { month: "Aug", attendance: 82, healthIncidents: 15 },
  { month: "Sep", attendance: 87, healthIncidents: 10 },
  { month: "Oct", attendance: 91, healthIncidents: 8 },
  { month: "Nov", attendance: 89, healthIncidents: 9 },
  { month: "Dec", attendance: 83, healthIncidents: 14 },
];

const healthDistribution = [
  { name: "Healthy", value: 68, color: "#22c55e" },
  { name: "Mild Issues", value: 18, color: "#f59e0b" },
  { name: "Moderate", value: 10, color: "#f97316" },
  { name: "High Risk", value: 4, color: "#ef4444" },
];

const schemeData = [
  { scheme: "Midday Meal", eligible: 112, covered: 108, missing: 4 },
  { scheme: "RBSK", eligible: 98, covered: 72, missing: 26 },
  { scheme: "Ayushman", eligible: 85, covered: 61, missing: 24 },
  { scheme: "PM Poshan", eligible: 120, covered: 115, missing: 5 },
  { scheme: "Jan Aushadhi", eligible: 100, covered: 64, missing: 36 },
];

const districtData = [
  { school: "Asha Deep Adarsh High School - Karhans", score: 84, rank: 1 },
  { school: "Govt. Senior Secondary School - Panipat City", score: 79, rank: 2 },
  { school: "Model Sanskriti Senior Secondary School - Panipat", score: 76, rank: 3 },
  { school: "Government Girls High School - Israna", score: 91, rank: 4 },
  { school: "DAV Public School - Panipat", score: 88, rank: 5 },
  { school: "Government High School - Samalkha", score: 71, rank: 6 },
];

const climateData = {
  envScore: 67,
  heatwaveRisk: "Medium",
  waterQuality: 74,
  carbonFootprint: 2.3,
  treesPlanted: 142,
  solarPanels: 12,
  wasteRecycled: 68,
};

const healthCamps = [
  { id: 1, name: "Annual Health Checkup Camp", type: "General Checkup", date: "2025-03-15", status: "Upcoming", students: 120, venue: "School Premises", doctor: "Dr. R.K. Gupta" },
  { id: 2, name: "Eye Screening Camp", type: "Eye Checkup", date: "2025-02-28", status: "Completed", students: 98, venue: "School Hall", doctor: "Dr. S. Mehta" },
  { id: 3, name: "Vaccination Drive", type: "Vaccination", date: "2025-03-25", status: "Upcoming", students: 75, venue: "PHC Van", doctor: "Dr. A. Sharma" },
  { id: 4, name: "Blood Donation Camp", type: "Blood Donation", date: "2025-01-20", status: "Completed", students: 45, venue: "School Ground", doctor: "Dr. P. Singh" },
];

const vaccinationSchedule = [
  { vaccine: "Hepatitis B Booster", dueCount: 12, students: ["Aarav Sharma", "Priya Singh", "Rohan Gupta"] },
  { vaccine: "DPT", dueCount: 8, students: ["Ananya Mishra", "Vikram Patel"] },
  { vaccine: "MMR", dueCount: 15, students: ["Sneha Yadav", "Arjun Kumar"] },
  { vaccine: "Typhoid", dueCount: 22, students: ["Pooja Tiwari", "Rahul Verma"] },
];

// ============================================================
// CONTEXT
// ============================================================

const AppContext = createContext(null);

const useApp = () => useContext(AppContext);

// ============================================================
// STYLES & THEME
// ============================================================

const theme = {
  light: {
    bg: "#f8fafc",
    sidebar: "#0f2d5e",
    sidebarText: "#c8d9f0",
    sidebarActive: "#1e4080",
    card: "#ffffff",
    cardBorder: "#e2e8f0",
    text: "#1e293b",
    textMuted: "#64748b",
    accent: "#1e40af",
    accentLight: "#dbeafe",
    success: "#16a34a",
    warning: "#d97706",
    danger: "#dc2626",
    header: "#ffffff",
  },
  dark: {
    bg: "#0f172a",
    sidebar: "#020817",
    sidebarText: "#94a3b8",
    sidebarActive: "#1e293b",
    card: "#1e293b",
    cardBorder: "#334155",
    text: "#f1f5f9",
    textMuted: "#94a3b8",
    accent: "#3b82f6",
    accentLight: "#1e3a5f",
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#ef4444",
    header: "#1e293b",
  }
};

// ============================================================
// UTILITY COMPONENTS
// ============================================================

const Badge = ({ color = "blue", children, size = "sm" }) => {
  const colors = {
    blue: { bg: "#dbeafe", text: "#1d4ed8", border: "#bfdbfe" },
    green: { bg: "#dcfce7", text: "#15803d", border: "#bbf7d0" },
    yellow: { bg: "#fef9c3", text: "#a16207", border: "#fef08a" },
    red: { bg: "#fee2e2", text: "#dc2626", border: "#fecaca" },
    orange: { bg: "#ffedd5", text: "#ea580c", border: "#fed7aa" },
    purple: { bg: "#f3e8ff", text: "#7c3aed", border: "#e9d5ff" },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{
      backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: "999px", padding: size === "sm" ? "2px 10px" : "4px 14px",
      fontSize: size === "sm" ? "11px" : "12px", fontWeight: 600, display: "inline-flex",
      alignItems: "center", gap: "4px"
    }}>
      {children}
    </span>
  );
};

const RiskBadge = ({ risk }) => {
  const map = { Low: "green", Medium: "yellow", High: "red" };
  return <Badge color={map[risk] || "blue"}>{risk === "High" ? "⚠ " : ""}{risk} Risk</Badge>;
};

const StatCard = ({ icon: Icon, label, value, change, color = "#1e40af", bg, sub, onClick }) => {
  const { darkMode, t } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  return (
    <div onClick={onClick} style={{
      background: bg || th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "12px",
      padding: "20px", cursor: onClick ? "pointer" : "default",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", transition: "all 0.2s",
      position: "relative", overflow: "hidden"
    }}
      onMouseEnter={e => onClick && (e.currentTarget.style.transform = "translateY(-2px)")}
      onMouseLeave={e => onClick && (e.currentTarget.style.transform = "translateY(0)")}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ color: th.textMuted, fontSize: "12px", fontWeight: 500, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
          <p style={{ color: bg ? "#fff" : th.text, fontSize: "28px", fontWeight: 700, lineHeight: 1 }}>{value}</p>
          {sub && <p style={{ color: bg ? "rgba(255,255,255,0.75)" : th.textMuted, fontSize: "12px", marginTop: "4px" }}>{sub}</p>}
          {change !== undefined && (
            <p style={{ color: change >= 0 ? "#22c55e" : "#ef4444", fontSize: "12px", marginTop: "6px", display: "flex", alignItems: "center", gap: "3px" }}>
              {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {Math.abs(change)}% vs last month
            </p>
          )}
        </div>
        <div style={{ background: bg ? "rgba(255,255,255,0.2)" : color + "20", borderRadius: "10px", padding: "10px", color: bg ? "#fff" : color }}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
};

const Card = ({ children, style = {}, title, action }) => {
  const { darkMode } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  return (
    <div style={{
      background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "12px",
      boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden", ...style
    }}>
      {title && (
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${th.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ color: th.text, fontSize: "14px", fontWeight: 600 }}>{title}</h3>
          {action}
        </div>
      )}
      <div style={{ padding: "20px" }}>{children}</div>
    </div>
  );
};

const Button = ({ children, onClick, variant = "primary", size = "md", icon: Icon, disabled }) => {
  const { darkMode } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const styles = {
    primary: { bg: th.accent, color: "#fff", border: "none" },
    secondary: { bg: "transparent", color: th.text, border: `1px solid ${th.cardBorder}` },
    danger: { bg: "#dc2626", color: "#fff", border: "none" },
    success: { bg: "#16a34a", color: "#fff", border: "none" },
    ghost: { bg: "transparent", color: th.textMuted, border: "none" },
  };
  const s = styles[variant];
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: s.bg, color: s.color, border: s.border, borderRadius: "8px",
      padding: size === "sm" ? "6px 12px" : size === "lg" ? "12px 24px" : "8px 16px",
      fontSize: size === "sm" ? "12px" : "13px", fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer",
      display: "inline-flex", alignItems: "center", gap: "6px", transition: "opacity 0.2s",
      opacity: disabled ? 0.5 : 1
    }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.opacity = "0.85")}
      onMouseLeave={e => !disabled && (e.currentTarget.style.opacity = "1")}
    >
      {Icon && <Icon size={14} />}{children}
    </button>
  );
};

// ============================================================
// LOGIN PAGE
// ============================================================

const LoginPage = () => {
  const { login, darkMode } = useApp();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const th = theme[darkMode ? "dark" : "light"];

  const roleCards = [
    { role: ROLES.SUPER_ADMIN, label: "Super Admin", sub: "District / State Level", icon: Shield, color: "#7c3aed", user: mockUsers[0] },
    { role: ROLES.SCHOOL_ADMIN, label: "School Admin", sub: "School Management", icon: Building2, color: "#1e40af", user: mockUsers[1] },
    { role: ROLES.TEACHER, label: "Teacher", sub: "Class Teacher View", icon: GraduationCap, color: "#0891b2", user: mockUsers[2] },
    { role: ROLES.HEALTH_WORKER, label: "Health Worker", sub: "District Health Team", icon: Stethoscope, color: "#16a34a", user: mockUsers[3] },
    { role: ROLES.PARENT, label: "Parent", sub: "Child Health View", icon: Baby, color: "#ea580c", user: mockUsers[4] },
  ];

  const handleLogin = async () => {
    if (!selected) return;
    const creds = ROLE_LOGIN_MAP[selected.role];
    if (!creds) {
      setError("No backend login mapped for this role.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login(selected.role, creds.email, creds.password);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: darkMode ? "#020817" : "#eff6ff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "'Noto Sans', 'Segoe UI', sans-serif" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "12px" }}>
          <div style={{ background: "linear-gradient(135deg, #ff9933 0%, #ffffff 50%, #138808 100%)", borderRadius: "12px", padding: "2px" }}>
            <div style={{ background: "#1e40af", borderRadius: "10px", padding: "10px 14px" }}>
              <Heart size={28} color="#fff" />
            </div>
          </div>
          <div style={{ textAlign: "left" }}>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: darkMode ? "#f1f5f9" : "#1e293b", lineHeight: 1.1 }}>SwasthyaSetu</h1>
            <p style={{ fontSize: "11px", color: "#1e40af", fontWeight: 600, letterSpacing: "0.05em" }}>GREEN BHARAT SCHOOL INTELLIGENCE PLATFORM</p>
          </div>
        </div>
        <p style={{ color: darkMode ? "#94a3b8" : "#64748b", fontSize: "13px" }}>Government of India — Ministry of Education & Health</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "8px" }}>
          <span style={{ height: "3px", width: "50px", background: "#ff9933", borderRadius: "2px" }} />
          <span style={{ height: "3px", width: "50px", background: "#ffffff", border: "1px solid #ddd", borderRadius: "2px" }} />
          <span style={{ height: "3px", width: "50px", background: "#138808", borderRadius: "2px" }} />
        </div>
      </div>

      {/* Role Selection */}
      <div style={{ background: th.card, borderRadius: "16px", padding: "32px", boxShadow: "0 4px 24px rgba(0,0,0,0.08)", border: `1px solid ${th.cardBorder}`, maxWidth: "640px", width: "100%" }}>
        <h2 style={{ color: th.text, fontSize: "16px", fontWeight: 700, marginBottom: "6px", textAlign: "center" }}>Select Your Role to Continue</h2>
        <p style={{ color: th.textMuted, fontSize: "12px", textAlign: "center", marginBottom: "24px" }}>Demo Mode — Click any role to preview the dashboard</p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {roleCards.map(rc => (
            <div key={rc.role} onClick={() => setSelected(rc)} style={{
              border: `2px solid ${selected?.role === rc.role ? rc.color : th.cardBorder}`,
              borderRadius: "10px", padding: "16px", cursor: "pointer", transition: "all 0.2s",
              background: selected?.role === rc.role ? rc.color + "12" : "transparent",
              textAlign: "center"
            }}>
              <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: rc.color + "20", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", color: rc.color }}>
                <rc.icon size={22} />
              </div>
              <p style={{ color: th.text, fontWeight: 600, fontSize: "13px" }}>{rc.label}</p>
              <p style={{ color: th.textMuted, fontSize: "11px", marginTop: "2px" }}>{rc.sub}</p>
            </div>
          ))}
        </div>

        <button onClick={handleLogin} disabled={!selected || loading} style={{
          width: "100%", padding: "12px", background: selected ? "#1e40af" : "#94a3b8", color: "#fff",
          border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: selected ? "pointer" : "not-allowed",
          transition: "background 0.2s"
        }}>
          {loading ? "Signing In..." : selected ? `Sign In as ${selected.label}` : "Select a Role to Continue"}
        </button>

        {error && <p style={{ textAlign: "center", color: "#dc2626", fontSize: "12px", marginTop: "12px" }}>{error}</p>}
        <p style={{ textAlign: "center", color: th.textMuted, fontSize: "11px", marginTop: "16px" }}>
          🔒 Secured by Digital India & NIC Infrastructure
        </p>
      </div>
    </div>
  );
};

// ============================================================
// SIDEBAR
// ============================================================

const Sidebar = ({ collapsed, setCollapsed, activePage, setActivePage }) => {
  const { user, logout, darkMode } = useApp();
  const th = theme[darkMode ? "dark" : "light"];

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "students", label: "Students", icon: Users },
    { id: "health-camps", label: "Health Camps", icon: Stethoscope },
    { id: "schemes", label: "Govt. Schemes", icon: Shield },
    { id: "analytics", label: "Analytics", icon: BarChart2 },
    { id: "climate", label: "Climate & Green", icon: Leaf },
    { id: "alerts", label: "Alerts", icon: Bell },
    { id: "reports", label: "Reports", icon: FileText },
  ];

  // Filter nav based on role
  const visibleNav = navItems.filter(item => {
    if (user.role === ROLES.PARENT) return ["dashboard", "alerts"].includes(item.id);
    if (user.role === ROLES.TEACHER) return ["dashboard", "students", "health-camps", "alerts"].includes(item.id);
    return true;
  });

  return (
    <div style={{
      width: collapsed ? "64px" : "240px", minHeight: "100vh", background: th.sidebar,
      transition: "width 0.25s ease", flexShrink: 0, display: "flex", flexDirection: "column",
      position: "fixed", left: 0, top: 0, bottom: 0, zIndex: 100, overflowX: "hidden"
    }}>
      {/* Logo */}
      <div style={{ padding: collapsed ? "16px 12px" : "16px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", gap: "10px", minHeight: "64px" }}>
        <div style={{ width: "36px", height: "36px", background: "#1e40af", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Heart size={18} color="#fff" />
        </div>
        {!collapsed && (
          <div>
            <p style={{ color: "#fff", fontWeight: 800, fontSize: "13px", lineHeight: 1.1 }}>SwasthyaSetu</p>
            <p style={{ color: "#93c5fd", fontSize: "9px", letterSpacing: "0.06em" }}>GREEN BHARAT</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 8px", overflowY: "auto" }}>
        {visibleNav.map(item => (
          <button key={item.id} onClick={() => setActivePage(item.id)} style={{
            width: "100%", display: "flex", alignItems: "center", gap: "10px",
            padding: collapsed ? "10px" : "10px 12px", borderRadius: "8px", marginBottom: "2px",
            background: activePage === item.id ? "rgba(255,255,255,0.12)" : "transparent",
            border: "none", cursor: "pointer", color: activePage === item.id ? "#fff" : th.sidebarText,
            transition: "all 0.15s", justifyContent: collapsed ? "center" : "flex-start"
          }}
            title={collapsed ? item.label : ""}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
            onMouseLeave={e => e.currentTarget.style.background = activePage === item.id ? "rgba(255,255,255,0.12)" : "transparent"}
          >
            <item.icon size={18} style={{ flexShrink: 0 }} />
            {!collapsed && <span style={{ fontSize: "13px", fontWeight: activePage === item.id ? 600 : 400 }}>{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User + Logout */}
      <div style={{ padding: "12px 8px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {!collapsed && (
          <div style={{ padding: "10px 12px", marginBottom: "8px" }}>
            <p style={{ color: "#fff", fontSize: "12px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.name}</p>
            <p style={{ color: "#93c5fd", fontSize: "11px" }}>{user.role.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
          </div>
        )}
        <button onClick={logout} style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start",
          gap: "10px", padding: collapsed ? "10px" : "10px 12px", borderRadius: "8px",
          background: "transparent", border: "none", cursor: "pointer", color: "#f87171"
        }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
        >
          <LogOut size={16} />
          {!collapsed && <span style={{ fontSize: "13px" }}>Sign Out</span>}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// TOP NAVBAR
// ============================================================

const Navbar = ({ collapsed, setCollapsed, activePage, setActivePage }) => {
  const { user, darkMode, setDarkMode, studentsData = students } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const highRisk = studentsData.filter(s => s.riskScore === "High").length;

  return (
    <div style={{
      height: "64px", background: th.header, borderBottom: `1px solid ${th.cardBorder}`,
      display: "flex", alignItems: "center", padding: "0 20px", gap: "16px",
      position: "fixed", top: 0, right: 0, left: collapsed ? "64px" : "240px",
      zIndex: 99, transition: "left 0.25s ease"
    }}>
      <button onClick={() => setCollapsed(!collapsed)} style={{ background: "none", border: "none", cursor: "pointer", color: th.textMuted, display: "flex", alignItems: "center" }}>
        <Menu size={20} />
      </button>

      {/* Breadcrumb */}
      <p style={{ color: th.textMuted, fontSize: "13px" }}>
        <span style={{ color: th.text, fontWeight: 600, textTransform: "capitalize" }}>{activePage.replace("-", " ")}</span>
      </p>

      <div style={{ flex: 1 }} />

      {/* Role Switcher Label */}
      <div style={{ background: th.accentLight, borderRadius: "6px", padding: "4px 10px" }}>
        <p style={{ color: th.accent, fontSize: "11px", fontWeight: 600 }}>DEMO: {user.role.replace(/_/g, " ").toUpperCase()}</p>
      </div>

      {/* Alerts indicator */}
      {highRisk > 0 && (
        <button onClick={() => setActivePage("alerts")} style={{ position: "relative", background: "#fee2e2", border: "none", borderRadius: "8px", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
          <Bell size={15} color="#dc2626" />
          <span style={{ color: "#dc2626", fontSize: "12px", fontWeight: 700 }}>{highRisk}</span>
        </button>
      )}

      {/* Dark mode toggle */}
      <button onClick={() => setDarkMode(!darkMode)} style={{ background: th.cardBorder, border: "none", borderRadius: "8px", padding: "7px", cursor: "pointer", color: th.text, display: "flex", alignItems: "center" }}>
        {darkMode ? <Sun size={16} /> : <Moon size={16} />}
      </button>

      {/* Avatar */}
      <div style={{ width: "34px", height: "34px", background: "#1e40af", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "13px", fontWeight: 700, flexShrink: 0 }}>
        {user.name.charAt(0)}
      </div>
    </div>
  );
};

// ============================================================
// DASHBOARD PAGES
// ============================================================

const SchoolAdminDashboard = () => {
  const { darkMode, studentsData = students, schemeCoverage = schemeData, climateMetrics = climateData, districtRanking = districtData, genAiSchoolSummary, refreshGenAiSchoolSummary, sickLeaveReports = [] } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const highRisk = studentsData.filter(s => s.riskScore === "High");
  const averageAttendance = studentsData.length
    ? Math.round(studentsData.reduce((sum, item) => sum + Number(item.attendance || 0), 0) / studentsData.length)
    : 84;
  const attendanceInsights = buildAttendanceInsightData(studentsData);
  const healthDistributionData = buildHealthDistribution(studentsData);
  const schoolAdminComparison = (Array.isArray(districtRanking) ? districtRanking : [])
    .map((item, idx) => {
      const numericScore = Number(item?.score);
      if (!Number.isFinite(numericScore)) return null;
      return {
        school: String(item?.school || `School ${idx + 1}`),
        score: Math.max(0, Math.min(100, Math.round(numericScore))),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  const schoolComparisonDomain = buildScoreDomain(schoolAdminComparison);
  const outbreakSignals = buildOutbreakSignals(studentsData, sickLeaveReports);

  return (
    <div>
      {/* Emergency Alert Banner */}
      {highRisk.length > 0 && (
        <div style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)", borderRadius: "12px", padding: "14px 20px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px", animation: "pulse 2s infinite" }}>
          <AlertTriangle size={22} color="#fff" />
          <div style={{ flex: 1 }}>
            <p style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>🚨 EMERGENCY ALERT — {highRisk.length} Students at HIGH RISK</p>
            <p style={{ color: "#fecaca", fontSize: "12px" }}>Immediate health screening required. Parents have been notified.</p>
          </div>
          <button style={{ background: "#fff", color: "#dc2626", border: "none", borderRadius: "6px", padding: "6px 14px", fontWeight: 700, cursor: "pointer", fontSize: "12px" }}>View All</button>
        </div>
      )}

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard icon={Users} label="Total Students" value={studentsData.length} change={2.4} color="#1e40af" />
        <StatCard icon={AlertTriangle} label="Health Risk Alerts" value={highRisk.length} change={-1} color="#dc2626" bg="#dc2626" />
        <StatCard icon={Calendar} label="Upcoming Health Camps" value="2" color="#16a34a" />
        <StatCard icon={Shield} label="Scheme Coverage" value={`${Math.round((schemeCoverage[0]?.covered ?? 87) * 100 / Math.max(1, schemeCoverage[0]?.eligible ?? 100))}%`} change={3.2} color="#7c3aed" />
        <StatCard icon={Leaf} label="Climate Risk Score" value={`${climateMetrics.envScore}/100`} color="#059669" sub="AI Generated" />
        <StatCard icon={Activity} label="Avg. Attendance" value={`${averageAttendance}%`} change={-0.8} color="#0891b2" />
        <StatCard icon={AlertCircle} label="Outbreak Spread Risk" value={`${outbreakSignals.triageScore}/100`} color={outbreakSignals.spreadLevel === "High" ? "#dc2626" : outbreakSignals.spreadLevel === "Medium" ? "#d97706" : "#16a34a"} sub={outbreakSignals.spreadLevel} />
      </div>

      {/* Charts Row */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <Card title="Attendance vs Health Incidents (Monthly)">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={attendanceInsights}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: th.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: th.textMuted }} />
              <Tooltip contentStyle={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "8px" }} />
              <Legend />
              <Area type="monotone" dataKey="attendance" stroke="#3b82f6" fill="url(#attGrad)" name="Attendance %" strokeWidth={2} />
              <Line type="monotone" dataKey="healthIncidents" stroke="#ef4444" name="Health Incidents" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Health Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={healthDistributionData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                {healthDistributionData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Government Scheme Quick View */}
      <Card title="Government Scheme Coverage" action={<Button size="sm" variant="secondary" icon={ArrowRight}>View All</Button>}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "12px" }}>
          {schemeCoverage.map(s => (
            <div key={s.scheme} style={{ background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: "8px", padding: "14px", border: `1px solid ${th.cardBorder}` }}>
              <p style={{ color: th.text, fontWeight: 600, fontSize: "13px", marginBottom: "6px" }}>{s.scheme}</p>
              <div style={{ height: "6px", background: darkMode ? "#1e293b" : "#e2e8f0", borderRadius: "3px", marginBottom: "8px" }}>
                <div style={{ height: "100%", width: `${(s.covered / s.eligible * 100).toFixed(0)}%`, background: "#22c55e", borderRadius: "3px" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px" }}>
                <span style={{ color: "#22c55e" }}>{s.covered} Covered</span>
                <span style={{ color: "#ef4444" }}>{s.missing} Missing</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ marginTop: "16px" }}>
        <Card title="District Comparison (Admin View)">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={(schoolAdminComparison.length > 0 ? schoolAdminComparison : districtData.slice(0, 8)).map((entry) => ({
                ...entry,
                shortSchool: toDisplaySchoolLabel(entry.school),
              }))}
              margin={{ top: 8, right: 12, left: 0, bottom: 54 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="shortSchool" angle={-25} textAnchor="end" interval={0} height={62} tick={{ fontSize: 10, fill: th.textMuted }} />
              <YAxis domain={schoolComparisonDomain} tick={{ fontSize: 11, fill: th.textMuted }} />
              <Tooltip contentStyle={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "8px" }} />
              <Bar dataKey="score" name="District Health Score" radius={[4, 4, 0, 0]}>
                {(schoolAdminComparison.length > 0 ? schoolAdminComparison : districtData.slice(0, 8)).map((entry, i) => (
                  <Cell key={i} fill={entry.score >= 85 ? "#22c55e" : entry.score >= 75 ? "#3b82f6" : "#f59e0b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ marginTop: "16px" }}>
        <Card title="Outbreak Early Warning (School)">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", padding: "10px" }}>
              <p style={{ color: th.textMuted, fontSize: "11px" }}>Likely Disease Family</p>
              <p style={{ color: th.text, fontWeight: 700, fontSize: "13px" }}>{outbreakSignals.likelyDiseaseFamily}</p>
              <p style={{ color: th.textMuted, fontSize: "11px", marginTop: "6px" }}>Symptom Clusters: {outbreakSignals.symptomClusters.length}</p>
              <p style={{ color: th.textMuted, fontSize: "11px" }}>Chronic Absentees: {outbreakSignals.attendanceSignals.chronicAbsentees.length}</p>
            </div>
            <div style={{ background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", padding: "10px" }}>
              <p style={{ color: th.textMuted, fontSize: "11px" }}>Immediate Action Plan</p>
              <p style={{ color: th.text, fontSize: "12px" }}>1. Screen fever-symptom students today.</p>
              <p style={{ color: th.text, fontSize: "12px" }}>2. Trigger parent advisory for affected classes.</p>
              <p style={{ color: th.text, fontSize: "12px" }}>3. Create focused camp within 48 hours.</p>
            </div>
          </div>
        </Card>
      </div>

      <div style={{ marginTop: "16px" }}>
        <Card
          title="GenAI School Brief"
          action={<Button size="sm" variant="secondary" onClick={refreshGenAiSchoolSummary}>Refresh</Button>}
        >
          <p style={{ color: th.text, fontSize: "13px", lineHeight: 1.6 }}>
            {genAiSchoolSummary || "No AI summary available yet."}
          </p>
        </Card>
      </div>
    </div>
  );
};

const TeacherDashboard = () => {
  const { darkMode, studentsData = students, callParent, sendSMS, sickLeaveReports = [] } = useApp();
  const th = theme[darkMode ? "dark" : "light"];

  const classStudents = studentsData.slice(0, 35);
  const dueVaccinations = classStudents.filter(s => !s.vaccinated).length;
  const riskCount = { Low: 0, Medium: 0, High: 0 };
  classStudents.forEach(s => riskCount[s.riskScore]++);
  const averageClassAttendance = classStudents.length
    ? Math.round(classStudents.reduce((acc, item) => acc + Number(item.attendance || 0), 0) / classStudents.length)
    : 0;
  const classOutbreakSignals = buildOutbreakSignals(classStudents, sickLeaveReports);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard icon={Users} label="Class Students" value={classStudents.length} color="#1e40af" />
        <StatCard icon={AlertTriangle} label="High Risk" value={riskCount.High} color="#dc2626" bg={riskCount.High > 0 ? "#dc2626" : undefined} />
        <StatCard icon={Syringe} label="Vaccination Due" value={dueVaccinations} color="#d97706" />
        <StatCard icon={Activity} label="Class Attendance" value={`${averageClassAttendance}%`} color="#16a34a" />
        <StatCard icon={AlertCircle} label="Spread Alert" value={classOutbreakSignals.spreadLevel} color={classOutbreakSignals.spreadLevel === "High" ? "#dc2626" : classOutbreakSignals.spreadLevel === "Medium" ? "#d97706" : "#16a34a"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <Card title="Vaccination Due List">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {vaccinationSchedule.map((v, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: "8px" }}>
                <div>
                  <p style={{ color: th.text, fontWeight: 600, fontSize: "13px" }}>{v.vaccine}</p>
                  <p style={{ color: th.textMuted, fontSize: "11px" }}>{v.students.slice(0, 2).join(", ")}{v.students.length > 2 ? " ..." : ""}</p>
                </div>
                <Badge color="orange">{v.dueCount} Due</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Risk Distribution — Class 6A">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[
              { name: "Low Risk", count: riskCount.Low, fill: "#22c55e" },
              { name: "Medium", count: riskCount.Medium, fill: "#f59e0b" },
              { name: "High Risk", count: riskCount.High, fill: "#ef4444" },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: th.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: th.textMuted }} />
              <Tooltip />
              <Bar dataKey="count" name="Students">
                {[{ fill: "#22c55e" }, { fill: "#f59e0b" }, { fill: "#ef4444" }].map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Parent Communication Panel */}
      <Card title="Parent Communication Panel">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {classStudents.filter(s => s.riskScore !== "Low").slice(0, 6).map(s => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 12px", background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: "8px" }}>
              <div style={{ width: "36px", height: "36px", background: s.riskScore === "High" ? "#fee2e2" : "#fef9c3", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                {s.name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ color: th.text, fontWeight: 600, fontSize: "13px" }}>{s.name}</p>
                <p style={{ color: th.textMuted, fontSize: "11px" }}>{s.class} | {s.condition}</p>
              </div>
              <RiskBadge risk={s.riskScore} />
              <button onClick={() => callParent(s.parentPhone, s.name)} style={{ background: "#1e40af", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                <Phone size={11} /> Call
              </button>
              <button onClick={() => sendSMS(s.parentPhone, { studentName: s.name, riskLevel: s.riskScore, condition: s.condition, language: "en" })} style={{ background: "#16a34a", color: "#fff", border: "none", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                <MessageSquare size={11} /> SMS
              </button>
            </div>
          ))}
        </div>
      </Card>

      <div style={{ marginTop: "16px" }}>
        <Card title="Class Outbreak Signals">
          <p style={{ color: th.text, fontSize: "12px", marginBottom: "8px" }}>Likely cluster: <strong>{classOutbreakSignals.likelyDiseaseFamily}</strong></p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {classOutbreakSignals.symptomClusters.slice(0, 4).map((cluster, idx) => (
              <div key={`${cluster.className}-${cluster.symptom}-${idx}`} style={{ padding: "8px", borderRadius: "8px", border: `1px solid ${th.cardBorder}`, background: darkMode ? "#0f172a" : "#f8fafc" }}>
                <p style={{ color: th.text, fontSize: "12px", fontWeight: 700 }}>{cluster.symptom}</p>
                <p style={{ color: th.textMuted, fontSize: "11px" }}>{cluster.count} recent sick leaves</p>
              </div>
            ))}
            {classOutbreakSignals.symptomClusters.length === 0 && (
              <p style={{ color: th.textMuted, fontSize: "12px" }}>No active symptom cluster in this class group.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const ParentDashboard = () => {
  const { darkMode, studentsData = students, callParent, sendSMS, sickLeaveReports = [] } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const child = studentsData[0] || students[46];
  const reasonCodes = Array.isArray(child?.reasonCodes) ? child.reasonCodes : [];
  const recommendedActions = Array.isArray(child?.recommendedActions) ? child.recommendedActions : [];
  const dietAdvice = buildDietAdvice(child);
  const backendRiskLevel = child?.riskScore === "High" ? "HIGH" : child?.riskScore === "Medium" ? "MEDIUM" : "LOW";
  const parentOutbreakSignals = buildOutbreakSignals(studentsData.filter((item) => item.class === child?.class), sickLeaveReports);

  const growthData = [
    { month: "Jan", height: 128, weight: 28, bmi: 17.1 },
    { month: "Feb", height: 128, weight: 28.5, bmi: 17.4 },
    { month: "Mar", height: 129, weight: 29, bmi: 17.4 },
    { month: "Apr", height: 129, weight: 29.2, bmi: 17.5 },
    { month: "May", height: 130, weight: 30, bmi: 17.8 },
    { month: "Jun", height: 130, weight: 30.2, bmi: 17.9 },
  ];

  return (
    <div>
      {/* Child Health Card */}
      <div style={{ background: "linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)", borderRadius: "16px", padding: "24px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "20px" }}>
        <div style={{ width: "72px", height: "72px", background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 800, color: "#fff" }}>
          {child?.name?.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: "#93c5fd", fontSize: "11px", letterSpacing: "0.08em" }}>STUDENT HEALTH CARD</p>
          <h2 style={{ color: "#fff", fontWeight: 800, fontSize: "20px" }}>{child?.name}</h2>
          <p style={{ color: "#bfdbfe", fontSize: "13px" }}>{child?.class} • {child?.id} • Blood Group: {child?.bloodGroup}</p>
        </div>
        <RiskBadge risk={child?.riskScore || "Low"} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard icon={Activity} label="Height" value={`${child?.height} cm`} color="#1e40af" />
        <StatCard icon={Heart} label="Weight" value={`${child?.weight} kg`} color="#16a34a" />
        <StatCard icon={BarChart2} label="BMI" value={child?.bmi} sub="Normal range" color="#7c3aed" />
        <StatCard icon={CheckCircle} label="Vaccination" value={child?.vaccinated ? "Up to Date" : "Pending"} color={child?.vaccinated ? "#16a34a" : "#dc2626"} />
      </div>

      {/* Growth Chart */}
      <Card title="Growth Chart — Height & Weight (2025)" style={{ marginBottom: "16px" }}>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={growthData}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: th.textMuted }} />
            <YAxis tick={{ fontSize: 11, fill: th.textMuted }} />
            <Tooltip contentStyle={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "8px" }} />
            <Legend />
            <Line type="monotone" dataKey="height" stroke="#3b82f6" name="Height (cm)" strokeWidth={2} />
            <Line type="monotone" dataKey="weight" stroke="#22c55e" name="Weight (kg)" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* AI Alert */}
      {child?.riskScore === "High" && (
        <div style={{ background: "#dc2626", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <AlertTriangle size={22} color="#fff" />
          <div style={{ flex: 1 }}>
            <p style={{ color: "#fff", fontWeight: 700 }}>AI Health Risk Alert</p>
            <p style={{ color: "#fecaca", fontSize: "12px" }}>Your child has been flagged for immediate medical attention. Health Worker Assigned: Dr. Mohan Verma</p>
          </div>
          <button onClick={() => callParent("108", "Emergency Helpline")} style={{ background: "#fff", color: "#dc2626", border: "none", borderRadius: "6px", padding: "8px 16px", fontWeight: 700, cursor: "pointer" }}>
            📞 Call Doctor
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <Card title="Student Health Issue Details">
          <p style={{ color: th.text, fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>
            Current status: {child?.condition || "Under Observation"}
          </p>
          {reasonCodes.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px" }}>
              {reasonCodes.map((code) => (
                <Badge key={code} color={child?.riskScore === "High" ? "red" : "yellow"}>
                  {toReadableReason(code)}
                </Badge>
              ))}
            </div>
          ) : (
            <p style={{ color: th.textMuted, fontSize: "12px", marginBottom: "8px" }}>
              No specific risk codes available. Continue routine monitoring.
            </p>
          )}
          <p style={{ color: th.textMuted, fontSize: "12px" }}>
            Attendance: {child?.attendance}% | Vaccination: {child?.vaccinated ? "Up to Date" : "Pending"}
          </p>
        </Card>

        <Card title="Diet Advice for Parent">
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {dietAdvice.map((tip, idx) => (
              <p key={idx} style={{ color: th.text, fontSize: "12px" }}>• {tip}</p>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Class Spread Alert for Parent" style={{ marginBottom: "16px" }}>
        <p style={{ color: th.text, fontSize: "12px", marginBottom: "8px" }}>
          Current spread level in {child?.class}: <strong>{parentOutbreakSignals.spreadLevel}</strong>
        </p>
        <p style={{ color: th.textMuted, fontSize: "12px", marginBottom: "6px" }}>Likely cluster: {parentOutbreakSignals.likelyDiseaseFamily}</p>
        <p style={{ color: th.textMuted, fontSize: "12px" }}>Recommended: monitor fever/vomiting/cough, maintain hydration, and seek doctor care quickly for persistent symptoms.</p>
      </Card>

      <Card title="Recommended Action Plan">
        {recommendedActions.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: "10px" }}>
            {recommendedActions.map((action, idx) => (
              <div key={`${action.type}-${idx}`} style={{ border: `1px solid ${th.cardBorder}`, borderRadius: "10px", padding: "10px", background: darkMode ? "#0f172a" : "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <p style={{ color: th.text, fontSize: "12px", fontWeight: 700 }}>{action.title}</p>
                  <Badge color={action.priority === "high" ? "red" : action.priority === "medium" ? "yellow" : "green"}>
                    {String(action.priority || "low").toUpperCase()}
                  </Badge>
                </div>
                <p style={{ color: th.textMuted, fontSize: "11px", marginBottom: "6px" }}>{action.recommendation}</p>
                {(action.tasks || []).slice(0, 2).map((task, tIdx) => (
                  <p key={tIdx} style={{ color: th.text, fontSize: "11px" }}>• {task}</p>
                ))}
                <button
                  onClick={() =>
                    sendSMS(child?.parentPhone, {
                      studentName: child?.name || "Student",
                      riskLevel: backendRiskLevel,
                      condition: child?.condition || undefined,
                      language: "en",
                      readingLevel: "simple",
                      message: action.parentScript || "Please coordinate with school health desk for follow-up."
                    })
                  }
                  style={{ marginTop: "8px", width: "100%", padding: "6px", background: th.accentLight, color: th.accent, border: `1px solid ${th.cardBorder}`, borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}
                >
                  Send Advice SMS
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: th.textMuted, fontSize: "12px" }}>
            Action plan is being prepared. Please follow diet advice and consult school health desk.
          </p>
        )}
      </Card>
    </div>
  );
};

const SuperAdminDashboard = () => {
  const { darkMode, districtRanking = districtData, districtClimateRisk, studentsData = students, genAiSchoolSummary, refreshGenAiSchoolSummary, sickLeaveReports = [] } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const normalizedRanking = (Array.isArray(districtRanking) ? districtRanking : [])
    .map((item, idx) => {
      const numericScore = Number(item?.score);
      if (!Number.isFinite(numericScore)) return null;
      return {
        school: String(item?.school || `School ${idx + 1}`),
        score: Math.max(0, Math.min(100, Number(numericScore.toFixed(1)))),
        rank: Number(item?.rank || idx + 1)
      };
    })
    .filter(Boolean);
  const rankingData = normalizedRanking.length > 0 ? normalizedRanking : districtData.map((item) => ({
    school: String(item.school),
    score: Number(item.score),
    rank: Number(item.rank)
  }));
  const sortedRanking = [...rankingData].sort((a, b) => b.score - a.score);
  const avgDistrictScore = rankingData.length
    ? Math.round(rankingData.reduce((acc, item) => acc + item.score, 0) / rankingData.length)
    : 76;
  const rankingDomain = buildScoreDomain(sortedRanking.slice(0, 12));
  const districtOutbreakSignals = buildOutbreakSignals(studentsData, sickLeaveReports);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <StatCard icon={Building2} label="Total Schools" value={rankingData.length || 342} change={1.2} color="#7c3aed" />
        <StatCard icon={Users} label="Total Students" value={studentsData.length || "41,280"} change={3.1} color="#1e40af" />
        <StatCard icon={AlertTriangle} label="District Alerts" value={districtClimateRisk?.heatAlertDays ?? 47} bg="#dc2626" color="#dc2626" />
        <StatCard icon={Shield} label="Scheme Coverage" value="79%" change={2.8} color="#16a34a" />
        <StatCard icon={Activity} label="Health Camps (YTD)" value="128" color="#0891b2" />
        <StatCard icon={Award} label="District Health Score" value={`${avgDistrictScore}/100`} color="#d97706" />
        <StatCard icon={AlertCircle} label="District Spread Risk" value={`${districtOutbreakSignals.triageScore}/100`} color={districtOutbreakSignals.spreadLevel === "High" ? "#dc2626" : districtOutbreakSignals.spreadLevel === "Medium" ? "#d97706" : "#16a34a"} sub={districtOutbreakSignals.spreadLevel} />
      </div>

      {/* School Rankings */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <Card title="🏆 School Health Rankings — Panipat District">
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sortedRanking.slice(0, 12).map((s, i) => (
              <div key={s.school} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px", background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: "8px" }}>
                <div style={{ width: "28px", height: "28px", background: i < 3 ? ["#f59e0b", "#9ca3af", "#cd7c4f"][i] : "#e2e8f0", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: i < 3 ? "#fff" : th.textMuted }}>
                  {s.rank || i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: th.text, fontWeight: 600, fontSize: "13px" }}>{s.school}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ color: th.text, fontWeight: 700, fontSize: "15px" }}>{s.score.toFixed(1)}</p>
                  <div style={{ height: "4px", width: "60px", background: "#e2e8f0", borderRadius: "2px" }}>
                    <div style={{ height: "100%", width: `${s.score}%`, background: s.score >= 85 ? "#22c55e" : s.score >= 75 ? "#f59e0b" : "#ef4444", borderRadius: "2px" }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="District Comparison (Super Admin View)">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sortedRanking.slice(0, 12).map((entry) => ({ ...entry, shortSchool: toDisplaySchoolLabel(entry.school) }))} margin={{ top: 8, right: 12, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="shortSchool" angle={-25} textAnchor="end" interval={0} height={60} tick={{ fontSize: 10, fill: th.textMuted }} />
              <YAxis domain={rankingDomain} tick={{ fontSize: 11, fill: th.textMuted }} />
              <Tooltip contentStyle={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "8px" }} />
              <Bar dataKey="score" name="Health Score" radius={[4, 4, 0, 0]}>
                {sortedRanking.slice(0, 12).map((entry, i) => (
                  <Cell key={i} fill={entry.score >= 85 ? "#22c55e" : entry.score >= 75 ? "#3b82f6" : "#f59e0b"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div style={{ marginBottom: "16px" }}>
        <Card title="District Outbreak Intelligence">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
            <div style={{ background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", padding: "10px" }}>
              <p style={{ color: th.textMuted, fontSize: "11px" }}>Likely Disease Family</p>
              <p style={{ color: th.text, fontWeight: 700, fontSize: "13px" }}>{districtOutbreakSignals.likelyDiseaseFamily}</p>
            </div>
            <div style={{ background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", padding: "10px" }}>
              <p style={{ color: th.textMuted, fontSize: "11px" }}>Symptom Clusters</p>
              <p style={{ color: th.text, fontWeight: 700, fontSize: "13px" }}>{districtOutbreakSignals.symptomClusters.length}</p>
            </div>
            <div style={{ background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", padding: "10px" }}>
              <p style={{ color: th.textMuted, fontSize: "11px" }}>Chronic Absentees</p>
              <p style={{ color: th.text, fontWeight: 700, fontSize: "13px" }}>{districtOutbreakSignals.attendanceSignals.chronicAbsentees.length}</p>
            </div>
          </div>
        </Card>
      </div>
      <Card
        title="GenAI Executive Brief"
        action={<Button size="sm" variant="secondary" onClick={refreshGenAiSchoolSummary}>Refresh</Button>}
      >
        <p style={{ color: th.text, fontSize: "13px", lineHeight: 1.6 }}>
          {genAiSchoolSummary || "No executive brief available yet."}
        </p>
      </Card>
    </div>
  );
};

// ============================================================
// STUDENTS PAGE
// ============================================================

const StudentsPage = () => {
  const { darkMode, studentsData = students } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState("All");
  const [filterClass, setFilterClass] = useState("All");
  const [selected, setSelected] = useState(null);
  const classOptions = ["All", ...new Set(studentsData.map((item) => String(item.class || "Class NA")))];
  const categorySummary = studentsData.reduce((acc, item) => {
    const key = String(item.category || deriveStudentCategory(item));
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const filtered = studentsData.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.id.includes(search);
    const matchRisk = filterRisk === "All" || s.riskScore === filterRisk;
    const matchClass = filterClass === "All" || s.class === filterClass;
    return matchSearch && matchRisk && matchClass;
  });

  if (selected) return <StudentProfile student={selected} onBack={() => setSelected(null)} />;

  return (
    <div>
      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: "200px", position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: th.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students by name or ID..." style={{ width: "100%", padding: "8px 10px 8px 32px", background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "8px", color: th.text, fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
        </div>
        {["All", "Low", "Medium", "High"].map(r => (
          <button key={r} onClick={() => setFilterRisk(r)} style={{ padding: "8px 16px", borderRadius: "8px", border: `1px solid ${filterRisk === r ? th.accent : th.cardBorder}`, background: filterRisk === r ? th.accentLight : th.card, color: filterRisk === r ? th.accent : th.text, fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
            {r === "All" ? "All Students" : `${r} Risk`}
          </button>
        ))}
        <select
          value={filterClass}
          onChange={(e) => setFilterClass(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: `1px solid ${th.cardBorder}`, background: th.card, color: th.text, fontWeight: 600, fontSize: "12px", cursor: "pointer" }}
        >
          {classOptions.map((className) => (
            <option key={className} value={className}>{className === "All" ? "All Classes" : className}</option>
          ))}
        </select>
        <div style={{ padding: "6px 12px", background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "8px", color: th.textMuted, fontSize: "12px", display: "flex", alignItems: "center" }}>
          {filtered.length} students
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "10px", marginBottom: "16px" }}>
        {["Critical", "At Risk", "Watchlist", "Stable"].map((key) => (
          <div key={key} style={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "10px", padding: "10px 12px" }}>
            <p style={{ color: th.textMuted, fontSize: "11px" }}>{key}</p>
            <p style={{ color: th.text, fontSize: "17px", fontWeight: 700 }}>{Number(categorySummary[key] || 0)}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "12px", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: darkMode ? "#0f172a" : "#f8fafc" }}>
                {["ID", "Name", "Class", "Category", "Blood", "BMI", "Condition", "Risk", "Schemes", "Action"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: th.textMuted, fontWeight: 600, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `1px solid ${th.cardBorder}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((s, i) => (
                <tr key={s.id} style={{ borderBottom: `1px solid ${th.cardBorder}`, transition: "background 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = darkMode ? "#1e293b" : "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "12px 16px", color: th.textMuted, fontFamily: "monospace", fontSize: "11px" }}>{s.id}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "28px", height: "28px", background: `hsl(${i * 37 % 360}, 60%, 80%)`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "#fff" }}>
                        {s.name.charAt(0)}
                      </div>
                      <span style={{ color: th.text, fontWeight: 500 }}>{s.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px", color: th.text }}>{s.class}-{s.section}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <Badge color={s.category === "Critical" ? "red" : s.category === "At Risk" ? "orange" : s.category === "Watchlist" ? "yellow" : "green"}>{s.category || deriveStudentCategory(s)}</Badge>
                  </td>
                  <td style={{ padding: "12px 16px" }}><Badge color="blue">{s.bloodGroup}</Badge></td>
                  <td style={{ padding: "12px 16px", color: s.bmi > 25 ? "#ef4444" : s.bmi < 16 ? "#f59e0b" : "#16a34a", fontWeight: 600 }}>{s.bmi}</td>
                  <td style={{ padding: "12px 16px", color: th.textMuted }}>{s.condition}</td>
                  <td style={{ padding: "12px 16px" }}><RiskBadge risk={s.riskScore} /></td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {s.midDayMeal && <Badge color="green" size="xs">MDM</Badge>}
                      {s.ayushmanCard && <Badge color="purple" size="xs">AB</Badge>}
                    </div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button onClick={() => setSelected(s)} style={{ background: th.accentLight, color: th.accent, border: "none", borderRadius: "6px", padding: "5px 10px", cursor: "pointer", fontSize: "11px", fontWeight: 600, display: "flex", alignItems: "center", gap: "3px" }}>
                      <Eye size={11} /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// STUDENT PROFILE
// ============================================================

const StudentProfile = ({ student: s, onBack }) => {
  const { darkMode, generateReport, sendSMS } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const actionLabel = {
    nutrition: "Nutrition Counseling",
    health_camp: "Health Camp Referral",
    parent_counseling: "Parent Counseling"
  };

  const growthData = Array.from({ length: 6 }, (_, i) => ({
    month: ["Aug", "Sep", "Oct", "Nov", "Dec", "Jan"][i],
    height: s.height - 5 + i,
    weight: s.weight - 2 + i * 0.3,
    bmi: parseFloat((s.weight - 2 + i * 0.3) / ((s.height - 5 + i) / 100) ** 2).toFixed(1),
  }));

  const timeline = [
    { date: "15 Jan 2025", event: "General Health Checkup", status: "completed", doctor: "Dr. R.K. Gupta" },
    { date: "20 Nov 2024", event: "Eye Screening", status: "completed", doctor: "Dr. S. Mehta" },
    { date: "05 Oct 2024", event: "Typhoid Vaccination", status: "completed", doctor: "PHC Team" },
    { date: "22 Aug 2024", event: "Annual Dental Checkup", status: "completed", doctor: "Dr. P. Singh" },
  ];

  return (
    <div>
      {/* Back */}
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", color: th.accent, cursor: "pointer", fontWeight: 600, fontSize: "13px", marginBottom: "16px" }}>
        ← Back to Students
      </button>

      {/* Profile Header — CoWIN/Ayushman style */}
      <div style={{ background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #2563eb 100%)", borderRadius: "16px", padding: "24px", marginBottom: "20px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", flexWrap: "wrap" }}>
          <div style={{ width: "80px", height: "80px", background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: 800, color: "#fff", border: "3px solid rgba(255,255,255,0.4)", flexShrink: 0 }}>
            {s.name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "6px" }}>
              <h2 style={{ color: "#fff", fontSize: "22px", fontWeight: 800 }}>{s.name}</h2>
              <RiskBadge risk={s.riskScore} />
            </div>
            <p style={{ color: "#93c5fd", fontSize: "13px", marginBottom: "12px" }}>
              {s.id} • {s.class}-{s.section} • {s.gender} • Age: {s.age} yrs
            </p>
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
              {[
                { label: "Blood Group", value: s.bloodGroup },
                { label: "Address", value: s.address },
                { label: "Last Checkup", value: s.lastCheckup },
                { label: "Parent Phone", value: s.parentPhone },
              ].map(f => (
                <div key={f.label}>
                  <p style={{ color: "#93c5fd", fontSize: "10px", letterSpacing: "0.06em" }}>{f.label.toUpperCase()}</p>
                  <p style={{ color: "#fff", fontWeight: 600, fontSize: "13px" }}>{f.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Scheme Badges */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ background: s.ayushmanCard ? "#16a34a" : "#6b7280", borderRadius: "8px", padding: "6px 12px", textAlign: "center" }}>
              <p style={{ color: "#fff", fontSize: "10px", fontWeight: 700 }}>AYUSHMAN BHARAT</p>
              <p style={{ color: s.ayushmanCard ? "#bbf7d0" : "#d1d5db", fontSize: "10px" }}>{s.ayushmanCard ? "✓ Enrolled" : "Not Enrolled"}</p>
            </div>
            <div style={{ background: s.midDayMeal ? "#2563eb" : "#6b7280", borderRadius: "8px", padding: "6px 12px", textAlign: "center" }}>
              <p style={{ color: "#fff", fontSize: "10px", fontWeight: 700 }}>MID DAY MEAL</p>
              <p style={{ color: s.midDayMeal ? "#bfdbfe" : "#d1d5db", fontSize: "10px" }}>{s.midDayMeal ? "✓ Active" : "Inactive"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Height", value: `${s.height} cm`, icon: Activity, color: "#1e40af" },
          { label: "Weight", value: `${s.weight} kg`, icon: Heart, color: "#16a34a" },
          { label: "BMI", value: s.bmi, icon: BarChart2, color: s.bmi > 25 ? "#dc2626" : s.bmi < 16 ? "#d97706" : "#16a34a" },
          { label: "Attendance", value: `${s.attendance}%`, icon: CheckCircle, color: "#7c3aed" },
        ].map(st => <StatCard key={st.label} {...st} />)}
      </div>

      {/* Growth Chart + Health Timeline */}
      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <Card title="Growth Chart (Last 6 Months)">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: th.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: th.textMuted }} />
              <Tooltip contentStyle={{ background: th.card, borderRadius: "8px" }} />
              <Legend />
              <Line type="monotone" dataKey="height" stroke="#3b82f6" name="Height (cm)" strokeWidth={2} />
              <Line type="monotone" dataKey="weight" stroke="#22c55e" name="Weight (kg)" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Health Timeline">
          <div style={{ position: "relative" }}>
            {timeline.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: "12px", marginBottom: i < timeline.length - 1 ? "16px" : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#22c55e", border: "2px solid #16a34a", flexShrink: 0 }} />
                  {i < timeline.length - 1 && <div style={{ width: "2px", flex: 1, background: darkMode ? "#334155" : "#e2e8f0", minHeight: "24px" }} />}
                </div>
                <div style={{ paddingBottom: "8px" }}>
                  <p style={{ color: th.text, fontWeight: 600, fontSize: "12px" }}>{t.event}</p>
                  <p style={{ color: th.textMuted, fontSize: "11px" }}>{t.date} • {t.doctor}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Vaccination + Disease Flags */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        <Card title="Vaccination Status">
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {["BCG", "OPV", "DPT", "Hepatitis B", "MMR", "Typhoid", "Vitamin A"].map((v, i) => (
              <div key={v} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: "6px" }}>
                <span style={{ color: th.text, fontSize: "13px" }}>{v}</span>
                <Badge color={i < 5 ? "green" : "yellow"}>{i < 5 ? "✓ Done" : "Pending"}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Disease Flags & Conditions">
          <div style={{ marginBottom: "16px" }}>
            <p style={{ color: th.textMuted, fontSize: "11px", marginBottom: "6px" }}>CURRENT CONDITION</p>
            <Badge color={s.condition === "Healthy" ? "green" : "orange"}>{s.condition}</Badge>
          </div>
          <div style={{ marginBottom: "12px" }}>
            <p style={{ color: th.textMuted, fontSize: "11px", marginBottom: "6px" }}>PREDICTED LIKELY CONDITION</p>
            <Badge color={s.riskScore === "High" ? "red" : s.riskScore === "Medium" ? "yellow" : "green"}>
              {s.predictedCondition || "General Risk"}
            </Badge>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {(Array.isArray(s.likelyConditions) && s.likelyConditions.length > 0
              ? s.likelyConditions.slice(0, 4)
              : [{ condition: "GENERAL_RISK", score: s.riskScore === "High" ? 0.8 : s.riskScore === "Medium" ? 0.55 : 0.25, level: s.riskScore?.toUpperCase?.() || "LOW" }]
            ).map((entry, index) => {
              const label = String(entry?.condition || "GENERAL_RISK")
                .toLowerCase()
                .split("_")
                .map((part) => (part ? part.charAt(0).toUpperCase() + part.slice(1) : part))
                .join(" ")
                .replace(" Risk", "");
              const level = String(entry?.level || "LOW").toUpperCase();
              return (
                <div key={`${label}-${index}`} style={{ display: "flex", justifyContent: "space-between", padding: "6px 10px", background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: "6px" }}>
                  <span style={{ color: th.text, fontSize: "12px" }}>{label}</span>
                  <span style={{ color: level === "HIGH" ? "#ef4444" : level === "MEDIUM" ? "#f59e0b" : "#22c55e", fontSize: "11px", fontWeight: 600 }}>
                    {level} • {Math.round(Number(entry?.score || 0) * 100)}%
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Recommended Actions */}
      <Card title="Recommended Actions by Risk Type">
        {Array.isArray(s.recommendedActions) && s.recommendedActions.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
            {s.recommendedActions.map((action, index) => (
              <div key={`${action.type}-${index}`} style={{ border: `1px solid ${th.cardBorder}`, borderRadius: "10px", padding: "12px", background: darkMode ? "#0f172a" : "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <p style={{ color: th.text, fontSize: "12px", fontWeight: 700 }}>{actionLabel[action.type] || action.type}</p>
                  <Badge color={action.priority === "high" ? "red" : action.priority === "medium" ? "yellow" : "green"}>
                    {String(action.priority || "low").toUpperCase()}
                  </Badge>
                </div>
                <p style={{ color: th.text, fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>{action.title}</p>
                <p style={{ color: th.textMuted, fontSize: "11px", marginBottom: "8px" }}>{action.recommendation}</p>
                <div style={{ marginBottom: "8px" }}>
                  {(action.tasks || []).slice(0, 3).map((task, taskIdx) => (
                    <p key={taskIdx} style={{ color: th.text, fontSize: "11px", marginBottom: "3px" }}>• {task}</p>
                  ))}
                </div>
                <button
                  onClick={() => sendSMS(s.parentPhone, action.parentScript || "Please contact school health desk for follow-up.")}
                  style={{ width: "100%", padding: "6px", background: th.accentLight, color: th.accent, border: `1px solid ${th.cardBorder}`, borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: 600 }}
                >
                  Send Parent Counseling SMS
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: th.textMuted, fontSize: "12px" }}>No recommendation data available yet for this student profile.</p>
        )}
      </Card>

      {/* Download Report */}
      <Card title="Download Health Report">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <p style={{ color: th.text, fontSize: "13px", fontWeight: 600 }}>Student Health Report — {s.name}</p>
            <p style={{ color: th.textMuted, fontSize: "12px" }}>Includes growth charts, vaccination records, risk assessment & scheme status</p>
          </div>
          <Button icon={Download} variant="primary" onClick={() => generateReport(`student-health-${s.id}.json`, { student: s, generatedAt: new Date().toISOString() })}>Download PDF Report</Button>
          <Button icon={FileText} variant="secondary" onClick={() => window.print()}>Print Card</Button>
        </div>
      </Card>
    </div>
  );
};

// ============================================================
// HEALTH CAMPS PAGE
// ============================================================

const HealthCampsPage = () => {
  const { darkMode, healthCampsData = healthCamps, createHealthCamp, user, studentsData = students, sickLeaveReports = [] } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    campType: "General Checkup",
    participantsCount: "100",
    date: "",
  });

  const campTypeColors = { "General Checkup": "blue", "Eye Checkup": "purple", "Vaccination": "green", "Blood Donation": "red", "VISION_DENTAL": "purple", "ANEMIA_SCREENING": "orange", "OUTBREAK_SCREENING": "red", "RESPIRATORY_SCREENING": "orange" };
  const campTypeIcons = { "General Checkup": Stethoscope, "Eye Checkup": Eye, "Vaccination": Syringe, "Blood Donation": Heart };
  const outbreakSignals = buildOutbreakSignals(studentsData, sickLeaveReports);

  const handleCreateCamp = async () => {
    if (!form.date || !createHealthCamp) return;
    const participantsCount = Number.parseInt(String(form.participantsCount || "0"), 10);
    if (Number.isNaN(participantsCount) || participantsCount < 0) {
      alert("Please enter a valid participant count.");
      return;
    }
    setSaving(true);
    try {
      await createHealthCamp({
        campType: form.campType,
        date: new Date(form.date).toISOString(),
        participantsCount,
      });
      setShowCreate(false);
      setForm({ campType: "General Checkup", participantsCount: "100", date: "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ color: th.text, fontWeight: 700, fontSize: "16px" }}>Health Camps Management</h2>
        <Button icon={Plus} onClick={() => setShowCreate(!showCreate)}>Create Camp</Button>
      </div>

      <Card title="Outbreak-driven Camp Recommendation" style={{ marginBottom: "16px" }}>
        <p style={{ color: th.text, fontSize: "12px" }}>
          Spread risk is <strong>{outbreakSignals.spreadLevel}</strong> ({outbreakSignals.triageScore}/100). Recommended next camp:
          {" "}
          <strong>{outbreakSignals.likelyDiseaseFamily.includes("Respiratory") ? "RESPIRATORY_SCREENING" : "OUTBREAK_SCREENING"}</strong>.
        </p>
      </Card>

      {/* Create Camp Form */}
      {showCreate && (
        <Card style={{ marginBottom: "20px" }} title="Create New Health Camp">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ color: th.textMuted, fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "6px" }}>EXPECTED STUDENTS</label>
              <input value={form.participantsCount} onChange={e => setForm(prev => ({ ...prev, participantsCount: e.target.value }))} placeholder="Enter expected students..." style={{ width: "100%", padding: "8px 12px", background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", color: th.text, fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ color: th.textMuted, fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "6px" }}>CAMP TYPE</label>
              <select value={form.campType} onChange={e => setForm(prev => ({ ...prev, campType: e.target.value }))} style={{ width: "100%", padding: "8px 12px", background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", color: th.text, fontSize: "13px", outline: "none" }}>
                {Object.keys(campTypeColors).map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: th.textMuted, fontSize: "11px", fontWeight: 600, display: "block", marginBottom: "6px" }}>DATE</label>
              <input value={form.date} onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))} type="date" style={{ width: "100%", padding: "8px 12px", background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", color: th.text, fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div style={{ marginTop: "16px", display: "flex", gap: "8px" }}>
            <Button icon={CheckCircle} variant="success" onClick={handleCreateCamp} disabled={saving || !user?.schoolId}>{saving ? "Saving..." : "Save Camp"}</Button>
            <Button variant="secondary" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Camp Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {healthCampsData.map(camp => {
          const Icon = campTypeIcons[camp.type] || Stethoscope;
          return (
            <div key={camp.id} style={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "12px", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ padding: "16px 20px", borderBottom: `1px solid ${th.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "40px", height: "40px", background: th.accentLight, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: th.accent }}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p style={{ color: th.text, fontWeight: 700, fontSize: "13px" }}>{camp.name}</p>
                    <Badge color={campTypeColors[camp.type]}>{camp.type}</Badge>
                  </div>
                </div>
                <Badge color={camp.status === "Completed" ? "green" : "orange"}>{camp.status}</Badge>
              </div>
              <div style={{ padding: "16px 20px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <p style={{ color: th.textMuted, fontSize: "10px", marginBottom: "2px" }}>DATE</p>
                    <p style={{ color: th.text, fontWeight: 600, fontSize: "12px" }}>{camp.date}</p>
                  </div>
                  <div>
                    <p style={{ color: th.textMuted, fontSize: "10px", marginBottom: "2px" }}>STUDENTS</p>
                    <p style={{ color: th.text, fontWeight: 600, fontSize: "12px" }}>{camp.students}</p>
                  </div>
                  <div>
                    <p style={{ color: th.textMuted, fontSize: "10px", marginBottom: "2px" }}>VENUE</p>
                    <p style={{ color: th.text, fontWeight: 600, fontSize: "12px" }}>{camp.venue}</p>
                  </div>
                  <div>
                    <p style={{ color: th.textMuted, fontSize: "10px", marginBottom: "2px" }}>DOCTOR</p>
                    <p style={{ color: th.text, fontWeight: 600, fontSize: "12px" }}>{camp.doctor}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Camp Analytics */}
      <Card title="Camp Participation Analytics">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={healthCampsData.map(c => ({ name: c.type.split(" ")[0], students: c.students, target: 120 }))}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: th.textMuted }} />
            <YAxis tick={{ fontSize: 11, fill: th.textMuted }} />
            <Tooltip contentStyle={{ background: th.card, borderRadius: "8px" }} />
            <Legend />
            <Bar dataKey="students" name="Participated" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="target" name="Target" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

// ============================================================
// GOVERNMENT SCHEMES PAGE
// ============================================================

const SchemesPage = () => {
  const { darkMode, sendSMS, studentsData = students } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const vaccinationGap = studentsData.filter((student) => !student.vaccinated).length;

  const schemes = [
    { name: "Midday Meal Scheme (PM POSHAN)", icon: "🍱", color: "#f59e0b", eligible: 112, covered: 108, missing: 4, missingDocs: ["Aadhaar Card", "Caste Certificate"] },
    { name: "Rashtriya Bal Swasthya Karyakram", icon: "🏥", color: "#3b82f6", eligible: 98, covered: 72, missing: 26, missingDocs: ["Birth Certificate", "Health Card"] },
    { name: "Ayushman Bharat (PM-JAY)", icon: "💊", color: "#7c3aed", eligible: 85, covered: 61, missing: 24, missingDocs: ["BPL Certificate", "Ration Card"] },
    { name: "Pradhan Mantri Bhartiya Janaushadhi Pariyojana", icon: "💉", color: "#0ea5a4", eligible: 100, covered: 64, missing: 36, missingDocs: ["Aadhaar Card", "Mobile Number"] },
    { name: "National Scholarship Portal", icon: "📚", color: "#16a34a", eligible: 45, covered: 38, missing: 7, missingDocs: ["Bank Account", "Mark Sheet"] },
  ];

  return (
    <div>
      <Card title="Disease Prevention Coverage Snapshot" style={{ marginBottom: "16px" }}>
        <p style={{ color: th.text, fontSize: "12px" }}>
          Students with vaccination gap: <strong>{vaccinationGap}</strong>. Prioritize catch-up drives to reduce spread of vaccine-preventable diseases.
        </p>
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {schemes.map(s => {
          const pct = Math.round(s.covered / s.eligible * 100);
          return (
            <div key={s.name} style={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "12px", overflow: "hidden" }}>
              <div style={{ background: s.color, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "28px" }}>{s.icon}</span>
                  <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: "999px", padding: "4px 12px", color: "#fff", fontSize: "12px", fontWeight: 700 }}>{pct}%</span>
                </div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: "13px", marginTop: "8px", lineHeight: 1.3 }}>{s.name}</p>
              </div>
              <div style={{ padding: "16px" }}>
                <div style={{ height: "6px", background: darkMode ? "#1e293b" : "#e2e8f0", borderRadius: "3px", marginBottom: "12px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: s.color, borderRadius: "3px" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                  <div style={{ textAlign: "center", padding: "8px", background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: "6px" }}>
                    <p style={{ color: th.text, fontWeight: 700, fontSize: "16px" }}>{s.eligible}</p>
                    <p style={{ color: th.textMuted, fontSize: "9px" }}>ELIGIBLE</p>
                  </div>
                  <div style={{ textAlign: "center", padding: "8px", background: "#dcfce7", borderRadius: "6px" }}>
                    <p style={{ color: "#16a34a", fontWeight: 700, fontSize: "16px" }}>{s.covered}</p>
                    <p style={{ color: "#15803d", fontSize: "9px" }}>COVERED</p>
                  </div>
                  <div style={{ textAlign: "center", padding: "8px", background: "#fee2e2", borderRadius: "6px" }}>
                    <p style={{ color: "#dc2626", fontWeight: 700, fontSize: "16px" }}>{s.missing}</p>
                    <p style={{ color: "#b91c1c", fontSize: "9px" }}>MISSING</p>
                  </div>
                </div>
                <p style={{ color: th.textMuted, fontSize: "11px", fontWeight: 600, marginBottom: "4px" }}>MISSING DOCS:</p>
                {s.missingDocs.map(d => (
                  <div key={d} style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                    <XCircle size={11} color="#ef4444" />
                    <span style={{ color: th.text, fontSize: "11px" }}>{d}</span>
                  </div>
                ))}
                <button onClick={() => sendSMS("918888888888", `${s.name}: ${s.missing} students have pending documents. Please visit school helpdesk.`)} style={{ width: "100%", marginTop: "10px", padding: "6px", background: s.color + "15", color: s.color, border: `1px solid ${s.color}30`, borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                  Auto-Alert Parents ({s.missing})
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scheme comparison chart */}
      <Card title="Scheme Coverage Comparison">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={schemes.map(s => ({ name: s.name.split(" ")[0], eligible: s.eligible, covered: s.covered, missing: s.missing }))}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: th.textMuted }} />
            <YAxis tick={{ fontSize: 11, fill: th.textMuted }} />
            <Tooltip contentStyle={{ background: th.card, borderRadius: "8px" }} />
            <Legend />
            <Bar dataKey="covered" name="Covered" fill="#22c55e" stackId="a" />
            <Bar dataKey="missing" name="Missing" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
};

// ============================================================
// CLIMATE PAGE
// ============================================================

const ClimatePage = () => {
  const { darkMode, climateMetrics = climateData, districtClimateRisk, districtRanking = districtData } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const cd = climateMetrics;
  const avgAqi = Number(districtClimateRisk?.avgAqi ?? 120);
  const avgTemperature = Number(districtClimateRisk?.avgTemperature ?? 34);
  const heatAlertDays = Number(districtClimateRisk?.heatAlertDays ?? 0);
  const airQualityGrade = avgAqi >= 300 ? "Severe" : avgAqi >= 200 ? "Very Poor" : avgAqi >= 150 ? "Poor" : avgAqi >= 100 ? "Moderate" : "Good";
  const schoolCleanlinessData = (Array.isArray(districtRanking) ? districtRanking : districtData)
    .map((item, idx) => {
      const schoolScore = Number(item?.score ?? 70);
      const waterScore = Math.max(35, Math.min(95, Math.round(Number(cd.waterQuality || 70) - idx * 2 + schoolScore * 0.08)));
      const aqiScore = Math.max(20, Math.min(95, Math.round(100 - avgAqi * 0.3 + schoolScore * 0.12 - idx)));
      const heatScore = Math.max(20, Math.min(95, Math.round(100 - avgTemperature * 1.2 - heatAlertDays * 0.9 + schoolScore * 0.1)));
      const cleanlinessScore = Math.max(0, Math.min(100, Math.round(waterScore * 0.35 + aqiScore * 0.4 + heatScore * 0.25)));
      return {
        school: String(item?.school || `School ${idx + 1}`),
        waterScore,
        aqiScore,
        heatScore,
        cleanlinessScore,
      };
    })
    .sort((a, b) => b.cleanlinessScore - a.cleanlinessScore)
    .slice(0, 12);

  const monthlyEnv = [
    { month: "Jan", score: 62, carbon: 2.8, water: 68 },
    { month: "Feb", score: 65, carbon: 2.6, water: 70 },
    { month: "Mar", score: 67, carbon: 2.5, water: 73 },
    { month: "Apr", score: 60, carbon: 2.9, water: 65 },
    { month: "May", score: 58, carbon: 3.2, water: 60 },
    { month: "Jun", score: 64, carbon: 2.7, water: 72 },
  ];

  return (
    <div>
      {/* Environmental Score Banner */}
      <div style={{ background: "linear-gradient(135deg, #14532d 0%, #166534 60%, #15803d 100%)", borderRadius: "16px", padding: "24px", marginBottom: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <p style={{ color: "#86efac", fontSize: "11px", letterSpacing: "0.08em", marginBottom: "4px" }}>🌿 SCHOOL ENVIRONMENTAL SCORE — AI GENERATED</p>
            <p style={{ color: "#fff", fontSize: "48px", fontWeight: 800, lineHeight: 1 }}>{cd.envScore}<span style={{ fontSize: "20px", color: "#86efac" }}>/100</span></p>
            <p style={{ color: "#86efac", fontSize: "13px", marginTop: "6px" }}>Good — Above District Average (62)</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            {[
              { label: "Heatwave Risk", value: cd.heatwaveRisk, color: cd.heatwaveRisk === "High" ? "#ef4444" : "#f59e0b", icon: Thermometer },
              { label: "Avg Temperature", value: `${avgTemperature.toFixed(1)}°C`, color: avgTemperature >= 40 ? "#ef4444" : avgTemperature >= 35 ? "#f59e0b" : "#22c55e", icon: Thermometer },
              { label: "AQI", value: Math.round(avgAqi), color: avgAqi >= 200 ? "#ef4444" : avgAqi >= 120 ? "#f59e0b" : "#22c55e", icon: Wind },
              { label: "Air Quality", value: airQualityGrade, color: avgAqi >= 150 ? "#ef4444" : avgAqi >= 100 ? "#f59e0b" : "#22c55e", icon: Wind },
              { label: "Water Quality", value: `${cd.waterQuality}/100`, color: "#22c55e", icon: Droplets },
              { label: "Carbon Footprint", value: `${cd.carbonFootprint} tCO₂`, color: "#f59e0b", icon: Wind },
              { label: "Trees Planted", value: cd.treesPlanted, color: "#22c55e", icon: TreePine },
            ].map(item => (
              <div key={item.label} style={{ background: "rgba(255,255,255,0.12)", borderRadius: "8px", padding: "12px", minWidth: "120px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                  <item.icon size={14} color={item.color} />
                  <p style={{ color: "#86efac", fontSize: "10px" }}>{item.label.toUpperCase()}</p>
                </div>
                <p style={{ color: "#fff", fontWeight: 700, fontSize: "16px" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <Card title="Environmental Metrics Over Time">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={monthlyEnv}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: th.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: th.textMuted }} />
              <Tooltip contentStyle={{ background: th.card, borderRadius: "8px" }} />
              <Legend />
              <Line type="monotone" dataKey="score" stroke="#22c55e" name="Env Score" strokeWidth={2} />
              <Line type="monotone" dataKey="water" stroke="#3b82f6" name="Water Quality" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Sustainability Initiatives">
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[
              { label: "Solar Panels Installed", value: `${cd.solarPanels} units`, icon: Zap, color: "#f59e0b" },
              { label: "Waste Recycled", value: `${cd.wasteRecycled}%`, icon: Leaf, color: "#22c55e" },
              { label: "Trees Planted (2025)", value: cd.treesPlanted, icon: TreePine, color: "#16a34a" },
              { label: "Rain Water Harvesting", value: "Active", icon: Droplets, color: "#3b82f6" },
            ].map(item => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: "8px" }}>
                <div style={{ width: "32px", height: "32px", background: item.color + "20", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: item.color }}>
                  <item.icon size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ color: th.textMuted, fontSize: "10px" }}>{item.label}</p>
                  <p style={{ color: th.text, fontWeight: 700, fontSize: "13px" }}>{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="School Cleanliness & Safety Ranking">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: darkMode ? "#0f172a" : "#f8fafc" }}>
                {["Rank", "School", "Cleanliness Score", "Air Score", "Water Score", "Heat Safety"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", textAlign: "left", color: th.textMuted, fontSize: "11px", fontWeight: 700, borderBottom: `1px solid ${th.cardBorder}` }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schoolCleanlinessData.map((row, idx) => (
                <tr key={row.school} style={{ borderBottom: `1px solid ${th.cardBorder}` }}>
                  <td style={{ padding: "10px 12px", color: th.text, fontWeight: 700 }}>{idx + 1}</td>
                  <td style={{ padding: "10px 12px", color: th.text }}>{row.school}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <Badge color={row.cleanlinessScore >= 80 ? "green" : row.cleanlinessScore >= 65 ? "yellow" : "red"}>
                      {row.cleanlinessScore}/100
                    </Badge>
                  </td>
                  <td style={{ padding: "10px 12px", color: row.aqiScore >= 75 ? "#16a34a" : row.aqiScore >= 60 ? "#d97706" : "#dc2626", fontWeight: 600 }}>{row.aqiScore}</td>
                  <td style={{ padding: "10px 12px", color: row.waterScore >= 75 ? "#16a34a" : row.waterScore >= 60 ? "#d97706" : "#dc2626", fontWeight: 600 }}>{row.waterScore}</td>
                  <td style={{ padding: "10px 12px", color: row.heatScore >= 75 ? "#16a34a" : row.heatScore >= 60 ? "#d97706" : "#dc2626", fontWeight: 600 }}>{row.heatScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

// ============================================================
// ALERTS PAGE
// ============================================================

const AlertsPage = () => {
  const { user, darkMode, studentsData = students, callParent, sendSMS, generateReport, sickLeaveReports = [], logSickLeaveReport, operationalEvents = [], logOperationalEvent } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const role = user?.role || ROLES.SCHOOL_ADMIN;
  const isParentView = role === ROLES.PARENT;
  const canManageSignals = [ROLES.TEACHER, ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN, ROLES.HEALTH_WORKER].includes(role);
  const canRunCommand = [ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN, ROLES.HEALTH_WORKER].includes(role);
  const canViewOps = [ROLES.SCHOOL_ADMIN, ROLES.SUPER_ADMIN, ROLES.HEALTH_WORKER].includes(role);
  const highRisk = studentsData.filter(s => s.riskScore === "High");
  const outbreakSignals = buildOutbreakSignals(studentsData, sickLeaveReports);
  const attendanceSignals = outbreakSignals.attendanceSignals;
  const attendanceAlertCount = attendanceSignals.chronicAbsentees.length + attendanceSignals.classAlerts.length;
  const symptomClusters = outbreakSignals.symptomClusters;
  const recentSickReports = sickLeaveReports.filter((report) => {
    if (String(report?.leaveType || "").toUpperCase() !== "SICK") return false;
    const ts = new Date(report?.reportedAt || report?.date || 0).getTime();
    return Number.isFinite(ts) && Date.now() - ts <= 2 * 24 * 60 * 60 * 1000;
  });
  const weekSickReports = sickLeaveReports.filter((report) => {
    if (String(report?.leaveType || "").toUpperCase() !== "SICK") return false;
    const ts = new Date(report?.reportedAt || report?.date || 0).getTime();
    return Number.isFinite(ts) && Date.now() - ts <= 7 * 24 * 60 * 60 * 1000;
  });
  const meetsDualWindowThreshold = (twoDayCount, sevenDayCount, threshold) => {
    const shortWindowSpike = Number(twoDayCount) >= Number(threshold);
    const trendSupport = Number(sevenDayCount) >= Number(threshold) + 1;
    const strongSpike = Number(twoDayCount) >= Number(threshold) + 2;
    return shortWindowSpike && (trendSupport || strongSpike);
  };
  const dengueMatcher = (report) => {
    const reason = String(report?.reason || "").toLowerCase();
    const symptoms = parseSymptomList(report?.symptoms);
    const hasFever = symptoms.includes("fever") || reason.includes("fever");
    const hasCompanionSignal = symptoms.some((item) => ["vomiting", "headache", "body pain", "rash"].includes(item)) ||
      ["vomiting", "headache", "body pain", "rash"].some((item) => reason.includes(item));
    return reason.includes("dengue") || (hasFever && hasCompanionSignal);
  };
  const dengueSignalReports = recentSickReports.filter(dengueMatcher);
  const dengueWeekReports = weekSickReports.filter(dengueMatcher);
  const dengueClassCounts2d = dengueSignalReports.reduce((acc, report) => {
    const key = String(report?.className || "Unknown Class");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const dengueClassCounts7d = dengueWeekReports.reduce((acc, report) => {
    const key = String(report?.className || "Unknown Class");
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const probableDengueClasses = Object.entries(dengueClassCounts2d)
    .filter(([className, count2d]) => meetsDualWindowThreshold(count2d, dengueClassCounts7d[className] || 0, 3))
    .map(([className]) => className);
  const probableDengueStudents = studentsData.filter((student) => probableDengueClasses.includes(String(student?.class || "")));
  const myChild = isParentView ? studentsData[0] : null;
  const parentClassAlert = isParentView && myChild ? probableDengueClasses.includes(String(myChild.class || "")) : false;
  const probableClusterRules = [
    {
      key: "vectorOther",
      title: "Probable Vector Cluster Alert (Malaria/Chikungunya-like)",
      reasonKeywords: ["malaria", "chikungunya", "mosquito", "joint pain"],
      symptomKeywords: ["fever", "chills", "joint pain", "body pain", "headache", "rash"],
      threshold: 3,
      notifyTemplate: (studentClass) =>
        `School alert: In ${studentClass}, vector-borne-like symptoms show a 2-day spike with 7-day trend support. This is a precautionary warning, not diagnosis. Please consult doctor if fever/chills/joint pain persists.`
    },
    {
      key: "waterBorne",
      title: "Probable Water/Food-borne Cluster Alert",
      reasonKeywords: ["diarrhea", "cholera", "typhoid", "jaundice", "hepatitis", "food poisoning", "stomach infection"],
      symptomKeywords: ["diarrhea", "loose motion", "vomiting", "stomach pain", "nausea", "dehydration", "jaundice"],
      threshold: 3,
      notifyTemplate: (studentClass) =>
        `School alert: In ${studentClass}, water/food-borne-like symptoms show a 2-day spike with 7-day trend support. This is a precautionary warning, not diagnosis. Please ensure safe hydration and consult doctor for persistent vomiting/diarrhea.`
    },
    {
      key: "respiratory",
      title: "Probable Respiratory Cluster Alert",
      reasonKeywords: ["asthma", "respiratory", "breathing", "wheezing", "pollution", "cough"],
      symptomKeywords: ["cough", "breathlessness", "wheezing", "sore throat", "chest tightness", "fever"],
      threshold: 3,
      notifyTemplate: (studentClass) =>
        `School alert: In ${studentClass}, respiratory-like symptoms show a 2-day spike with 7-day trend support. This is a precautionary warning, not diagnosis. Please monitor breathing symptoms and seek doctor advice if symptoms continue.`
    },
    {
      key: "heatIllness",
      title: "Probable Heat Illness Cluster Alert",
      reasonKeywords: ["heat", "dehydration", "heat stroke", "heat exhaustion", "sun exposure", "fainting", "dizziness"],
      symptomKeywords: ["dehydration", "dizziness", "fainting", "headache", "vomiting", "weakness"],
      threshold: 2,
      notifyTemplate: (studentClass) =>
        `School alert: In ${studentClass}, heat-illness-like symptoms show a 2-day spike with 7-day trend support. This is a precautionary warning, not diagnosis. Please focus on hydration, avoid peak heat, and consult doctor if symptoms persist.`
    }
  ];
  const diseaseClusterAlerts = probableClusterRules.map((rule) => {
    const isRuleMatch = (report) => {
      const reason = String(report?.reason || "").toLowerCase();
      const symptoms = parseSymptomList(report?.symptoms);
      if (rule.key === "vectorOther" && reason.includes("dengue")) return false;
      const keywordMatch = rule.reasonKeywords.some((keyword) => reason.includes(keyword));
      const symptomHits = rule.symptomKeywords.reduce((acc, keyword) => {
        const inSymptoms = symptoms.includes(keyword);
        const inReason = reason.includes(keyword);
        return acc + (inSymptoms || inReason ? 1 : 0);
      }, 0);
      return keywordMatch || symptomHits >= 2;
    };
    const matchedReports2d = recentSickReports.filter(isRuleMatch);
    const matchedReports7d = weekSickReports.filter(isRuleMatch);
    const classCounts2d = matchedReports2d.reduce((acc, report) => {
      const key = String(report?.className || "Unknown Class");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const classCounts7d = matchedReports7d.reduce((acc, report) => {
      const key = String(report?.className || "Unknown Class");
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const probableClasses = Object.entries(classCounts2d)
      .filter(([className, count2d]) => meetsDualWindowThreshold(count2d, classCounts7d[className] || 0, Number(rule.threshold || 3)))
      .map(([className]) => className);
    const probableStudents = studentsData.filter((student) => probableClasses.includes(String(student?.class || "")));
    return {
      ...rule,
      reportCount: matchedReports2d.length,
      weeklyTrendCount: matchedReports7d.length,
      probableClasses,
      probableStudents
    };
  }).filter((item) => item.probableClasses.length > 0);
  const parentAdditionalAlerts = isParentView && myChild
    ? diseaseClusterAlerts.filter((alert) => alert.probableClasses.includes(String(myChild.class || "")))
    : [];
  const outbreakTrend = buildOutbreakTrendSeries(sickLeaveReports, 10);
  const sickLeaveCandidates = studentsData
    .filter((student) => Number(student?.attendance || 0) < 90)
    .slice(0, 30);
  const [leaveForm, setLeaveForm] = useState({
    studentId: String(sickLeaveCandidates[0]?.id || ""),
    leaveType: "SICK",
    reason: "",
    symptoms: "",
    date: new Date().toISOString().slice(0, 10)
  });

  const selectedStudent = studentsData.find((student) => student.id === leaveForm.studentId) || sickLeaveCandidates[0];
  const [responseChecklist, setResponseChecklist] = useState({
    triage: false,
    parentNotification: false,
    fieldInspection: false,
    campSchedule: false
  });

  const submitLeaveSignal = () => {
    if (!leaveForm.studentId || !selectedStudent) return;
    const payload = {
      id: `${leaveForm.studentId}-${Date.now()}`,
      studentId: leaveForm.studentId,
      studentName: selectedStudent.name,
      className: selectedStudent.class,
      leaveType: leaveForm.leaveType,
      reason: leaveForm.reason.trim(),
      symptoms: leaveForm.symptoms.trim(),
      date: leaveForm.date,
      reportedAt: new Date().toISOString()
    };
    logSickLeaveReport?.(payload);
    logOperationalEvent?.({
      type: "SICK_LEAVE_SIGNAL",
      severity: "medium",
      title: `Sick leave logged for ${selectedStudent.name}`,
      details: `${selectedStudent.class} | symptoms: ${payload.symptoms || "not specified"}`
    });
    setLeaveForm((prev) => ({
      ...prev,
      reason: "",
      symptoms: ""
    }));
  };

  return (
    <div>
      <div style={{ background: "linear-gradient(135deg, #dc2626, #7f1d1d)", borderRadius: "16px", padding: "20px 24px", marginBottom: "24px", display: "flex", alignItems: "center", gap: "16px" }}>
        <AlertTriangle size={32} color="#fff" />
        <div>
          <p style={{ color: "#fff", fontWeight: 800, fontSize: "18px" }}>🚨 Emergency Health Alerts</p>
          <p style={{ color: "#fecaca", fontSize: "13px" }}>
            {isParentView ? "Child safety and class spread alerts" : `${highRisk.length} students require immediate attention`}
          </p>
        </div>
        {!isParentView && (
          <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
            <button onClick={() => sendSMS("919999999999", `Emergency alert: ${highRisk.length} students require immediate health attention.`)} style={{ background: "#fff", color: "#dc2626", border: "none", borderRadius: "8px", padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
              📞 Notify All Parents
            </button>
            <button onClick={() => generateReport("emergency-health-alerts.json", { count: highRisk.length, students: highRisk, attendanceSignals, symptomClusters, likelyDiseaseFamily: outbreakSignals.likelyDiseaseFamily, spreadRisk: outbreakSignals.spreadLevel, generatedAt: new Date().toISOString() })} style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: "8px", padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "13px" }}>
              📋 Generate Report
            </button>
          </div>
        )}
      </div>

      {(probableDengueClasses.length > 0 || parentClassAlert) && (
        <Card title="Probable Dengue Cluster Alert (2-Day Spike + 7-Day Trend)">
          <div style={{ background: darkMode ? "#3f1d1d" : "#fff1f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
            <p style={{ color: th.text, fontSize: "13px", fontWeight: 700 }}>
              Cases with dengue-like signals increased in: {probableDengueClasses.join(", ")}
            </p>
            <p style={{ color: th.textMuted, fontSize: "12px" }}>
              This is an early warning (not medical diagnosis). Advise parents for immediate doctor consultation and hydration/safety protocol.
            </p>
          </div>
          {!isParentView && <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {probableDengueStudents.slice(0, 12).map((student) => (
              <div key={`dengue-${student.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "8px", background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}` }}>
                <div>
                  <p style={{ color: th.text, fontSize: "12px", fontWeight: 700 }}>{student.name}</p>
                  <p style={{ color: th.textMuted, fontSize: "11px" }}>{student.class} • Parent: {student.parentPhone}</p>
                </div>
                <button
                  onClick={() =>
                    sendSMS(
                      student.parentPhone,
                      `School alert: In ${student.class}, dengue-like symptoms show a 2-day spike with 7-day trend support. This is a precautionary warning, not diagnosis. Please consult doctor if fever/vomiting/headache continues.`
                    )
                  }
                  style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                >
                  Notify Parent
                </button>
              </div>
            ))}
          </div>}
          {isParentView && myChild && (
            <div style={{ padding: "8px 10px", borderRadius: "8px", background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}` }}>
              <p style={{ color: th.text, fontSize: "12px", fontWeight: 700 }}>{myChild.name} ({myChild.class})</p>
              <p style={{ color: th.textMuted, fontSize: "11px", marginBottom: "6px" }}>Precautionary class alert active. Monitor fever/vomiting/headache and consult doctor if symptoms persist.</p>
              <button onClick={() => callParent("108", "Emergency Helpline")} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                Call Health Helpline
              </button>
            </div>
          )}
        </Card>
      )}
      {(diseaseClusterAlerts.length > 0 || parentAdditionalAlerts.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "12px" }}>
          {(isParentView ? parentAdditionalAlerts : diseaseClusterAlerts).map((alert) => (
            <Card key={alert.key} title={`${alert.title} (2-Day Spike + 7-Day Trend)`}>
              <div style={{ background: darkMode ? "#1f2937" : "#f8fafc", border: `1px solid ${th.cardBorder}`, borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
                <p style={{ color: th.text, fontSize: "13px", fontWeight: 700 }}>
                  Cases increased in: {alert.probableClasses.join(", ")}
                </p>
                <p style={{ color: th.textMuted, fontSize: "12px" }}>
                  Precautionary early warning only, not diagnosis. Activate prevention protocol and monitor class trend closely.
                </p>
              </div>
              {!isParentView && <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {alert.probableStudents.slice(0, 10).map((student) => (
                  <div key={`${alert.key}-${student.id}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: "8px", background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}` }}>
                    <div>
                      <p style={{ color: th.text, fontSize: "12px", fontWeight: 700 }}>{student.name}</p>
                      <p style={{ color: th.textMuted, fontSize: "11px" }}>{student.class} • Parent: {student.parentPhone}</p>
                    </div>
                    <button
                      onClick={() => sendSMS(student.parentPhone, alert.notifyTemplate(student.class))}
                      style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}
                    >
                      Notify Parent
                    </button>
                  </div>
                ))}
              </div>}
              {isParentView && myChild && (
                <div style={{ padding: "8px 10px", borderRadius: "8px", background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}` }}>
                  <p style={{ color: th.text, fontSize: "12px", fontWeight: 700 }}>{myChild.name} ({myChild.class})</p>
                  <p style={{ color: th.textMuted, fontSize: "11px", marginBottom: "6px" }}>
                    Precautionary class alert active. Monitor symptoms and consult doctor quickly if symptoms persist or worsen.
                  </p>
                  <button onClick={() => callParent("108", "Emergency Helpline")} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 10px", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
                    Call Health Helpline
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "16px" }}>
        <div style={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "10px", padding: "12px" }}>
          <p style={{ color: th.textMuted, fontSize: "11px" }}>Overall Attendance</p>
          <p style={{ color: th.text, fontWeight: 800, fontSize: "22px" }}>{attendanceSignals.overallAverage}%</p>
        </div>
        <div style={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "10px", padding: "12px" }}>
          <p style={{ color: th.textMuted, fontSize: "11px" }}>Chronic Absentees (&lt;75%)</p>
          <p style={{ color: "#dc2626", fontWeight: 800, fontSize: "22px" }}>{attendanceSignals.chronicAbsentees.length}</p>
        </div>
        <div style={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "10px", padding: "12px" }}>
          <p style={{ color: th.textMuted, fontSize: "11px" }}>Class Attendance Alerts</p>
          <p style={{ color: "#d97706", fontWeight: 800, fontSize: "22px" }}>{attendanceSignals.classAlerts.length}</p>
        </div>
        <div style={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "10px", padding: "12px" }}>
          <p style={{ color: th.textMuted, fontSize: "11px" }}>Total Attendance Signals</p>
          <p style={{ color: th.text, fontWeight: 800, fontSize: "22px" }}>{attendanceAlertCount}</p>
        </div>
      </div>

      {!isParentView && <Card title="Attendance Early Warning">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div>
            <p style={{ color: th.text, fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>High-Risk Attendance Students</p>
            {attendanceSignals.chronicAbsentees.slice(0, 6).map((student) => (
              <div key={student.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", marginBottom: "6px", background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: "8px" }}>
                <div>
                  <p style={{ color: th.text, fontSize: "12px", fontWeight: 600 }}>{student.name}</p>
                  <p style={{ color: th.textMuted, fontSize: "11px" }}>{student.class} • {student.condition}</p>
                </div>
                <Badge color="red">{student.attendance}%</Badge>
              </div>
            ))}
            {attendanceSignals.chronicAbsentees.length === 0 && (
              <p style={{ color: th.textMuted, fontSize: "12px" }}>No chronic absentee risk detected.</p>
            )}
          </div>
          <div>
            <p style={{ color: th.text, fontSize: "12px", fontWeight: 700, marginBottom: "8px" }}>Class-Level Attendance Drops</p>
            {attendanceSignals.classAlerts.slice(0, 6).map((entry) => (
              <div key={entry.className} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", marginBottom: "6px", background: darkMode ? "#0f172a" : "#f8fafc", borderRadius: "8px" }}>
                <div>
                  <p style={{ color: th.text, fontSize: "12px", fontWeight: 600 }}>{entry.className}</p>
                  <p style={{ color: th.textMuted, fontSize: "11px" }}>{entry.lowAttendanceStudents}/{entry.students} students below 80%</p>
                </div>
                <Badge color={entry.avgAttendance < 75 ? "red" : "yellow"}>{entry.avgAttendance}%</Badge>
              </div>
            ))}
            {attendanceSignals.classAlerts.length === 0 && (
              <p style={{ color: th.textMuted, fontSize: "12px" }}>No class-level drop alerts right now.</p>
            )}
          </div>
        </div>
      </Card>}

      {canRunCommand && <div style={{ marginTop: "12px", marginBottom: "12px" }}>
        <Card title="Response Command Checklist">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "8px" }}>
            {[
              { key: "triage", label: "Triage cases within 2 hours" },
              { key: "parentNotification", label: "Notify parents for affected classes" },
              { key: "fieldInspection", label: "Request sanitation/vector inspection" },
              { key: "campSchedule", label: "Schedule focused health camp in 48h" }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => {
                  setResponseChecklist((prev) => ({ ...prev, [item.key]: !prev[item.key] }));
                  logOperationalEvent?.({
                    type: "RESPONSE_STEP_UPDATE",
                    severity: "info",
                    title: `${item.label} ${responseChecklist[item.key] ? "reopened" : "completed"}`,
                    details: `Spread risk ${outbreakSignals.spreadLevel}`
                  });
                }}
                style={{
                  textAlign: "left",
                  padding: "10px",
                  borderRadius: "8px",
                  border: `1px solid ${th.cardBorder}`,
                  background: responseChecklist[item.key] ? "#dcfce7" : (darkMode ? "#0f172a" : "#f8fafc"),
                  color: th.text,
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: 600
                }}
              >
                {responseChecklist[item.key] ? "✓" : "○"} {item.label}
              </button>
            ))}
          </div>
        </Card>
      </div>}

      {canManageSignals && <div style={{ marginTop: "12px", marginBottom: "12px", display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
        <Card title="Sick Leave Symptom Intake">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <select value={leaveForm.studentId} onChange={(e) => setLeaveForm((prev) => ({ ...prev, studentId: e.target.value }))} style={{ padding: "8px 10px", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", background: th.card, color: th.text, fontSize: "12px" }}>
              {sickLeaveCandidates.map((student) => (
                <option key={student.id} value={student.id}>{student.name} ({student.class})</option>
              ))}
            </select>
            <select value={leaveForm.leaveType} onChange={(e) => setLeaveForm((prev) => ({ ...prev, leaveType: e.target.value }))} style={{ padding: "8px 10px", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", background: th.card, color: th.text, fontSize: "12px" }}>
              <option value="SICK">Sick Leave</option>
              <option value="PERSONAL">Personal Leave</option>
            </select>
            <input value={leaveForm.reason} onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason (e.g. fever + weakness)" style={{ padding: "8px 10px", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", background: th.card, color: th.text, fontSize: "12px" }} />
            <input value={leaveForm.date} onChange={(e) => setLeaveForm((prev) => ({ ...prev, date: e.target.value }))} type="date" style={{ padding: "8px 10px", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", background: th.card, color: th.text, fontSize: "12px" }} />
          </div>
          <input value={leaveForm.symptoms} onChange={(e) => setLeaveForm((prev) => ({ ...prev, symptoms: e.target.value }))} placeholder="Symptoms comma-separated (fever, vomiting, headache)" style={{ width: "100%", marginTop: "10px", padding: "8px 10px", border: `1px solid ${th.cardBorder}`, borderRadius: "8px", background: th.card, color: th.text, fontSize: "12px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
            <p style={{ color: th.textMuted, fontSize: "11px" }}>Use this when absenteeism is due to sickness so symptoms are used in spread detection.</p>
            <Button size="sm" variant="danger" onClick={submitLeaveSignal}>Log Sick Leave</Button>
          </div>
        </Card>

        <Card title="Symptom Cluster Signals (Last 3 Days)">
          {symptomClusters.slice(0, 6).map((cluster, idx) => (
            <div key={`${cluster.className}-${cluster.symptom}-${idx}`} style={{ padding: "8px 10px", marginBottom: "6px", borderRadius: "8px", background: darkMode ? "#0f172a" : "#f8fafc", border: `1px solid ${th.cardBorder}` }}>
              <p style={{ color: th.text, fontSize: "12px", fontWeight: 700 }}>{cluster.className}</p>
              <p style={{ color: th.textMuted, fontSize: "11px" }}>
                Symptom: <span style={{ color: th.text }}>{cluster.symptom}</span> • Cases: {cluster.count}
              </p>
            </div>
          ))}
          {symptomClusters.length === 0 && (
            <p style={{ color: th.textMuted, fontSize: "12px" }}>No symptom cluster detected yet. Log sick leaves with symptoms to activate this signal.</p>
          )}
        </Card>
      </div>}

      <div style={{ marginBottom: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Card title="Outbreak Signal Trend (Last 10 Days)">
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={outbreakTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: th.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: th.textMuted }} />
              <Tooltip contentStyle={{ background: th.card, borderRadius: "8px" }} />
              <Legend />
              <Bar dataKey="sickLeaves" name="Sick Leaves" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="symptoms" name="Symptom Reports" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {canViewOps && <Card title="Operational Event Log">
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "210px", overflow: "auto" }}>
            {operationalEvents.slice(0, 10).map((event) => (
              <div key={event.id} style={{ padding: "8px", borderRadius: "8px", border: `1px solid ${th.cardBorder}`, background: darkMode ? "#0f172a" : "#f8fafc" }}>
                <p style={{ color: th.text, fontSize: "12px", fontWeight: 700 }}>{event.title}</p>
                <p style={{ color: th.textMuted, fontSize: "11px" }}>{event.details}</p>
                <p style={{ color: th.textMuted, fontSize: "10px" }}>{new Date(event.createdAt).toLocaleString("en-IN")}</p>
              </div>
            ))}
            {operationalEvents.length === 0 && (
              <p style={{ color: th.textMuted, fontSize: "12px" }}>No operations logged yet.</p>
            )}
          </div>
        </Card>}
      </div>

      {!isParentView && <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {highRisk.map(s => (
          <div key={s.id} style={{ background: th.card, border: "2px solid #ef4444", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ width: "48px", height: "48px", background: "#fee2e2", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", fontWeight: 800, color: "#dc2626", flexShrink: 0 }}>
              {s.name.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: "180px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <p style={{ color: th.text, fontWeight: 700, fontSize: "15px" }}>{s.name}</p>
                <RiskBadge risk="High" />
              </div>
              <p style={{ color: th.textMuted, fontSize: "12px" }}>{s.id} • {s.class} • {s.condition}</p>
              <p style={{ color: th.textMuted, fontSize: "12px" }}>Parent: {s.parentPhone}</p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <div style={{ background: "#fee2e2", borderRadius: "8px", padding: "6px 12px", textAlign: "center" }}>
                <p style={{ color: "#dc2626", fontSize: "9px", fontWeight: 700 }}>HEALTH WORKER</p>
                <p style={{ color: "#dc2626", fontSize: "11px", fontWeight: 600 }}>Dr. Mohan Verma</p>
              </div>
              <div style={{ background: "#fef9c3", borderRadius: "8px", padding: "6px 12px", textAlign: "center" }}>
                <p style={{ color: "#a16207", fontSize: "9px", fontWeight: 700 }}>SMS STATUS</p>
                <p style={{ color: "#a16207", fontSize: "11px", fontWeight: 600 }}>✓ Sent</p>
              </div>
              <button onClick={() => callParent(s.parentPhone, s.name)} style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                <Phone size={13} /> Call Parent
              </button>
            </div>
          </div>
        ))}
      </div>}
    </div>
  );
};

// ============================================================
// ANALYTICS PAGE
// ============================================================

const AnalyticsPage = () => {
  const { darkMode, schemeCoverage = schemeData, sickLeaveReports = [], studentsData = students } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const outbreakSignals = buildOutbreakSignals(studentsData, sickLeaveReports);
  const outbreakTrend = ["-6", "-5", "-4", "-3", "-2", "-1", "0"].map((offset) => {
    const day = new Date(Date.now() + Number(offset) * 24 * 60 * 60 * 1000);
    const key = day.toISOString().slice(0, 10);
    const dayReports = sickLeaveReports.filter((r) => String(r.date || "").slice(0, 10) === key);
    return {
      day: day.toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      sickLeaves: dayReports.length,
      symptomSignals: dayReports.reduce((acc, item) => acc + parseSymptomList(item.symptoms).length, 0)
    };
  });

  const bmiDist = [
    { range: "Underweight (<18.5)", count: 18, color: "#f59e0b" },
    { range: "Normal (18.5-25)", count: 74, color: "#22c55e" },
    { range: "Overweight (25-30)", count: 21, color: "#f97316" },
    { range: "Obese (>30)", count: 7, color: "#ef4444" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <Card title="BMI Distribution">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={bmiDist} cx="50%" cy="50%" outerRadius={90} paddingAngle={3} dataKey="count" nameKey="range" label={({ range, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {bmiDist.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Monthly Attendance vs Health Incidents">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: th.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: th.textMuted }} />
              <Tooltip contentStyle={{ background: th.card, borderRadius: "8px" }} />
              <Legend />
              <Bar dataKey="attendance" name="Attendance %" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="healthIncidents" name="Health Incidents" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Card title="Vaccination Coverage by Class">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={[
              { cls: "1-3", vaccinated: 92, total: 100 },
              { cls: "4-5", vaccinated: 85, total: 100 },
              { cls: "6-7", vaccinated: 78, total: 100 },
              { cls: "8-9", vaccinated: 82, total: 100 },
              { cls: "10-12", vaccinated: 88, total: 100 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="cls" tick={{ fontSize: 11, fill: th.textMuted }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: th.textMuted }} />
              <Tooltip />
              <Bar dataKey="vaccinated" name="Vaccinated %" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Scheme Coverage Overview">
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={schemeCoverage.map(s => ({ subject: s.scheme.split(" ")[0], coverage: Math.round(s.covered / s.eligible * 100) }))}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: th.textMuted }} />
              <Radar name="Coverage %" dataKey="coverage" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div style={{ marginTop: "16px" }}>
        <Card title="Outbreak Signal Trend (Attendance + Symptoms)">
          <p style={{ color: th.textMuted, fontSize: "12px", marginBottom: "8px" }}>
            Current spread risk: <strong style={{ color: th.text }}>{outbreakSignals.spreadLevel}</strong> ({outbreakSignals.triageScore}/100)
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={outbreakTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: th.textMuted }} />
              <YAxis tick={{ fontSize: 11, fill: th.textMuted }} />
              <Tooltip contentStyle={{ background: th.card, borderRadius: "8px" }} />
              <Legend />
              <Bar dataKey="sickLeaves" name="Sick Leaves" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Bar dataKey="symptomSignals" name="Symptom Signals" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

// ============================================================
// REPORTS PAGE
// ============================================================

const ReportsPage = () => {
  const { darkMode, generateReport, studentsData = students, healthCampsData = healthCamps, schemeCoverage = schemeData, climateMetrics = climateData, sickLeaveReports = [] } = useApp();
  const th = theme[darkMode ? "dark" : "light"];
  const outbreakSignals = buildOutbreakSignals(studentsData, sickLeaveReports);

  const reports = [
    { name: "Annual School Health Report 2024-25", type: "PDF", size: "2.4 MB", date: "Feb 01, 2025", status: "Ready" },
    { name: "District Health Camp Summary", type: "PDF", size: "1.1 MB", date: "Jan 28, 2025", status: "Ready" },
    { name: "Government Scheme Coverage Report", type: "XLSX", size: "890 KB", date: "Jan 20, 2025", status: "Ready" },
    { name: "Student Vaccination Drive Report", type: "PDF", size: "1.8 MB", date: "Jan 15, 2025", status: "Ready" },
    { name: "Climate & Sustainability Audit", type: "PDF", size: "3.2 MB", date: "Jan 10, 2025", status: "Ready" },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2 style={{ color: th.text, fontWeight: 700 }}>Reports & Downloads</h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <Button icon={AlertTriangle} variant="danger" onClick={() => generateReport("outbreak-readiness-report.json", { spreadRisk: outbreakSignals, sickLeaveReports, generatedAt: new Date().toISOString() })}>Outbreak Report</Button>
          <Button icon={Plus} onClick={() => generateReport("consolidated-report.json", { students: studentsData.length, camps: healthCampsData.length, schemes: schemeCoverage, climate: climateMetrics, spreadRisk: outbreakSignals, generatedAt: new Date().toISOString() })}>Generate New Report</Button>
        </div>
      </div>
      <div style={{ background: th.card, border: `1px solid ${th.cardBorder}`, borderRadius: "12px", overflow: "hidden" }}>
        {reports.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", padding: "16px 20px", borderBottom: i < reports.length - 1 ? `1px solid ${th.cardBorder}` : "none" }}>
            <div style={{ width: "40px", height: "40px", background: r.type === "PDF" ? "#fee2e2" : "#dcfce7", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FileText size={18} color={r.type === "PDF" ? "#dc2626" : "#16a34a"} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ color: th.text, fontWeight: 600, fontSize: "13px" }}>{r.name}</p>
              <p style={{ color: th.textMuted, fontSize: "11px" }}>{r.type} • {r.size} • {r.date}</p>
            </div>
            <Badge color="green">{r.status}</Badge>
            <button onClick={() => generateReport(`${r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.txt`, `${r.name}\nType: ${r.type}\nDate: ${r.date}\nStatus: ${r.status}`)} style={{ background: th.accentLight, color: th.accent, border: "none", borderRadius: "8px", padding: "7px 14px", cursor: "pointer", fontWeight: 600, fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
              <Download size={13} /> Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================

const AppContent = () => {
  const { user } = useApp();
  const [collapsed, setCollapsed] = useState(false);
  const [activePage, setActivePage] = useState("dashboard");
  const { darkMode } = useApp();
  const th = theme[darkMode ? "dark" : "light"];

  const dashboardComponent = {
    [ROLES.SUPER_ADMIN]: <SuperAdminDashboard />,
    [ROLES.SCHOOL_ADMIN]: <SchoolAdminDashboard />,
    [ROLES.TEACHER]: <TeacherDashboard />,
    [ROLES.HEALTH_WORKER]: <SuperAdminDashboard />,
    [ROLES.PARENT]: <ParentDashboard />,
  };

  const pages = {
    dashboard: dashboardComponent[user.role] || <SchoolAdminDashboard />,
    students: <StudentsPage />,
    "health-camps": <HealthCampsPage />,
    schemes: <SchemesPage />,
    analytics: <AnalyticsPage />,
    climate: <ClimatePage />,
    alerts: <AlertsPage />,
    reports: <ReportsPage />,
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: th.bg, fontFamily: "'Noto Sans', 'Segoe UI', sans-serif" }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} activePage={activePage} setActivePage={setActivePage} />
      <div style={{ flex: 1, marginLeft: collapsed ? "64px" : "240px", transition: "margin-left 0.25s ease", minHeight: "100vh" }}>
        <Navbar collapsed={collapsed} setCollapsed={setCollapsed} activePage={activePage} setActivePage={setActivePage} />
        <main style={{ padding: "84px 24px 32px", maxWidth: "1400px" }}>
          {/* Page Title */}
          <div style={{ marginBottom: "20px" }}>
            <h1 style={{ color: th.text, fontSize: "20px", fontWeight: 800, textTransform: "capitalize" }}>
              {activePage === "dashboard"
                ? `Welcome, ${user.name.split(" ")[0]} 👋`
                : activePage.replace(/-/g, " ")}
            </h1>
            {activePage === "dashboard" && (
              <p style={{ color: th.textMuted, fontSize: "13px" }}>
                {user.role === ROLES.SCHOOL_ADMIN ? `${user.school} • UDISE: ${user.udise}` :
                  user.role === ROLES.SUPER_ADMIN ? `${user.district} District, ${user.state}` :
                    user.role === ROLES.TEACHER ? `${user.class} • ${user.school}` : ""}
              </p>
            )}
          </div>
          {pages[activePage] || <SchoolAdminDashboard />}
        </main>
      </div>
    </div>
  );
};

// ============================================================
// ROOT
// ============================================================

export default function SwasthyaSetu() {
  const [user, setUser] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [token, setToken] = useState(() => (PERSIST_SESSION ? localStorage.getItem("swasthya_token") || "" : ""));
  const [studentsData, setStudentsData] = useState(students);
  const [healthCampsData, setHealthCampsData] = useState(healthCamps);
  const [schemeCoverage, setSchemeCoverage] = useState(schemeData);
  const [districtRanking, setDistrictRanking] = useState(districtData);
  const [districtClimateRisk, setDistrictClimateRisk] = useState(null);
  const [climateMetrics, setClimateMetrics] = useState(climateData);
  const [genAiSchoolSummary, setGenAiSchoolSummary] = useState("");
  const [sickLeaveReports, setSickLeaveReports] = useState([]);
  const [operationalEvents, setOperationalEvents] = useState([]);

  const refreshGenAiSchoolSummary = useCallback(async () => {
    if (!token || !user?.schoolId) return;
    try {
      const summary = await apiRequest("/genai/school-summary", {
        method: "POST",
        token,
        body: {
          schoolId: user.schoolId,
          audience: user.backendRole === "DISTRICT_ADMIN" || user.backendRole === "SUPER_ADMIN" ? "DISTRICT_ADMIN" : "SCHOOL_ADMIN",
          language: "en"
        }
      });
      setGenAiSchoolSummary(summary?.summary || "");
    } catch {
      // no-op: keep UI usable without GenAI
    }
  }, [token, user]);

  const loadBackendData = useCallback(
    async (authToken, userProfile) => {
      try {
        if (userProfile?.backendRole === "PARENT") {
          const myChild = await apiRequest("/students/my-child", { token: authToken }).catch(() => null);
          if (myChild) {
            setStudentsData([mapBackendStudent(myChild, 0)]);
          }
          return;
        }

        const districtName = userProfile?.district || "Panipat, Haryana";
        const canViewDistrictAnalytics = DISTRICT_ANALYTICS_ROLES.has(userProfile?.backendRole || "");
        const canViewDistrictComparison = DISTRICT_COMPARISON_ROLES.has(userProfile?.backendRole || "");
        let schoolId = userProfile?.schoolId || null;

        if (!schoolId && canViewDistrictAnalytics) {
          const topRisk = await apiRequest(`/district/${encodeURIComponent(districtName)}/top-risk-schools`, { token: authToken });
          if (hasItems(topRisk)) {
            schoolId = topRisk[0].schoolId;
          }
        }

        if (schoolId) {
          const [studentRes, campRes, schemeRes, schoolSummary] = await Promise.all([
            apiRequest(`/students?page=1&pageSize=100&schoolId=${schoolId}`, { token: authToken }),
            apiRequest(`/health-camp/${schoolId}`, { token: authToken }),
            apiRequest(`/schools/${schoolId}/scheme-coverage`, { token: authToken }).catch(() => null),
            apiRequest(`/schools/${schoolId}/summary`, { token: authToken }).catch(() => null),
          ]);

          if (hasItems(studentRes?.data)) {
            setStudentsData(studentRes.data.map((s, idx) => mapBackendStudent(s, idx)));
          }

          if (hasItems(campRes)) {
            setHealthCampsData(campRes.map(mapBackendCamp));
          }

          if (schemeRes) {
            const total = Math.max(1, Number(schemeRes.totalStudents || 1));
            setSchemeCoverage([
              { scheme: "Midday Meal", eligible: total, covered: Math.round(total * 0.92), missing: Math.round(total * 0.08) },
              { scheme: "RBSK", eligible: total, covered: Number(schemeRes.rbsrFlagCount || 0), missing: Math.max(total - Number(schemeRes.rbsrFlagCount || 0), 0) },
              { scheme: "Ayushman", eligible: total, covered: Number(schemeRes.ayushmanEligibleCount || 0), missing: Math.max(total - Number(schemeRes.ayushmanEligibleCount || 0), 0) },
              { scheme: "PM Poshan", eligible: total, covered: Math.round(total * 0.96), missing: Math.round(total * 0.04) },
              { scheme: "Jan Aushadhi", eligible: total, covered: Math.round(total * 0.64), missing: Math.round(total * 0.36) },
            ]);
          }

          if (schoolSummary?.school?.district && !userProfile?.district) {
            userProfile.district = schoolSummary.school.district;
          }

          const genAiSummary = await apiRequest("/genai/school-summary", {
            method: "POST",
            token: authToken,
            body: {
              schoolId,
              audience: canViewDistrictAnalytics ? "DISTRICT_ADMIN" : "SCHOOL_ADMIN",
              language: "en"
            }
          }).catch(() => null);
          if (genAiSummary?.summary) {
            setGenAiSchoolSummary(genAiSummary.summary);
          }
        }

        if (canViewDistrictComparison) {
          const [districtComparison, climateRisk] = await Promise.all([
            apiRequest(`/district/${encodeURIComponent(districtName)}/comparison`, { token: authToken }).catch(() => null),
            canViewDistrictAnalytics
              ? apiRequest(`/district/${encodeURIComponent(districtName)}/climate-risk`, { token: authToken }).catch(() => null)
              : Promise.resolve(null),
          ]);

          if (hasItems(districtComparison)) {
            setDistrictRanking(
              districtComparison.map((entry, idx) => ({
                school: entry.schoolName || `School ${String(entry.schoolId).slice(0, 6).toUpperCase()}`,
                score: Number(Number(entry.compositeScore ?? (1 - Number(entry.avgRisk || 0)) * 100).toFixed(1)),
                rank: Number(entry.rank || idx + 1),
              }))
            );
          }

          if (climateRisk) {
            setDistrictClimateRisk(climateRisk);
            const envScore = Math.max(30, Math.min(95, Math.round(100 - (Number(climateRisk.avgAqi || 120) * 0.15 + Number(climateRisk.heatAlertDays || 0) * 2))));
            setClimateMetrics({
              envScore,
              heatwaveRisk: Number(climateRisk.avgTemperature || 0) >= 40 ? "High" : Number(climateRisk.avgTemperature || 0) >= 35 ? "Medium" : "Low",
              waterQuality: Math.max(40, Math.min(92, Math.round(100 - Number(climateRisk.avgAqi || 120) * 0.2))),
              carbonFootprint: Number((1.6 + Number(climateRisk.avgAqi || 120) / 120).toFixed(1)),
              treesPlanted: 142,
              solarPanels: 12,
              wasteRecycled: Math.max(40, Math.min(90, 85 - Number(climateRisk.heatAlertDays || 0))),
            });
          }
        }
      } catch {
        // Keep dashboard usable with fallback mock data.
      }
    },
    []
  );

  const login = useCallback(
    async (selectedRole, email, password) => {
      const authFlow = async () => {
        try {
          return await apiRequest("/auth/login", {
            method: "POST",
            body: { email, password },
          });
        } catch (error) {
          const message = String(error?.message || "");
          const invalidCredentials = /invalid credentials/i.test(message);
          if (!invalidCredentials) {
            throw error;
          }

          const backendRole = UI_ROLE_TO_BACKEND_ROLE[selectedRole] || "SCHOOL_ADMIN";
          const name = UI_ROLE_TO_DEFAULT_NAME[selectedRole] || "SwasthyaSetu User";
          try {
            return await apiRequest("/auth/register", {
              method: "POST",
              body: {
                name,
                email,
                password,
                role: backendRole,
              },
            });
          } catch (registerError) {
            const registerMessage = String(registerError?.message || "");
            const alreadyRegistered = /already registered|already exists|409/i.test(registerMessage);
            if (!alreadyRegistered) {
              throw registerError;
            }
            return apiRequest("/auth/login", {
              method: "POST",
              body: { email, password },
            });
          }
        }
      };

      await ensureBackendAwake();
      let auth;
      try {
        auth = await authFlow();
      } catch (error) {
        if (!isTransientApiError(error)) {
          throw error;
        }
        await ensureBackendAwake({ force: true });
        try {
          auth = await authFlow();
        } catch (retryError) {
          throw retryError;
        }
      }
      const accessToken = auth?.accessToken || "";
      if (!accessToken) {
        throw new Error("Access token missing");
      }
      if (PERSIST_SESSION) {
        localStorage.setItem("swasthya_token", accessToken);
      }
      setToken(accessToken);

      const me = await apiRequest("/auth/me", { token: accessToken });
      const uiRole = BACKEND_ROLE_TO_UI_ROLE[me.role] || selectedRole || ROLES.SCHOOL_ADMIN;
      const mappedUser = {
        id: me.id,
        name: me.name,
        email: me.email,
        role: uiRole,
        backendRole: me.role,
        roleLabel: BACKEND_ROLE_LABEL[me.role] || me.role,
        schoolId: me.schoolId || null,
        school: me.schoolId ? `School ${String(me.schoolId).slice(0, 6).toUpperCase()}` : "District Admin Office",
        udise: "N/A",
        district: "Panipat, Haryana",
        state: "Haryana",
        class: "Class 6-A",
      };
      setUser(mappedUser);
      await loadBackendData(accessToken, mappedUser);
    },
    [loadBackendData]
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        await apiRequest("/auth/logout", { method: "POST", token });
      }
    } catch {
      // ignore network failures on logout
    }
    localStorage.removeItem("swasthya_token");
    setToken("");
    setUser(null);
  }, [token]);

  const createHealthCamp = useCallback(
    async ({ campType, date, participantsCount }) => {
      if (!user?.schoolId || !token) return;
      const created = await apiRequest("/health-camp", {
        method: "POST",
        token,
        body: {
          schoolId: user.schoolId,
          campType,
          date,
          participantsCount,
        },
      });
      const newCamp = mapBackendCamp(created);
      setHealthCampsData((prev) => [newCamp, ...prev]);
    },
    [token, user]
  );

  const callParent = useCallback((phone, studentName = "student") => {
    const digits = String(phone || "").replace(/[^\d+]/g, "");
    if (!digits) {
      alert("Parent phone number not available.");
      return;
    }
    window.location.href = `tel:${digits}`;
    setTimeout(() => {
      alert(`Calling parent of ${studentName}: ${digits}`);
    }, 250);
  }, []);

  const sendSMS = useCallback(async (phone, message) => {
    const digits = String(phone || "").replace(/[^\d+]/g, "");
    if (!digits) {
      alert("SMS target number is missing.");
      return;
    }
    if (message && typeof message === "object" && token && message.studentName && message.riskLevel) {
      try {
        const sent = await apiRequest("/communications/parent-alert", {
          method: "POST",
          token,
          body: {
            phone: digits,
            studentName: message.studentName,
            riskLevel: String(message.riskLevel).toUpperCase(),
            condition: message.condition || undefined,
            language: message.language || "en",
            readingLevel: message.readingLevel || "simple",
            message: message.message || undefined
          }
        });
        if (sent?.status === "sent" || sent?.status === "simulated") {
          alert(`Parent alert ${String(sent.status).toUpperCase()} via ${sent.provider}.`);
          if (sent.status === "simulated") {
            const body = encodeURIComponent(sent.message || "Health notification from SwasthyaSetu.");
            window.location.href = `sms:${digits}?body=${body}`;
          }
          return;
        }
      } catch {
        // fallback to phone SMS intent
      }
    }

    const finalMessage = typeof message === "string" ? message : "Health notification from SwasthyaSetu.";
    const body = encodeURIComponent(finalMessage || "Health notification from SwasthyaSetu.");
    window.location.href = `sms:${digits}?body=${body}`;
  }, [token]);

  const generateReport = useCallback((filename, payload) => {
    const normalized = filename || `report-${Date.now()}.txt`;
    const content = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = normalized;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, []);

  const logSickLeaveReport = useCallback((report) => {
    if (!report) return;
    setSickLeaveReports((prev) => [report, ...prev].slice(0, 300));
  }, []);

  const logOperationalEvent = useCallback((event) => {
    if (!event) return;
    setOperationalEvents((prev) => [{ id: `${Date.now()}-${Math.random()}`, createdAt: new Date().toISOString(), ...event }, ...prev].slice(0, 500));
  }, []);

  useEffect(() => {
    void ensureBackendAwake().catch(() => {});
  }, []);

  useEffect(() => {
    if (!PERSIST_SESSION) {
      localStorage.removeItem("swasthya_token");
      return;
    }

    const bootstrap = async () => {
      if (!token || user) return;
      try {
        const me = await apiRequest("/auth/me", { token });
        const mappedUser = {
          id: me.id,
          name: me.name,
          email: me.email,
          role: BACKEND_ROLE_TO_UI_ROLE[me.role] || ROLES.SCHOOL_ADMIN,
          backendRole: me.role,
          roleLabel: BACKEND_ROLE_LABEL[me.role] || me.role,
          schoolId: me.schoolId || null,
          school: me.schoolId ? `School ${String(me.schoolId).slice(0, 6).toUpperCase()}` : "District Admin Office",
          udise: "N/A",
          district: "Panipat, Haryana",
          state: "Haryana",
          class: "Class 6-A",
        };
        setUser(mappedUser);
        await loadBackendData(token, mappedUser);
      } catch {
        localStorage.removeItem("swasthya_token");
        setToken("");
      }
    };
    void bootstrap();
  }, [token, user, loadBackendData]);

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        darkMode,
        setDarkMode,
        studentsData,
        healthCampsData,
        schemeCoverage,
        districtRanking,
        districtClimateRisk,
        climateMetrics,
        sickLeaveReports,
        operationalEvents,
        logSickLeaveReport,
        logOperationalEvent,
        genAiSchoolSummary,
        refreshGenAiSchoolSummary,
        createHealthCamp,
        callParent,
        sendSMS,
        generateReport,
      }}
    >
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Noto Sans', 'Segoe UI', sans-serif; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.85; } }
      `}</style>
      {!user ? <LoginPage /> : <AppContent />}
    </AppContext.Provider>
  );
}
