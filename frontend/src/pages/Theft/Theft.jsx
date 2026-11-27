import { useEffect, useState } from "react";

import {
  ShieldAlert,
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

import "./Theft.css";


function Theft() {
  const [sensorData, setSensorData] = useState(null);

  const [theftAlerts, setTheftAlerts] =
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
  // LOAD THEFT DATA
  // =====================================================

  const loadTheftData = async () => {
    try {
      setError("");

      const [
        sensorResponse,
        alertsResponse,
      ] = await Promise.all([
        getLatestSensorData(),
        getAlerts({
          type: "THEFT",
        }),
      ]);


      // Latest sensor reading

      if (sensorResponse?.success) {
        setSensorData(
          sensorResponse.data
        );
      }


      // Theft alerts

      if (
        alertsResponse?.success &&
        Array.isArray(
          alertsResponse.data
        )
      ) {
        setTheftAlerts(
          alertsResponse.data
        );
      }

    } catch (err) {
      console.error(
        "JalRakshak AI Theft API Error:",
        err
      );

      setError(
        "Unable to load theft detection data."
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
            type: "THEFT",
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


        // Theft alerts

        if (
          alertsResponse?.success &&
          Array.isArray(
            alertsResponse.data
          )
        ) {
          setTheftAlerts(
            alertsResponse.data
          );
        }

      } catch (err) {
        console.error(
          "JalRakshak AI Theft API Error:",
          err
        );

        if (mounted) {
          setError(
            "Unable to load theft detection data."
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

    await loadTheftData();
  };


  // =====================================================
  // THEFT STATUS
  // =====================================================

  const getTheftStatus = () => {
    const detection =
      sensorData?.detection;


    // Backend AI / detection result

    if (
      detection?.theft?.suspicious === true
    ) {
      return {
        status: "POSSIBLE THEFT",

        level:
          detection.theft.level ||
          "WARNING",

        reason:
          detection.theft.reason ||
          "Unusual water consumption pattern detected.",

        suspicious: true,
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


    if (
      flow > 20 &&
      pressure >= 0.5
    ) {
      return {
        status: "POSSIBLE THEFT",

        level: "WARNING",

        reason:
          "Unusually high water flow detected while pressure remains normal.",

        suspicious: true,
      };
    }


    // Normal

    return {
      status: "NO THEFT DETECTED",

      level: "NORMAL",

      reason:
        "Water consumption is currently within the expected operating range.",

      suspicious: false,
    };
  };


  const theftStatus =
    getTheftStatus();


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
        "Unable to format theft timestamp in IST:",
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
      <div className="theft-page">

        <div className="theft-loading">

          <RefreshCw
            size={26}
            className="theft-spin"
          />

          <span>
            Loading theft detection...
          </span>

        </div>

      </div>
    );
  }


  // =====================================================
  // PAGE
  // =====================================================

  return (
    <div className="theft-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <div className="theft-header">


        {/* =================================================
            TITLE SECTION
        ================================================= */}

        <div className="theft-title-section">


          {/* SIDEBAR-MATCHING THEFT ICON */}

          <div className="theft-title-icon">

            <ShieldAlert
              size={34}
              strokeWidth={2.2}
            />

          </div>


          {/* TITLE CONTENT */}

          <div className="theft-title-content">

            <p className="theft-eyebrow">
              JALRAKSHAK AI
            </p>

            <h1>
              Theft Detection
            </h1>

            <p className="theft-subtitle">
              Identify unusual water consumption
              and possible unauthorized usage.
            </p>

          </div>

        </div>


        {/* =================================================
            REFRESH BUTTON
        ================================================= */}

        <button
          type="button"
          className="theft-refresh-button"
          onClick={handleRefresh}
          disabled={refreshing}
        >

          <RefreshCw
            size={17}
            className={
              refreshing
                ? "theft-spin"
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
          `theft-refresh-info ${
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

        <div className="theft-error">

          <AlertTriangle size={18} />

          <span>
            {error}
          </span>

        </div>

      )}


      {/* =================================================
          MAIN STATUS
      ================================================= */}

      <div
        className={`theft-status-card ${
          theftStatus.suspicious
            ? "status-danger"
            : "status-normal"
        }`}
      >

        <div className="theft-status-icon">

          {theftStatus.suspicious ? (
            <ShieldAlert size={34} />
          ) : (
            <ShieldCheck size={34} />
          )}

        </div>


        <div className="theft-status-content">

          <span>
            CURRENT THEFT STATUS
          </span>

          <h2>
            {theftStatus.status}
          </h2>

          <p>
            {theftStatus.reason}
          </p>

        </div>


        <div className="theft-level-badge">
          {theftStatus.level}
        </div>

      </div>


      {/* =================================================
          SENSOR METRICS
      ================================================= */}

      <div className="theft-metrics-grid">


        {/* FLOW */}

        <div className="theft-metric-card">

          <div className="theft-metric-icon">

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

        <div className="theft-metric-card">

          <div className="theft-metric-icon">

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

        <div className="theft-metric-card">

          <div className="theft-metric-icon">

            <Activity size={22} />

          </div>

          <div>

            <span>
              Detection Level
            </span>

            <strong className="metric-level">
              {theftStatus.level}
            </strong>

          </div>

        </div>

      </div>


      {/* =================================================
          MONITORING INFORMATION
      ================================================= */}

      <div className="theft-device-card">

        <div className="theft-section-title">

          <div>

            <h2>
              Monitoring Information
            </h2>

            <p>
              Current water consumption monitoring source
            </p>

          </div>


          <div className="monitoring-live">

            <span></span>

            Monitoring

          </div>

        </div>


        <div className="theft-device-grid">


          {/* DEVICE */}

          <div className="theft-info-item">

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

          <div className="theft-info-item">

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

          <div className="theft-info-item">

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
          RECENT THEFT EVENTS
      ================================================= */}

      <div className="theft-events-section">

        <div className="theft-section-title">

          <div>

            <h2>
              Recent Theft Events
            </h2>

            <p>
              Suspicious consumption events detected by JalRakshak AI
            </p>

          </div>


          <span className="event-count">
            {theftAlerts.length} Events
          </span>

        </div>


        {theftAlerts.length === 0 ? (

          <div className="no-theft-events">

            <CheckCircle2 size={28} />

            <h3>
              No Theft Events
            </h3>

            <p>
              No suspicious water consumption
              events have been detected recently.
            </p>

          </div>

        ) : (

          <div className="theft-events-list">

            {theftAlerts.map(
              (alert, index) => {

                const level =
                  String(
                    alert?.level ||
                    alert?.severity ||
                    "WARNING"
                  ).toUpperCase();


                return (

                  <div
                    className={`theft-event ${
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

                      <ShieldAlert size={20} />

                    </div>


                    <div className="event-content">

                      <div className="event-title-row">

                        <h3>
                          Suspicious Water Usage
                        </h3>

                        <span>
                          {level}
                        </span>

                      </div>


                      <p>
                        {alert?.message ||
                          alert?.reason ||
                          "JalRakshak AI detected unusually high water consumption."}
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


export default Theft;