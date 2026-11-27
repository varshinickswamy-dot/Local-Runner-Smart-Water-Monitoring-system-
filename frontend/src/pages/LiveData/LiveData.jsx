import { useEffect, useState } from "react";

import {
  Activity,
  Gauge,
  FlaskConical,
  Droplets,
  Waves,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";

import { getLatestSensorData } from "../../services/api";

import useMonitoringSettings from "../../hooks/useMonitoringSettings";

import "./LiveData.css";

// =====================================================
// JalRakshak AI
// Live Data Page
// =====================================================

function LiveData() {
  const [sensorData, setSensorData] = useState(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [isLive, setIsLive] = useState(false);

  // =====================================================
  // MONITORING SETTINGS
  // =====================================================

  const {
    autoRefresh,
    refreshInterval,
  } = useMonitoringSettings();

  // =====================================================
  // LOAD LATEST SENSOR DATA
  // =====================================================

  useEffect(() => {
    let isMounted = true;

    const loadSensorData = async () => {
      try {
        const response =
          await getLatestSensorData();

        if (!isMounted) {
          return;
        }

        if (
          response?.success &&
          response?.data
        ) {
          setSensorData(response.data);

          setLastUpdated(
            new Date()
          );

          setIsLive(true);

          setError("");
        } else {
          setIsLive(false);

          setError(
            "No live sensor data available."
          );
        }
      } catch (err) {
        console.error(
          "JalRakshak AI Live Data Error:",
          err
        );

        if (!isMounted) {
          return;
        }

        setIsLive(false);

        setError(
          "Unable to receive live sensor data from JalRakshak AI backend."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // =====================================================
    // INITIAL REQUEST
    // =====================================================

    loadSensorData();

    // =====================================================
    // AUTO REFRESH
    // Controlled by Settings page
    // =====================================================

    let refreshTimer = null;

    if (autoRefresh) {
      refreshTimer = setInterval(
        loadSensorData,
        Number(refreshInterval) * 1000
      );
    }

    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {
      isMounted = false;

      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
    };
  }, [
    autoRefresh,
    refreshInterval,
  ]);

  // =====================================================
  // FORMAT VALUE
  // =====================================================

  const formatValue = (
    value,
    decimals = 2
  ) => {
    if (
      value === null ||
      value === undefined ||
      Number.isNaN(Number(value))
    ) {
      return "--";
    }

    return Number(value).toFixed(
      decimals
    );
  };

  // =====================================================
  // FORMAT TIME
  // =====================================================

  const formatTime = (dateValue) => {
    if (!dateValue) {
      return "--";
    }

    try {
      return new Date(
        dateValue
      ).toLocaleTimeString();
    } catch {
      return "--";
    }
  };

  // =====================================================
  // GET QUALITY STATUS
  // =====================================================

  const getQualityStatus = () => {
    if (!sensorData) {
      return "UNKNOWN";
    }

    const ph = Number(
      sensorData.ph
    );

    const turbidity = Number(
      sensorData.turbidity
    );

    if (
      ph < 5.5 ||
      ph > 9.5 ||
      turbidity > 10
    ) {
      return "CRITICAL";
    }

    if (
      ph < 6.5 ||
      ph > 8.5 ||
      turbidity > 5
    ) {
      return "WARNING";
    }

    return "GOOD";
  };

  // =====================================================
  // GET LEAKAGE STATUS
  // =====================================================

  const getLeakageStatus = () => {
    if (!sensorData) {
      return "UNKNOWN";
    }

    const flow = Number(
      sensorData.flow_rate
    );

    const pressure = Number(
      sensorData.pressure_bar
    );

    if (
      pressure < 0.5 &&
      flow > 5
    ) {
      return "DETECTED";
    }

    if (
      pressure < 0.7 &&
      flow > 15
    ) {
      return "SUSPICIOUS";
    }

    return "NORMAL";
  };

  // =====================================================
  // GET THEFT STATUS
  // =====================================================

  const getTheftStatus = () => {
    if (!sensorData) {
      return "UNKNOWN";
    }

    const flow = Number(
      sensorData.flow_rate
    );

    const pressure = Number(
      sensorData.pressure_bar
    );

    if (
      flow > 20 &&
      pressure >= 0.5
    ) {
      return "SUSPICIOUS";
    }

    return "NORMAL";
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="live-data-page">

        <div className="live-data-loading">

          <RefreshCw
            size={26}
            className="loading-spin"
          />

          <span>
            Loading live sensor data...
          </span>

        </div>

      </div>
    );
  }

  // =====================================================
  // MAIN PAGE
  // =====================================================

  const qualityStatus =
    getQualityStatus();

  const leakageStatus =
    getLeakageStatus();

  const theftStatus =
    getTheftStatus();

  return (
    <div className="live-data-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="live-data-header">

        <div>

          <p className="live-data-eyebrow">
            JALRAKSHAK AI
          </p>

          <h1>
            Live Data
          </h1>

          <p>
            Real-time water sensor monitoring
            and system status.
          </p>

        </div>

        <div
          className={
            `live-connection-status ${
              isLive
                ? "live-status-online"
                : "live-status-offline"
            }`
          }
        >

          {isLive ? (
            <Wifi size={17} />
          ) : (
            <WifiOff size={17} />
          )}

          <span>
            {isLive
              ? "LIVE"
              : "OFFLINE"}
          </span>

        </div>

      </div>

      {/* =================================================
          DEVICE INFORMATION
      ================================================= */}

      <div className="live-device-bar">

        <div className="live-device-item">

          <Database size={17} />

          <div>

            <span>
              Device
            </span>

            <strong>
              {sensorData?.device_id ||
                "JAL-ESP32-001"}
            </strong>

          </div>

        </div>

        <div className="live-device-item">

          <Activity size={17} />

          <div>

            <span>
              Zone
            </span>

            <strong>
              {sensorData?.zone_id ||
                "ZONE-03"}
            </strong>

          </div>

        </div>

        <div className="live-device-item">

          <RefreshCw size={17} />

          <div>

            <span>
              Last Updated
            </span>

            <strong>
              {formatTime(lastUpdated)}
            </strong>

          </div>

        </div>

      </div>

      {/* =================================================
          AUTO REFRESH STATUS
      ================================================= */}

      <div
        className={
          `live-refresh-info ${
            autoRefresh
              ? "refresh-enabled"
              : "refresh-disabled"
          }`
        }
      >

        <RefreshCw size={16} />

        <span>
          {autoRefresh
            ? `Auto refresh enabled • Every ${refreshInterval} seconds`
            : "Auto refresh disabled • Manual refresh only"}
        </span>

      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (

        <div className="live-data-warning">

          <AlertTriangle size={18} />

          <span>
            {error}
          </span>

        </div>

      )}

      {/* =================================================
          SENSOR CARDS
      ================================================= */}

      <div className="live-sensor-grid">

        {/* FLOW */}

        <div className="live-sensor-card">

          <div className="live-sensor-top">

            <div className="live-sensor-icon">

              <Activity size={21} />

            </div>

            <span className="live-sensor-label">
              FLOW RATE
            </span>

          </div>

          <div className="live-sensor-value">

            {formatValue(
              sensorData?.flow_rate
            )}

            <small>
              L/min
            </small>

          </div>

          <div className="live-sensor-footer">

            <span>
              Current Flow
            </span>

            <span className="sensor-normal">
              NORMAL
            </span>

          </div>

        </div>

        {/* PRESSURE */}

        <div className="live-sensor-card">

          <div className="live-sensor-top">

            <div className="live-sensor-icon">

              <Gauge size={21} />

            </div>

            <span className="live-sensor-label">
              PRESSURE
            </span>

          </div>

          <div className="live-sensor-value">

            {formatValue(
              sensorData?.pressure_bar
            )}

            <small>
              bar
            </small>

          </div>

          <div className="live-sensor-footer">

            <span>
              Pipeline Pressure
            </span>

            <span className="sensor-normal">
              NORMAL
            </span>

          </div>

        </div>

        {/* PH */}

        <div className="live-sensor-card">

          <div className="live-sensor-top">

            <div className="live-sensor-icon">

              <FlaskConical size={21} />

            </div>

            <span className="live-sensor-label">
              pH LEVEL
            </span>

          </div>

          <div className="live-sensor-value">

            {formatValue(
              sensorData?.ph
            )}

          </div>

          <div className="live-sensor-footer">

            <span>
              Acidity / Alkalinity
            </span>

            <span
              className={
                qualityStatus === "GOOD"
                  ? "sensor-normal"
                  : "sensor-warning"
              }
            >
              {qualityStatus}
            </span>

          </div>

        </div>

        {/* TURBIDITY */}

        <div className="live-sensor-card">

          <div className="live-sensor-top">

            <div className="live-sensor-icon">

              <Waves size={21} />

            </div>

            <span className="live-sensor-label">
              TURBIDITY
            </span>

          </div>

          <div className="live-sensor-value">

            {formatValue(
              sensorData?.turbidity
            )}

            <small>
              NTU
            </small>

          </div>

          <div className="live-sensor-footer">

            <span>
              Water Clarity
            </span>

            <span
              className={
                qualityStatus === "GOOD"
                  ? "sensor-normal"
                  : "sensor-warning"
              }
            >
              {qualityStatus}
            </span>

          </div>

        </div>

        {/* TDS */}

        <div className="live-sensor-card">

          <div className="live-sensor-top">

            <div className="live-sensor-icon">

              <Droplets size={21} />

            </div>

            <span className="live-sensor-label">
              TDS
            </span>

          </div>

          <div className="live-sensor-value">

            {formatValue(
              sensorData?.tds
            )}

            <small>
              ppm
            </small>

          </div>

          <div className="live-sensor-footer">

            <span>
              Dissolved Solids
            </span>

            <span className="sensor-normal">
              MONITORED
            </span>

          </div>

        </div>

        {/* TOTAL WATER */}

        <div className="live-sensor-card">

          <div className="live-sensor-top">

            <div className="live-sensor-icon">

              <Database size={21} />

            </div>

            <span className="live-sensor-label">
              TOTAL WATER
            </span>

          </div>

          <div className="live-sensor-value">

            {formatValue(
              sensorData?.total_litres
            )}

            <small>
              L
            </small>

          </div>

          <div className="live-sensor-footer">

            <span>
              Total Recorded
            </span>

            <span className="sensor-normal">
              TRACKING
            </span>

          </div>

        </div>

      </div>

      {/* =================================================
          INTELLIGENT STATUS
      ================================================= */}

      <div className="live-status-section">

        <div className="live-section-heading">

          <div>

            <span>
              JALRAKSHAK AI
            </span>

            <h2>
              Intelligent Detection
            </h2>

          </div>

          <ShieldCheck size={21} />

        </div>

        <div className="live-detection-grid">

          {/* SYSTEM */}

          <div className="live-detection-card">

            <span>
              SYSTEM STATUS
            </span>

            <strong>
              {sensorData?.status ||
                "NORMAL"}
            </strong>

            <small>
              Current device condition
            </small>

          </div>

          {/* LEAKAGE */}

          <div className="live-detection-card">

            <span>
              LEAKAGE
            </span>

            <strong
              className={
                leakageStatus === "NORMAL"
                  ? "detection-normal"
                  : "detection-warning"
              }
            >
              {leakageStatus}
            </strong>

            <small>
              Pressure and flow analysis
            </small>

          </div>

          {/* THEFT */}

          <div className="live-detection-card">

            <span>
              WATER THEFT
            </span>

            <strong
              className={
                theftStatus === "NORMAL"
                  ? "detection-normal"
                  : "detection-warning"
              }
            >
              {theftStatus}
            </strong>

            <small>
              Abnormal flow analysis
            </small>

          </div>

          {/* WATER QUALITY */}

          <div className="live-detection-card">

            <span>
              WATER QUALITY
            </span>

            <strong
              className={
                qualityStatus === "GOOD"
                  ? "detection-normal"
                  : "detection-warning"
              }
            >
              {qualityStatus}
            </strong>

            <small>
              pH and turbidity analysis
            </small>

          </div>

        </div>

      </div>

    </div>
  );
}

export default LiveData;