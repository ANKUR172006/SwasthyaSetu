import React from "react";
import { createRoot } from "react-dom/client";
import SwasthyaSetu from "./SwasthyaSetu";

const runtimeConfig = window.__APP_CONFIG__ || {};
const normalizeBaseUrl = (value) => {
  const raw = String(value || "").trim().replace(/\/+$/, "");
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^[a-z0-9.-]+(?::\d+)?$/i.test(raw)) {
    return `${window.location.protocol === "http:" ? "http" : "https"}://${raw}`;
  }
  return "";
};
const telemetryBaseUrl = normalizeBaseUrl(runtimeConfig.API_BASE_URL);
const reportClientIssue = (message, details = {}) => {
  if (!telemetryBaseUrl) return;
  fetch(`${telemetryBaseUrl.replace(/\/+$/, "")}/client-errors`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      source: "frontend",
      level: "error",
      message,
      details,
      path: window.location.pathname
    })
  }).catch(() => {});
};

window.addEventListener("error", (event) => {
  reportClientIssue("window_error", {
    error: event.error?.message || event.message || "unknown_error"
  });
});

window.addEventListener("unhandledrejection", (event) => {
  reportClientIssue("unhandled_promise_rejection", {
    reason: String(event.reason?.message || event.reason || "unknown_rejection")
  });
});

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <SwasthyaSetu />
  </React.StrictMode>
);
