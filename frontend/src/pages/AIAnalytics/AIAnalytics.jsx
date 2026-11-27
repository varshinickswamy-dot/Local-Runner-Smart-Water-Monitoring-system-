import { useEffect, useState } from "react";

import {
  BrainCircuit,
  Activity,
  Droplets,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  MapPin,
  Clock3,
  RefreshCw,
  Gauge,
  Waves,
  ShieldCheck,
  FlaskConical,
} from "lucide-react";

import {
  getLatestSensorData,
  getAlerts,
} from "../../services/api";

import useMonitoringSettings from "../../hooks/useMonitoringSettings";

import "./AIAnalytics.css";


function AIAnalytics() {

  const [sensorData, setSensorData] =
    useState(null);

  const [alerts, setAlerts] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");


  // =====================================================
  // MONITORING SETTINGS
  // =====================================================

  const {
    autoRefresh,
    refreshInterval,
  } = useMonitoringSettings();


  // =====================================================
  // INITIAL LOAD + AUTO REFRESH
  // =====================================================

  useEffect(() => {

    let active = true;


    const fetchData = async () => {

      try {

        const sensorResponse =
          await getLatestSensorData();

        const alertsResponse =
          await getAlerts();


        if (!active) {
          return;
        }


        const latestSensor =
          sensorResponse?.data ||
          sensorResponse?.reading ||
          sensorResponse ||
          null;


        let alertData = [];


        if (
          Array.isArray(
            alertsResponse?.data
          )
        ) {
          alertData =
            alertsResponse.data;
        }

        else if (
          Array.isArray(
            alertsResponse
          )
        ) {
          alertData =
            alertsResponse;
        }


        setSensorData(
          latestSensor
        );

        setAlerts(
          alertData
        );

        setError("");


      } catch (err) {

        console.error(
          "AI Analytics API Error:",
          err
        );


        if (active) {
          setError(
            "Unable to load AI analytics data."
          );
        }


      } finally {

        if (active) {
          setLoading(false);
        }

      }

    };


    // Initial load
    fetchData();


    // =====================================================
    // SETTINGS CONTROLLED AUTO REFRESH
    // =====================================================

    let refreshTimer = null;


    if (autoRefresh) {

      refreshTimer = setInterval(
        fetchData,
        Number(refreshInterval) * 1000
      );

    }


    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {

      active = false;

      if (refreshTimer) {
        clearInterval(refreshTimer);
      }

    };

  }, [
    autoRefresh,
    refreshInterval,
  ]);


  // =====================================================
  // MANUAL REFRESH
  // =====================================================

  const handleRefresh = async () => {

    try {

      setRefreshing(true);

      setError("");


      const sensorResponse =
        await getLatestSensorData();

      const alertsResponse =
        await getAlerts();


      const latestSensor =
        sensorResponse?.data ||
        sensorResponse?.reading ||
        sensorResponse ||
        null;


      let alertData = [];


      if (
        Array.isArray(
          alertsResponse?.data
        )
      ) {
        alertData =
          alertsResponse.data;
      }

      else if (
        Array.isArray(
          alertsResponse
        )
      ) {
        alertData =
          alertsResponse;
      }


      setSensorData(
        latestSensor
      );

      setAlerts(
        alertData
      );


    } catch (err) {

      console.error(
        "AI Analytics Refresh Error:",
        err
      );


      setError(
        "Unable to refresh AI analytics data."
      );


    } finally {

      setRefreshing(false);

    }

  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {

    return (

      <div className="ai-analytics-page">

        <div className="ai-loading">

          <BrainCircuit size={44} />

          <h2>
            Loading AI Analytics...
          </h2>

          <p>
            Connecting to JalRakshak AI
          </p>

        </div>

      </div>

    );

  }


  // =====================================================
  // ERROR
  // =====================================================

  if (
    error &&
    !sensorData
  ) {

    return (

      <div className="ai-analytics-page">

        <div className="ai-error">

          <AlertTriangle size={44} />

          <h2>
            AI Analytics Unavailable
          </h2>

          <p>
            {error}
          </p>


          <button
            className="ai-refresh-btn"
            onClick={handleRefresh}
          >

            <RefreshCw size={17} />

            Try Again

          </button>

        </div>

      </div>

    );

  }


  // =====================================================
  // DEVICE INFORMATION
  // =====================================================

  const deviceId =
    sensorData?.device_id ||
    "Unknown Device";


  const zoneId =
    sensorData?.zone_id ||
    "Unknown Zone";


  const timestamp =
    sensorData?.timestamp ||
    sensorData?.created_at ||
    null;


  // =====================================================
  // DETECTION DATA
  // =====================================================

  const detection =
    sensorData?.detection || {};


  const leakage =
    detection?.leakage || {};


  const theft =
    detection?.theft || {};


  const waterQuality =
    detection?.water_quality || {};


  const sensorHealth =
    detection?.sensor_health || {};


  // =====================================================
  // DETECTION STATUS
  // =====================================================

  const leakageDetected =
    leakage?.detected === true;


  const theftDetected =
    theft?.suspicious === true;


  const qualityProblem =
    waterQuality?.problem === true;


  const healthStatus =
    String(
      sensorHealth?.status ||
      "NORMAL"
    ).toUpperCase();


  const sensorProblem =
    healthStatus !== "NORMAL" &&
    healthStatus !== "HEALTHY";


  const overallStatus =
    String(
      detection?.overall_status ||
      "NORMAL"
    ).toUpperCase();


  // =====================================================
  // SENSOR VALUES
  // =====================================================

  const flowRate =
    Number(
      sensorData?.flow_rate || 0
    );


  const pressure =
    Number(
      sensorData?.pressure_bar || 0
    );


  const ph =
    Number(
      sensorData?.ph || 0
    );


  const turbidity =
    Number(
      sensorData?.turbidity || 0
    );


  const tds =
    Number(
      sensorData?.tds || 0
    );


  const totalLitres =
    Number(
      sensorData?.total_litres || 0
    );


  // =====================================================
  // ALERT COUNTS
  // =====================================================

  const totalAlerts =
    alerts.length;


  const criticalAlerts =
    alerts.filter((alert) => {

      const level =
        String(
          alert?.level ||
          alert?.severity ||
          alert?.status ||
          ""
        ).toUpperCase();


      return (
        level === "CRITICAL" ||
        level === "MAJOR"
      );

    }).length;


  const warningAlerts =
    alerts.filter((alert) => {

      const level =
        String(
          alert?.level ||
          alert?.severity ||
          alert?.status ||
          ""
        ).toUpperCase();


      return (
        level === "WARNING" ||
        level === "MODERATE" ||
        level === "MINOR"
      );

    }).length;


  const leakageAlerts =
    alerts.filter((alert) => {

      const type =
        String(
          alert?.type ||
          alert?.alert_type ||
          alert?.category ||
          ""
        ).toUpperCase();


      return type.includes("LEAK");

    }).length;


  const theftAlerts =
    alerts.filter((alert) => {

      const type =
        String(
          alert?.type ||
          alert?.alert_type ||
          alert?.category ||
          ""
        ).toUpperCase();


      return type.includes("THEFT");

    }).length;


  // =====================================================
  // FORMAT TIME - INDIA STANDARD TIME (IST)
  // =====================================================

  const formatTime = (value) => {

    if (!value) {
      return "No timestamp";
    }

    try {

      let timestampValue = value;

      // The backend stores timestamps in UTC.
      // If a timestamp arrives without a timezone suffix,
      // explicitly treat it as UTC before converting to IST.
      if (
        typeof timestampValue === "string" &&
        !/[zZ]|[+-]\d{2}:?\d{2}$/.test(
          timestampValue.trim()
        )
      ) {
        timestampValue =
          `${timestampValue.trim()}Z`;
      }

      const date = new Date(timestampValue);

      if (Number.isNaN(date.getTime())) {
        return "No timestamp";
      }

      return date.toLocaleString("en-IN", {
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

      console.error(
        "Unable to format timestamp in IST:",
        error
      );

      return "No timestamp";
    }

  };


  // =====================================================
  // STATUS CLASS
  // =====================================================

  let statusClass =
    "normal";


  if (
    overallStatus ===
    "CRITICAL"
  ) {

    statusClass =
      "critical";

  }

  else if (
    overallStatus ===
    "WARNING"
  ) {

    statusClass =
      "warning";

  }


  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (

    <div className="ai-analytics-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <div className="ai-page-header">

        <div className="ai-title-row">

          <div className="ai-title-icon">

            <BrainCircuit
              size={34}
              strokeWidth={2.2}
            />

          </div>


          <div>

            <p className="ai-eyebrow">
              JALRAKSHAK AI
            </p>

            <h1>
              AI Analytics
            </h1>

            <p>
              Intelligent detection and
              anomaly analysis for
              JalRakshak AI.
            </p>

          </div>

        </div>


        <button
          className="ai-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >

          <RefreshCw
            size={17}
            className={
              refreshing
                ? "ai-spinning"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}

        </button>

      </div>


      {/* =================================================
          AUTO REFRESH STATUS
      ================================================= */}

      <div
        className={
          `ai-refresh-info ${
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

        <div className="ai-error-banner">

          <AlertTriangle size={18} />

          <span>
            {error}
          </span>

        </div>

      )}


      {/* =================================================
          DEVICE INFORMATION
      ================================================= */}

      <div className="ai-info-grid">


        <div className="ai-info-card">

          <Cpu size={20} />

          <div>

            <span>
              Device
            </span>

            <strong>
              {deviceId}
            </strong>

          </div>

        </div>


        <div className="ai-info-card">

          <MapPin size={20} />

          <div>

            <span>
              Zone
            </span>

            <strong>
              {zoneId}
            </strong>

          </div>

        </div>


        <div className="ai-info-card">

          <Clock3 size={20} />

          <div>

            <span>
              Last Analysis
            </span>

            <strong>
              {formatTime(timestamp)}
            </strong>

          </div>

        </div>


      </div>


      {/* =================================================
          OVERALL AI STATUS
      ================================================= */}

      <div
        className={
          `ai-overall-card ${statusClass}`
        }
      >

        <div className="ai-overall-icon">

          <BrainCircuit size={31} />

        </div>


        <div className="ai-overall-content">

          <span>
            AI Detection Status
          </span>

          <h2>
            {overallStatus}
          </h2>

          <p>

            {overallStatus === "NORMAL"
              ? "No critical anomalies detected in the latest sensor reading."
              : overallStatus === "WARNING"
              ? "The AI engine detected a condition that requires attention."
              : "The AI engine detected a critical condition requiring immediate attention."}

          </p>

        </div>


        <div className="ai-active-badge">

          <Activity size={17} />

          AI Engine Active

        </div>

      </div>


      {/* =================================================
          DETECTION MODULES
      ================================================= */}

      <div className="ai-section">

        <div className="ai-section-header">

          <div>

            <h2>
              Detection Modules
            </h2>

            <p>
              Current results from the
              JalRakshak AI detection engine.
            </p>

          </div>

          <ShieldCheck size={22} />

        </div>


        <div className="ai-module-grid">


          {/* LEAKAGE */}

          <div
            className={
              `ai-module-card ${
                leakageDetected
                  ? "danger"
                  : "safe"
              }`
            }
          >

            <div className="ai-module-top">

              <div className="ai-module-icon">

                <Droplets size={23} />

              </div>

              <span>
                Leakage Detection
              </span>

            </div>


            <h3>

              {leakage?.level ||
                (
                  leakageDetected
                    ? "DETECTED"
                    : "NORMAL"
                )}

            </h3>


            <p>

              {leakage?.reason ||
                (
                  leakageDetected
                    ? "Possible water leakage detected."
                    : "No leakage detected."
                )}

            </p>


            <div
              className={
                leakageDetected
                  ? "ai-detection-status danger"
                  : "ai-detection-status safe"
              }
            >

              {leakageDetected ? (
                <AlertTriangle size={17} />
              ) : (
                <CheckCircle2 size={17} />
              )}

              <span>

                {leakageDetected
                  ? "Leakage detected"
                  : "No leakage detected"}

              </span>

            </div>

          </div>


          {/* THEFT */}

          <div
            className={
              `ai-module-card ${
                theftDetected
                  ? "danger"
                  : "safe"
              }`
            }
          >

            <div className="ai-module-top">

              <div className="ai-module-icon">

                <ShieldAlert size={23} />

              </div>

              <span>
                Theft Detection
              </span>

            </div>


            <h3>

              {theft?.level ||
                (
                  theftDetected
                    ? "SUSPICIOUS"
                    : "NORMAL"
                )}

            </h3>


            <p>

              {theft?.reason ||
                (
                  theftDetected
                    ? "Abnormal water usage detected."
                    : "No suspicious usage detected."
                )}

            </p>


            <div
              className={
                theftDetected
                  ? "ai-detection-status danger"
                  : "ai-detection-status safe"
              }
            >

              {theftDetected ? (
                <AlertTriangle size={17} />
              ) : (
                <CheckCircle2 size={17} />
              )}

              <span>

                {theftDetected
                  ? "Suspicious usage detected"
                  : "No theft detected"}

              </span>

            </div>

          </div>


          {/* WATER QUALITY */}

          <div
            className={
              `ai-module-card ${
                qualityProblem
                  ? "danger"
                  : "safe"
              }`
            }
          >

            <div className="ai-module-top">

              <div className="ai-module-icon">

                <FlaskConical size={23} />

              </div>

              <span>
                Water Quality
              </span>

            </div>


            <h3>

              {waterQuality?.status ||
                (
                  qualityProblem
                    ? "WARNING"
                    : "GOOD"
                )}

            </h3>


            <p>

              {waterQuality?.reason ||
                (
                  qualityProblem
                    ? "Abnormal water quality detected."
                    : "Water quality is within normal range."
                )}

            </p>


            <div
              className={
                qualityProblem
                  ? "ai-detection-status danger"
                  : "ai-detection-status safe"
              }
            >

              {qualityProblem ? (
                <AlertTriangle size={17} />
              ) : (
                <CheckCircle2 size={17} />
              )}

              <span>

                {qualityProblem
                  ? "Quality issue detected"
                  : "Quality within range"}

              </span>

            </div>

          </div>


          {/* SENSOR HEALTH */}

          <div
            className={
              `ai-module-card ${
                sensorProblem
                  ? "danger"
                  : "safe"
              }`
            }
          >

            <div className="ai-module-top">

              <div className="ai-module-icon">

                <Cpu size={23} />

              </div>

              <span>
                Sensor Health
              </span>

            </div>


            <h3>
              {healthStatus}
            </h3>


            <p>

              {sensorHealth?.reason ||
                "Sensor readings are being received normally."}

            </p>


            <div
              className={
                sensorProblem
                  ? "ai-detection-status danger"
                  : "ai-detection-status safe"
              }
            >

              {sensorProblem ? (
                <AlertTriangle size={17} />
              ) : (
                <CheckCircle2 size={17} />
              )}

              <span>

                {sensorProblem
                  ? "Sensor issue detected"
                  : "Sensors operating normally"}

              </span>

            </div>

          </div>


        </div>

      </div>


      {/* =================================================
          SENSOR ANALYSIS
      ================================================= */}

      <div className="ai-section">

        <div className="ai-section-header">

          <div>

            <h2>
              Sensor Analysis
            </h2>

            <p>
              Current values used by the
              intelligent detection system.
            </p>

          </div>

          <Gauge size={22} />

        </div>


        <div className="ai-sensor-grid">


          <div className="ai-sensor-item">

            <div className="ai-sensor-icon">
              <Activity size={20} />
            </div>

            <div>

              <span>
                Flow Rate
              </span>

              <strong>

                {flowRate.toFixed(2)}

                <small>
                  {" "}L/min
                </small>

              </strong>

            </div>

          </div>


          <div className="ai-sensor-item">

            <div className="ai-sensor-icon">
              <Gauge size={20} />
            </div>

            <div>

              <span>
                Pressure
              </span>

              <strong>

                {pressure.toFixed(2)}

                <small>
                  {" "}bar
                </small>

              </strong>

            </div>

          </div>


          <div className="ai-sensor-item">

            <div className="ai-sensor-icon">
              <Droplets size={20} />
            </div>

            <div>

              <span>
                pH
              </span>

              <strong>
                {ph.toFixed(2)}
              </strong>

            </div>

          </div>


          <div className="ai-sensor-item">

            <div className="ai-sensor-icon">
              <Waves size={20} />
            </div>

            <div>

              <span>
                Turbidity
              </span>

              <strong>

                {turbidity.toFixed(2)}

                <small>
                  {" "}NTU
                </small>

              </strong>

            </div>

          </div>


          <div className="ai-sensor-item">

            <div className="ai-sensor-icon">
              <FlaskConical size={20} />
            </div>

            <div>

              <span>
                TDS
              </span>

              <strong>

                {tds.toFixed(2)}

                <small>
                  {" "}ppm
                </small>

              </strong>

            </div>

          </div>


          <div className="ai-sensor-item">

            <div className="ai-sensor-icon">
              <Waves size={20} />
            </div>

            <div>

              <span>
                Total Water
              </span>

              <strong>

                {totalLitres.toFixed(2)}

                <small>
                  {" "}L
                </small>

              </strong>

            </div>

          </div>


        </div>

      </div>


      {/* =================================================
          ALERT ANALYTICS
      ================================================= */}

      <div className="ai-section">

        <div className="ai-section-header">

          <div>

            <h2>
              Alert Analytics
            </h2>

            <p>
              Current alert activity detected
              by JalRakshak AI.
            </p>

          </div>

          <AlertTriangle size={22} />

        </div>


        <div className="ai-alert-grid">


          <div className="ai-alert-stat">

            <span>
              Total Alerts
            </span>

            <strong>
              {totalAlerts}
            </strong>

          </div>


          <div className="ai-alert-stat">

            <span>
              Leakage Alerts
            </span>

            <strong>
              {leakageAlerts}
            </strong>

          </div>


          <div className="ai-alert-stat">

            <span>
              Theft Alerts
            </span>

            <strong>
              {theftAlerts}
            </strong>

          </div>


          <div className="ai-alert-stat">

            <span>
              Critical Alerts
            </span>

            <strong>
              {criticalAlerts}
            </strong>

          </div>


          <div className="ai-alert-stat">

            <span>
              Warning Alerts
            </span>

            <strong>
              {warningAlerts}
            </strong>

          </div>


        </div>

      </div>


      {/* =================================================
          AI ENGINE
      ================================================= */}

      <div className="ai-engine-info">

        <div className="ai-engine-icon">

          <BrainCircuit size={24} />

        </div>


        <div>

          <strong>
            JalRakshak AI Detection Engine
          </strong>

          <p>
            Sensor readings are continuously
            analyzed for leakage, suspicious
            usage, water-quality problems and
            sensor-health issues.
          </p>

        </div>


        <div className="ai-engine-status">

          <span></span>

          Processing Live Data

        </div>

      </div>


      {/* =================================================
          AUTO REFRESH
      ================================================= */}

      <div
        className={
          `ai-auto-refresh ${
            autoRefresh
              ? "refresh-enabled"
              : "refresh-disabled"
          }`
        }
      >

        <Activity size={15} />

        <span>

          {autoRefresh
            ? `Live AI monitoring • Automatically refreshing every ${refreshInterval} seconds`
            : "Live AI monitoring • Automatic refresh disabled"}

        </span>

      </div>


    </div>

  );

}


export default AIAnalytics;