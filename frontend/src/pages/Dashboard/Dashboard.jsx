import { useEffect, useState } from "react";

import {
  Activity,
  Droplets,
  Gauge,
  FlaskConical,
  AlertTriangle,
  ShieldAlert,
  Brain,
  Wifi,
  Sun,
  Moon,
} from "lucide-react";

import {
  getDashboardSummary,
  getSensorHistory,
  getAlerts,
} from "../../services/api";

import SensorChart from "../../components/SensorChart/SensorChart";
import useMonitoringSettings from "../../hooks/useMonitoringSettings";
import useSensorWebSocket from "../../hooks/useSensorWebSocket";
import useTheme from "../../context/useTheme";


function Dashboard({ dashboard }) {
  const { autoRefresh, refreshInterval } = useMonitoringSettings();
  const { theme, toggleTheme } = useTheme();
  const { latestUpdate, connected: wsConnected } = useSensorWebSocket();

  /* =========================================================
     SENSOR HISTORY
  ========================================================= */

  const [sensorHistory, setSensorHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);


  /* =========================================================
     ALERT HISTORY
  ========================================================= */

  const [alertHistory, setAlertHistory] = useState([]);
  const [alertsLoading, setAlertsLoading] = useState(true);


  /* =========================================================
     REAL-TIME DASHBOARD REFRESH
     Refreshes every 5 seconds
  ========================================================= */

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        const [
          dashboardResponse,
          historyResponse,
          alertsResponse,
        ] = await Promise.all([
          getDashboardSummary(),
          getSensorHistory(20),
          getAlerts(),
        ]);


        if (!isMounted) {
          return;
        }


        /* -----------------------------
           DASHBOARD SUMMARY
           The parent dashboard prop remains the primary
           source for the summary.
        ----------------------------- */

        if (!dashboardResponse?.success) {
          console.warn(
            "JalRakshak AI: Dashboard summary unavailable."
          );
        }


        /* -----------------------------
           SENSOR HISTORY
        ----------------------------- */

        if (
          historyResponse?.success &&
          Array.isArray(historyResponse.data)
        ) {
          // API returns latest readings first.
          // Reverse them so the chart displays oldest → newest.
          setSensorHistory(
            [...historyResponse.data].reverse()
          );
        } else {
          setSensorHistory([]);
        }


        /* -----------------------------
           ALERT HISTORY
        ----------------------------- */

        if (
          alertsResponse?.success &&
          Array.isArray(alertsResponse.data)
        ) {
          setAlertHistory(
            alertsResponse.data
          );
        } else {
          setAlertHistory([]);
        }

      } catch (error) {
        console.error(
          "Real-Time Dashboard Refresh Error:",
          error
        );
      } finally {
        if (isMounted) {
          setHistoryLoading(false);
          setAlertsLoading(false);
        }
      }
    };


    // Load immediately when Dashboard opens
    loadDashboardData();


    // Refresh according to Settings
    let refreshTimer = null;

    if (autoRefresh && !wsConnected) {
      refreshTimer = setInterval(
        loadDashboardData,
        refreshInterval * 1000
      );
    }


    // Stop refreshing when leaving Dashboard
    return () => {
      isMounted = false;
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };

  }, [autoRefresh, refreshInterval, wsConnected]);


  /* =========================================================
     REAL-TIME WEBSOCKET SENSOR UPDATE

     The latest WebSocket reading is kept in latestUpdate by
     the hook. We do not synchronously update sensor history
     here, which avoids React set-state-in-effect warnings.
  ========================================================= */

  useEffect(() => {
    if (!latestUpdate || latestUpdate.event !== "sensor_update") {
      return;
    }

    // If a new alert was created, refresh the alert list immediately.
    if (Number(latestUpdate.alerts_created || 0) > 0) {
      getAlerts()
        .then((response) => {
          if (response?.success && Array.isArray(response.data)) {
            setAlertHistory(response.data);
          }
        })
        .catch((error) => {
          console.error(
            "JalRakshak AI WebSocket Alert Refresh Error:",
            error
          );
        });
    }
  }, [latestUpdate]);


  /* =========================================================
     LIVE WEBSOCKET READING
  ========================================================= */

  const liveReading =
    latestUpdate?.event === "sensor_update"
      ? {
          ...(latestUpdate.sensor_data || {}),
          device_id: latestUpdate.device_id,
          zone_id: latestUpdate.zone_id,
          timestamp: latestUpdate.timestamp,
          detection: latestUpdate.detection || {},
          ai_detection: latestUpdate.ai_detection || {},
          field_sources: latestUpdate.field_sources || {},
        }
      : null;


  const liveDetection =
    latestUpdate?.event === "sensor_update"
      ? latestUpdate.detection || {}
      : {};


  /* =========================================================
     DISPLAY SENSOR HISTORY

     Combines the API history with the newest WebSocket reading
     without modifying React state inside the WebSocket effect.
  ========================================================= */

  const displaySensorHistory = liveReading
    ? [
        ...sensorHistory.filter(
          (item) => item?.timestamp !== liveReading.timestamp
        ),
        liveReading,
      ].slice(-20)
    : sensorHistory;


  /* =========================================================
     DASHBOARD DATA
  ========================================================= */

  const currentDashboard = {
    ...(dashboard || {}),

    system: {
      ...(dashboard?.system || {}),
      ...(liveReading
        ? {
            device_id: liveReading.device_id,
            zone_id: liveReading.zone_id,
            device_status: "ONLINE",
            status:
              liveDetection.overall_status ||
              dashboard?.system?.status ||
              "UNKNOWN",
          }
        : {}),
    },

    latest_reading:
      liveReading ||
      dashboard?.latest_reading ||
      {},

    water_quality:
      liveDetection.water_quality ||
      dashboard?.water_quality ||
      {},

    leakage:
      liveDetection.leakage ||
      dashboard?.leakage ||
      {},

    theft:
      liveDetection.theft ||
      dashboard?.theft ||
      {},

    ai_detection:
      latestUpdate?.ai_detection ||
      dashboard?.ai_detection ||
      {},
  };

  const reading =
    currentDashboard?.latest_reading || {};


  const quality =
    currentDashboard?.water_quality || {};


  const leakage =
    currentDashboard?.leakage || {};


  const theft =
    currentDashboard?.theft || {};


  const system =
    currentDashboard?.system || {};


  /* =========================================================
     ALERT ANALYTICS
  ========================================================= */

  const totalAlerts =
    alertHistory.length;


  const activeAlerts =
    alertHistory.filter(
      (alert) =>
        String(
          alert.status || ""
        ).toUpperCase() === "ACTIVE"
    ).length;


  const leakageAlerts =
    alertHistory.filter(
      (alert) =>
        String(
          alert.alert_type ||
          alert.type ||
          ""
        ).toUpperCase() === "LEAKAGE"
    ).length;


  const theftAlerts =
    alertHistory.filter(
      (alert) =>
        String(
          alert.alert_type ||
          alert.type ||
          ""
        ).toUpperCase() === "THEFT"
    ).length;


  /* =========================================================
     STATUS CLASS
  ========================================================= */

  const getStatusClass = (status) => {
    if (!status) {
      return "status-normal";
    }


    const value =
      String(status).toUpperCase();


    if (
      value === "CRITICAL" ||
      value === "OFFLINE" ||
      value === "POOR"
    ) {
      return "status-critical";
    }


    if (
      value === "WARNING" ||
      value === "SUSPICIOUS" ||
      value === "POSSIBLE_THEFT"
    ) {
      return "status-warning";
    }


    return "status-normal";
  };


  /* =========================================================
     DEVICE STATUS
  ========================================================= */

  const deviceStatus =
    system.device_status || "UNKNOWN";


  const deviceStatusClass =
    String(deviceStatus).toUpperCase() === "ONLINE"
      ? "online"
      : "";


  /* =========================================================
     CURRENT USER + GREETING
  ========================================================= */

  let currentUser = null;

  try {
    const storedUser =
      localStorage.getItem("jalrakshak_user");

    if (storedUser) {
      currentUser = JSON.parse(storedUser);
    }
  } catch (error) {
    console.error(
      "JalRakshak AI: Unable to read logged-in user:",
      error
    );
  }


  const userName =
    currentUser?.full_name ||
    currentUser?.username ||
    "User";


  const currentHour = new Date().getHours();

  let greeting = "Good Evening";

  if (currentHour < 12) {
    greeting = "Good Morning";
  } else if (currentHour < 17) {
    greeting = "Good Afternoon";
  }


  return (
    <div className="dashboard-page">


      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="dashboard-header">

        <div className="dashboard-header-content">

          <div className="dashboard-greeting">

            <span className="greeting-text">
              {greeting},
            </span>

            <span className="greeting-name">
              {userName}
            </span>

            <span className="greeting-wave">
              👋
            </span>

          </div>

          <h1>
            JalRakshak AI
          </h1>

          <p>
            Smart Water Monitoring & Intelligent Detection
          </p>

        </div>


        <div className="dashboard-header-actions">

          <button
            type="button"
            className="theme-toggle-button"
            onClick={toggleTheme}
            title={
              theme === "dark"
                ? "Switch to Light Mode"
                : "Switch to Dark Mode"
            }
          >

            {theme === "dark" ? (
              <>
                <Sun size={17} />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={17} />
                <span>Dark Mode</span>
              </>
            )}

          </button>

          <div
            className={`system-status ${deviceStatusClass}`}
          >

            <Wifi size={16} />

            <span>
              Device {deviceStatus}
            </span>

          </div>

        </div>

      </header>


      {/* =====================================================
          STATISTICS
      ===================================================== */}

      <section className="stats-grid">


        {/* FLOW */}

        <div className="stat-card">

          <div className="stat-icon">
            <Activity size={24} />
          </div>

          <div className="stat-card-content">

            <h3>
              Current Flow
            </h3>

            <strong>
              {reading.flow_rate ?? "--"}
            </strong>

            <p>
              L/min
            </p>

          </div>

        </div>


        {/* PRESSURE */}

        <div className="stat-card">

          <div className="stat-icon">
            <Gauge size={24} />
          </div>

          <div className="stat-card-content">

            <h3>
              Water Pressure
            </h3>

            <strong>
              {reading.pressure_bar ?? "--"}
            </strong>

            <p>
              bar
            </p>

          </div>

        </div>


        {/* WATER QUALITY */}

        <div className="stat-card">

          <div className="stat-icon">
            <FlaskConical size={24} />
          </div>

          <div className="stat-card-content">

            <h3>
              Water Quality
            </h3>

            <strong
              className={getStatusClass(
                quality.status
              )}
            >
              {quality.status || "--"}
            </strong>

            <p>
              Current quality status
            </p>

          </div>

        </div>


        {/* CONSUMPTION */}

        <div className="stat-card">

          <div className="stat-icon">
            <Droplets size={24} />
          </div>

          <div className="stat-card-content">

            <h3>
              Total Consumption
            </h3>

            <strong>
              {reading.total_litres ?? "--"}
            </strong>

            <p>
              Litres
            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          LIVE SENSOR READINGS
      ===================================================== */}

      <section className="dashboard-section">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              Live Sensor Readings
            </h2>

            <p className="section-subtitle">
              ESP32: flow, pH, turbidity and TDS | Simulator: pressure and virtual zones
            </p>

          </div>


          <div className="live-sensor-device">

            Device:{" "}

            <strong>
              {system.device_id || "--"}
            </strong>

          </div>

        </div>


        <div className="sensor-grid">


          <div className="sensor-card">

            <h4>
              Flow Rate
            </h4>

            <strong>
              {reading.flow_rate ?? "--"} L/min
            </strong>

          </div>


          <div className="sensor-card">

            <h4>
              Pressure
            </h4>

            <strong>
              {reading.pressure_bar ?? "--"} bar
            </strong>

          </div>


          <div className="sensor-card">

            <h4>
              pH Level
            </h4>

            <strong>
              {reading.ph ?? "--"}
            </strong>

          </div>


          <div className="sensor-card">

            <h4>
              Turbidity
            </h4>

            <strong>
              {reading.turbidity ?? "--"} NTU
            </strong>

          </div>


          <div className="sensor-card">

            <h4>
              TDS
            </h4>

            <strong>
              {reading.tds ?? "--"} ppm
            </strong>

          </div>


          <div className="sensor-card">

            <h4>
              Total Litres
            </h4>

            <strong>
              {reading.total_litres ?? "--"} L
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================================
          SENSOR ANALYTICS
      ===================================================== */}

      <section className="dashboard-section">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              Sensor Analytics
            </h2>

            <p className="section-subtitle">
              Historical sensor measurements from JalRakshak AI
            </p>

          </div>

        </div>


        {historyLoading ? (

          <div className="chart-empty">
            Loading sensor analytics...
          </div>

        ) : displaySensorHistory.length === 0 ? (

          <div className="chart-empty">
            No sensor history available.
          </div>

        ) : (

          <div className="analytics-grid">


            {/* FLOW RATE */}

            <SensorChart
              data={displaySensorHistory}
              dataKey="flow_rate"
              title="Flow Rate"
              unit="L/min"
              lineColor="#6C5CE7"
            />


            {/* WATER PRESSURE */}

            <SensorChart
              data={displaySensorHistory}
              dataKey="pressure_bar"
              title="Water Pressure"
              unit="bar"
              lineColor="#00D4FF"
            />


            {/* pH LEVEL */}

            <SensorChart
              data={displaySensorHistory}
              dataKey="ph"
              title="pH Level"
              unit="pH"
              lineColor="#6C5CE7"
            />


            {/* TURBIDITY */}

            <SensorChart
              data={displaySensorHistory}
              dataKey="turbidity"
              title="Turbidity"
              unit="NTU"
              lineColor="#00D4FF"
            />


            {/* TDS */}

            <SensorChart
              data={displaySensorHistory}
              dataKey="tds"
              title="TDS Level"
              unit="ppm"
              lineColor="#6C5CE7"
            />


            {/* TOTAL CONSUMPTION */}

            <SensorChart
              data={displaySensorHistory}
              dataKey="total_litres"
              title="Water Consumption"
              unit="Litres"
              lineColor="#00D4FF"
            />

          </div>

        )}

      </section>


      {/* =====================================================
          INTELLIGENT DETECTION
      ===================================================== */}

      <section className="dashboard-section">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              Intelligent Detection
            </h2>

            <p className="section-subtitle">
              Rule-based monitoring and AI-powered analysis
            </p>

          </div>

        </div>


        <div className="detection-grid">


          {/* LEAKAGE */}

          <div className="detection-card">

            <div className="detection-heading">

              <div className="detection-icon">
                <Droplets size={21} />
              </div>

              <div>

                <h3>
                  Leakage Detection
                </h3>

                <span
                  className={`status-badge ${getStatusClass(
                    leakage.level
                  )}`}
                >
                  {leakage.level || "NORMAL"}
                </span>

              </div>

            </div>

            <p>
              {leakage.reason ||
                "No leakage detected."}
            </p>

          </div>


          {/* THEFT */}

          <div className="detection-card">

            <div className="detection-heading">

              <div className="detection-icon">
                <ShieldAlert size={21} />
              </div>

              <div>

                <h3>
                  Theft Detection
                </h3>

                <span
                  className={`status-badge ${getStatusClass(
                    theft.level
                  )}`}
                >
                  {theft.level || "NORMAL"}
                </span>

              </div>

            </div>

            <p>
              {theft.reason ||
                "No suspicious consumption detected."}
            </p>

          </div>


          {/* WATER QUALITY */}

          <div className="detection-card">

            <div className="detection-heading">

              <div className="detection-icon">
                <FlaskConical size={21} />
              </div>

              <div>

                <h3>
                  Water Quality
                </h3>

                <span
                  className={`status-badge ${getStatusClass(
                    quality.status
                  )}`}
                >
                  {quality.status || "GOOD"}
                </span>

              </div>

            </div>

            <p>
              {quality.reason ||
                "Water quality is within normal range."}
            </p>

          </div>


          {/* AI ANALYTICS */}

          <div className="detection-card">

            <div className="detection-heading">

              <div className="detection-icon">
                <Brain size={21} />
              </div>

              <div>

                <h3>
                  AI Analytics
                </h3>

                <span className="status-badge normal">
                  READY
                </span>

              </div>

            </div>

            <p>
              AI anomaly detection will analyze
              abnormal water usage patterns.
            </p>

          </div>

        </div>

      </section>


      {/* =====================================================
          SYSTEM HEALTH
      ===================================================== */}

      <section className="dashboard-section">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              System Health
            </h2>

            <p className="section-subtitle">
              Current status of JalRakshak AI monitoring services
            </p>

          </div>

        </div>


        <div className="system-health-grid">


          {/* ESP32 DEVICE */}

          <div className="health-card">

            <div className="health-icon">
              <Wifi size={21} />
            </div>

            <div className="health-content">

              <h3>
                ESP32 Device
              </h3>

              <p>
                {system.device_id ||
                  "Device not detected"}
              </p>

            </div>

            <span
              className={`health-status ${
                deviceStatus.toUpperCase() === "ONLINE"
                  ? "health-online"
                  : "health-offline"
              }`}
            >

              <span className="health-dot"></span>

              {deviceStatus.toUpperCase() === "ONLINE"
                ? "ONLINE"
                : "OFFLINE"}

            </span>

          </div>


          {/* SENSOR DATA */}

          <div className="health-card">

            <div className="health-icon">
              <Activity size={21} />
            </div>

            <div className="health-content">

              <h3>
                Sensor Data
              </h3>

              <p>
                {displaySensorHistory.length > 0
                  ? `${displaySensorHistory.length} readings available`
                  : "No recent readings"}
              </p>

            </div>

            <span
              className={`health-status ${
                displaySensorHistory.length > 0
                  ? "health-online"
                  : "health-offline"
              }`}
            >

              <span className="health-dot"></span>

              {displaySensorHistory.length > 0
                ? "ACTIVE"
                : "NO DATA"}

            </span>

          </div>


          {/* WATER QUALITY */}

          <div className="health-card">

            <div className="health-icon">
              <FlaskConical size={21} />
            </div>

            <div className="health-content">

              <h3>
                Water Quality
              </h3>

              <p>
                {quality.reason ||
                  "Water quality monitoring active"}
              </p>

            </div>

            <span
              className={`health-status ${
                getStatusClass(
                  quality.status
                )
              }`}
            >

              <span className="health-dot"></span>

              {quality.status || "UNKNOWN"}

            </span>

          </div>


          {/* LEAKAGE MONITORING */}

          <div className="health-card">

            <div className="health-icon">
              <Droplets size={21} />
            </div>

            <div className="health-content">

              <h3>
                Leakage Monitoring
              </h3>

              <p>
                {leakage.reason ||
                  "Leakage detection active"}
              </p>

            </div>

            <span
              className={`health-status ${
                leakage.detected
                  ? "status-critical"
                  : "health-online"
              }`}
            >

              <span className="health-dot"></span>

              {leakage.detected
                ? "DETECTED"
                : "NORMAL"}

            </span>

          </div>


          {/* THEFT MONITORING */}

          <div className="health-card">

            <div className="health-icon">
              <ShieldAlert size={21} />
            </div>

            <div className="health-content">

              <h3>
                Theft Monitoring
              </h3>

              <p>
                {theft.reason ||
                  "Water theft detection active"}
              </p>

            </div>

            <span
              className={`health-status ${
                theft.suspicious
                  ? "status-warning"
                  : "health-online"
              }`}
            >

              <span className="health-dot"></span>

              {theft.suspicious
                ? "SUSPICIOUS"
                : "NORMAL"}

            </span>

          </div>


          {/* AI ENGINE */}

          <div className="health-card">

            <div className="health-icon">
              <Brain size={21} />
            </div>

            <div className="health-content">

              <h3>
                AI Analytics
              </h3>

              <p>
                Anomaly detection engine
              </p>

            </div>

            <span className="health-status health-ready">

              <span className="health-dot"></span>

              READY

            </span>

          </div>

        </div>

      </section>


      {/* =====================================================
          ALERT OVERVIEW
      ===================================================== */}

      <section className="dashboard-section">

        <div className="section-header">

          <div>

            <h2 className="section-title">
              Alert Overview
            </h2>

            <p className="section-subtitle">
              Monitoring alerts detected by JalRakshak AI
            </p>

          </div>

        </div>


        {alertsLoading ? (

          <div className="chart-empty">
            Loading alert analytics...
          </div>

        ) : (

          <div className="alert-analytics-grid">


            {/* TOTAL ALERTS */}

            <div className="alert-stat-card">

              <div className="alert-stat-icon">
                <AlertTriangle size={21} />
              </div>

              <div>

                <span>
                  Total Alerts
                </span>

                <strong>
                  {totalAlerts}
                </strong>

              </div>

            </div>


            {/* ACTIVE ALERTS */}

            <div className="alert-stat-card">

              <div className="alert-stat-icon">
                <Wifi size={21} />
              </div>

              <div>

                <span>
                  Active Alerts
                </span>

                <strong>
                  {activeAlerts}
                </strong>

              </div>

            </div>


            {/* LEAKAGE ALERTS */}

            <div className="alert-stat-card">

              <div className="alert-stat-icon">
                <Droplets size={21} />
              </div>

              <div>

                <span>
                  Leakage Alerts
                </span>

                <strong>
                  {leakageAlerts}
                </strong>

              </div>

            </div>


            {/* THEFT ALERTS */}

            <div className="alert-stat-card">

              <div className="alert-stat-icon">
                <ShieldAlert size={21} />
              </div>

              <div>

                <span>
                  Theft Alerts
                </span>

                <strong>
                  {theftAlerts}
                </strong>

              </div>

            </div>

          </div>

        )}

      </section>


      {/* =====================================================
          LAST UPDATED
      ===================================================== */}

      <div className="last-updated">

        Last sensor update:{" "}

        {reading.timestamp
          ? new Date(reading.timestamp).toLocaleString("en-IN", {
              timeZone: "Asia/Kolkata",
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: true,
            })
          : "Not available"}

      </div>

    </div>
  );
}

export default Dashboard;