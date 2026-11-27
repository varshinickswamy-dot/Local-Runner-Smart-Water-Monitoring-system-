import { Droplets, FlaskConical, ShieldAlert, Cpu } from "lucide-react";

export const ALERT_TITLES = {
  LEAKAGE: "Leakage alert",
  THEFT: "Theft alert",
  WATER_QUALITY: "Water quality alert",
  SENSOR_FAILURE: "Sensor failure alert",
};

export const ALERT_ICONS = {
  LEAKAGE: Droplets,
  THEFT: ShieldAlert,
  WATER_QUALITY: FlaskConical,
  SENSOR_FAILURE: Cpu,
};

// "critical" | "warning" for colouring
export function severityTone(severity) {
  return severity === "CRITICAL" ? "critical" : "warning";
}

export function formatAlertTime(timestamp) {
  const seconds = Math.round((Date.now() - timestamp) / 1000);

  if (seconds < 10) {
    return null; // shown as "Just now"
  }

  return new Date(timestamp).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
