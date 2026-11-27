import { useEffect, useState } from "react";

import {
  Droplets,
  Gauge,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  MapPin,
  Cpu,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import {
  getLatestSensorData,
  getAlerts,
} from "../../services/api";

import useMonitoringSettings from "../../hooks/useMonitoringSettings";

import "./Leakage.css";


// =====================================================
// JalRakshak AI
// Leakage Detection Page
// =====================================================

function Leakage() {
  const [sensorData, setSensorData] = useState(null);

  const [leakageAlerts, setLeakageAlerts] =
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
  // LOAD LEAKAGE DATA
  // =====================================================

  const loadLeakageData = async () => {
    try {
      setError("");

      const [
        sensorResponse,
        alertsResponse,
      ] = await Promise.all([
        getLatestSensorData(),
        getAlerts({
          type: "LEAKAGE",
        }),
      ]);


      // Latest sensor reading

      if (sensorResponse?.success) {
        setSensorData(
          sensorResponse.data
        );
      }


      // Leakage alerts

      if (
        alertsResponse?.success &&
        Array.isArray(
          alertsResponse.data
        )
      ) {
        setLeakageAlerts(
          alertsResponse.data
        );
      }

    } catch (err) {
      console.error(
        "JalRakshak AI Leakage API Error:",
        err
      );

      setError(
        "Unable to load leakage detection data."
      );

    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };


  // =====================================================
  // INITIAL LOAD + AUTO REFRESH
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        setError("");

        const [
          sensorResponse,
          alertsResponse,
        ] = await Promise.all([
          getLatestSensorData(),
          getAlerts({
            type: "LEAKAGE",
          }),
        ]);


        if (!mounted) {
          return;
        }


        // Latest sensor reading

        if (sensorResponse?.success) {
          setSensorData(
            sensorResponse.data
          );
        }


        // Leakage alerts

        if (
          alertsResponse?.success &&
          Array.isArray(
            alertsResponse.data
          )
        ) {
          setLeakageAlerts(
            alertsResponse.data
          );
        }

      } catch (err) {
        console.error(
          "JalRakshak AI Leakage API Error:",
          err
        );

        if (mounted) {
          setError(
            "Unable to load leakage detection data."
          );
        }

      } finally {
        if (mounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };


    // =====================================================
    // INITIAL REQUEST
    // =====================================================

    fetchData();


    // =====================================================
    // AUTO REFRESH
    // Controlled by Settings
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
      mounted = false;

      if (refreshTimer) {
        clearInterval(
          refreshTimer
        );
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
    setRefreshing(true);

    await loadLeakageData();
  };


  // =====================================================
  // GET CURRENT LEAKAGE STATUS
  // =====================================================

  const getLeakageStatus = () => {
    const detection =
      sensorData?.detection;


    // Backend detection

    if (
      detection?.leakage?.detected === true
    ) {
      return {
        status: "LEAKAGE DETECTED",

        level:
          detection.leakage.level ||
          "CRITICAL",

        reason:
          detection.leakage.reason ||
          "Abnormal water flow condition detected.",

        critical: true,
      };
    }


    // =====================================================
    // FALLBACK USING SENSOR VALUES
    // =====================================================

    const flow =
      Number(
        sensorData?.flow_rate
      ) || 0;

    const pressure =
      Number(
        sensorData?.pressure_bar
      ) || 0;


    // Critical leakage

    if (
      pressure < 0.5 &&
      flow > 5
    ) {
      return {
        status: "LEAKAGE DETECTED",

        level: "CRITICAL",

        reason:
          "Low pressure with high water flow detected.",

        critical: true,
      };
    }


    // Major leakage

    if (
      pressure < 0.7 &&
      flow > 30
    ) {
      return {
        status: "POSSIBLE LEAKAGE",

        level: "MAJOR",

        reason:
          "High flow detected while pressure is below normal.",

        critical: true,
      };
    }


    // Moderate leakage

    if (
      pressure < 0.7 &&
      flow > 15
    ) {
      return {
        status: "POSSIBLE LEAKAGE",

        level: "MODERATE",

        reason:
          "Flow and pressure indicate a possible leakage condition.",

        critical: true,
      };
    }


    // Normal

    return {
      status: "NO LEAKAGE",

      level: "NORMAL",

      reason:
        "Water flow and pressure are within normal operating conditions.",

      critical: false,
    };
  };


  const leakageStatus =
    getLeakageStatus();


  // =====================================================
  // FORMAT DATE - INDIA STANDARD TIME (IST)
  // =====================================================

  const formatDate = (value) => {

    if (!value) {
      return "Time unavailable";
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
        return "Time unavailable";
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
        "Unable to format leakage timestamp in IST:",
        error
      );

      return "Time unavailable";
    }

  };


  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="leakage-page">

        <div className="leakage-loading">

          <RefreshCw
            size={26}
            className="leakage-spin"
          />

          <span>
            Loading leakage detection...
          </span>

        </div>

      </div>
    );
  }


  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="leakage-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="leakage-header">

        {/* =================================================
            TITLE + TOP LEFT ICON
        ================================================= */}

        <div className="leakage-title-section">

          {/* TOP LEFT LEAKAGE ICON */}

          <div className="leakage-title-icon">

            <Droplets
              size={34}
              strokeWidth={2.2}
            />

          </div>


          {/* TITLE CONTENT */}

          <div className="leakage-title-content">

            <p className="leakage-eyebrow">
              JALRAKSHAK AI
            </p>

            <h1>
              Leakage Detection
            </h1>

            <p className="leakage-subtitle">
              Monitor water flow and pressure to
              detect possible leakage conditions.
            </p>

          </div>

        </div>


        {/* =================================================
            REFRESH
        ================================================= */}

        <button
          type="button"
          className="leakage-refresh-button"
          onClick={handleRefresh}
          disabled={refreshing}
        >

          <RefreshCw
            size={17}
            className={
              refreshing
                ? "leakage-spin"
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
          `leakage-refresh-info ${
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

        <div className="leakage-error">

          <AlertTriangle size={18} />

          <span>
            {error}
          </span>

        </div>

      )}


      {/* =================================================
          CURRENT LEAKAGE STATUS
      ================================================= */}

      <div
        className={`leakage-status-card ${
          leakageStatus.critical
            ? "status-danger"
            : "status-normal"
        }`}
      >

        <div className="leakage-status-icon">

          {leakageStatus.critical ? (
            <AlertTriangle size={34} />
          ) : (
            <ShieldCheck size={34} />
          )}

        </div>


        <div className="leakage-status-content">

          <span>
            CURRENT LEAKAGE STATUS
          </span>

          <h2>
            {leakageStatus.status}
          </h2>

          <p>
            {leakageStatus.reason}
          </p>

        </div>


        <div className="leakage-level-badge">
          {leakageStatus.level}
        </div>

      </div>


      {/* =================================================
          SENSOR VALUES
      ================================================= */}

      <div className="leakage-metrics-grid">

        {/* FLOW */}

        <div className="leakage-metric-card">

          <div className="leakage-metric-icon">
            <Droplets size={22} />
          </div>

          <div>

            <span>
              Flow Rate
            </span>

            <strong>
              {Number(
                sensorData?.flow_rate || 0
              ).toFixed(2)}

              <small>
                L/min
              </small>

            </strong>

          </div>

        </div>


        {/* PRESSURE */}

        <div className="leakage-metric-card">

          <div className="leakage-metric-icon">
            <Gauge size={22} />
          </div>

          <div>

            <span>
              Pressure
            </span>

            <strong>
              {Number(
                sensorData?.pressure_bar || 0
              ).toFixed(2)}

              <small>
                bar
              </small>

            </strong>

          </div>

        </div>


        {/* DETECTION LEVEL */}

        <div className="leakage-metric-card">

          <div className="leakage-metric-icon">
            <Activity size={22} />
          </div>

          <div>

            <span>
              Detection Level
            </span>

            <strong className="metric-level">
              {leakageStatus.level}
            </strong>

          </div>

        </div>

      </div>


      {/* =================================================
          DEVICE INFORMATION
      ================================================= */}

      <div className="leakage-device-card">

        <div className="leakage-section-title">

          <div>

            <h2>
              Monitoring Information
            </h2>

            <p>
              Current sensor monitoring source
            </p>

          </div>


          <div className="monitoring-live">

            <span></span>

            Monitoring

          </div>

        </div>


        <div className="leakage-device-grid">

          {/* DEVICE */}

          <div className="leakage-info-item">

            <Cpu size={17} />

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


          {/* ZONE */}

          <div className="leakage-info-item">

            <MapPin size={17} />

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


          {/* LAST UPDATED */}

          <div className="leakage-info-item">

            <Clock3 size={17} />

            <div>

              <span>
                Last Updated
              </span>

              <strong>
                {formatDate(
                  sensorData?.timestamp
                )}
              </strong>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          RECENT LEAKAGE EVENTS
      ================================================= */}

      <div className="leakage-events-section">

        <div className="leakage-section-title">

          <div>

            <h2>
              Recent Leakage Events
            </h2>

            <p>
              Leakage events detected by JalRakshak AI
            </p>

          </div>


          <span className="event-count">
            {leakageAlerts.length} Events
          </span>

        </div>


        {leakageAlerts.length === 0 ? (

          <div className="no-leakage-events">

            <CheckCircle2 size={28} />

            <h3>
              No Leakage Events
            </h3>

            <p>
              No leakage events have been
              detected recently.
            </p>

          </div>

        ) : (

          <div className="leakage-events-list">

            {leakageAlerts.map(
              (alert, index) => {

                const level =
                  String(
                    alert?.level ||
                    alert?.severity ||
                    "WARNING"
                  ).toUpperCase();


                return (

                  <div
                    className={`leakage-event ${
                      level === "CRITICAL" ||
                      level === "MAJOR"
                        ? "event-critical"
                        : "event-warning"
                    }`}

                    key={
                      alert?._id ||
                      alert?.id ||
                      index
                    }
                  >

                    <div className="event-icon">

                      <Droplets size={20} />

                    </div>


                    <div className="event-content">

                      <div className="event-title-row">

                        <h3>
                          Leakage Detected
                        </h3>

                        <span>
                          {level}
                        </span>

                      </div>


                      <p>
                        {alert?.message ||
                          alert?.reason ||
                          "JalRakshak AI detected a possible leakage condition."}
                      </p>


                      <div className="event-meta">

                        <span>

                          <Cpu size={13} />

                          {alert?.device_id ||
                            "JAL-ESP32-001"}

                        </span>


                        <span>

                          <MapPin size={13} />

                          {alert?.zone_id ||
                            "ZONE-03"}

                        </span>


                        <span>

                          <Clock3 size={13} />

                          {formatDate(
                            alert?.timestamp ||
                            alert?.created_at
                          )}

                        </span>

                      </div>

                    </div>

                  </div>

                );
              }
            )}

          </div>

        )}

      </div>

    </div>
  );
}

export default Leakage;