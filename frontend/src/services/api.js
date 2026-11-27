import axios from "axios";
import { API_BASE_URL } from "../config";

// =====================================================
// JalRakshak AI - Backend API Configuration
// =====================================================

const API = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});


// =====================================================
// 1. GET LATEST SENSOR DATA
// =====================================================

export const getLatestSensorData = async () => {
  const response = await API.get("/api/sensor-data/latest");

  return response.data;
};


// =====================================================
// 2. GET DASHBOARD SUMMARY
// =====================================================

export const getDashboardSummary = async () => {
  const response = await API.get("/api/dashboard/summary");

  return response.data;
};


// =====================================================
// 3. GET ALERTS
// =====================================================

export const getAlerts = async (params = {}) => {
  const response = await API.get("/api/alerts", {
    params,
  });

  return response.data;
};


// =====================================================
// 4. GET DEVICES
// =====================================================

export const getDevices = async () => {
  const response = await API.get("/api/devices");

  return response.data;
};


// =====================================================
// 5. GET SENSOR HISTORY
// =====================================================

export const getSensorHistory = async (limit = 20) => {
  const response = await API.get(
    "/api/sensor-data/history",
    {
      params: {
        limit,
      },
    }
  );

  return response.data;
};


// =====================================================
// 6. GET SETTINGS
// =====================================================

export const getSettings = async () => {
  const response = await API.get("/api/settings");

  return response.data;
};


// =====================================================
// 7. UPDATE SETTINGS
// =====================================================

export const updateSettings = async (settings) => {
  const response = await API.put(
    "/api/settings",
    settings
  );

  return response.data;
};


// =====================================================
// 8. GET SYSTEM STATUS
// =====================================================

export const getSystemStatus = async () => {
  const response = await API.get("/api/system/status");

  return response.data;
};


// =====================================================
// Export Axios API instance
// =====================================================

export default API;
// =====================================================
// HISTORY SETTING
// =====================================================

export const updateHistorySetting = async (enabled) => {
  const response = await API.put(
    "/api/settings/history",
    {
      history_enabled: enabled,
    }
  );

  return response.data;
};
// =====================================================
// INDIA STANDARD TIME (IST) FORMATTER
// =====================================================

export const formatIST = (timestamp) => {
  if (!timestamp) return "N/A";

  try {
    return new Date(timestamp).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Unable to format timestamp:", error);
    return "N/A";
  }
};