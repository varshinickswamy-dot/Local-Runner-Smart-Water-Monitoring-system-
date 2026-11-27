import { useEffect, useState } from "react";

import {
  Droplets,
  Activity,
  Gauge,
  Beaker,
  Waves,
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

import "./WaterQuality.css";


function WaterQuality() {
  const [sensorData, setSensorData] = useState(null);

  const [qualityAlerts, setQualityAlerts] =
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
  // LOAD WATER QUALITY DATA
  // =====================================================

  const loadWaterQualityData = async (
    showRefresh = false
  ) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        sensorResponse,
        alertsResponse,
      ] = await Promise.all([
        getLatestSensorData(),
        getAlerts(),
      ]);


      const latestSensor =
        sensorResponse?.data ||
        sensorResponse?.reading ||
        sensorResponse;


      setSensorData(latestSensor);


      const allAlerts =
        Array.isArray(
          alertsResponse?.data
        )
          ? alertsResponse.data
          : Array.isArray(
              alertsResponse
            )
          ? alertsResponse
          : [];


      const filteredQualityAlerts =
        allAlerts.filter((alert) => {

          const type = String(
            alert?.type ||
            alert?.alert_type ||
            alert?.category ||
            ""
          ).toUpperCase();


          return (
            type.includes("QUALITY") ||
            type.includes("WATER")
          );
        });


      setQualityAlerts(
        filteredQualityAlerts
      );

    } catch (err) {
      console.error(
        "Water Quality API Error:",
        err
      );

      setError(
        "Unable to load water quality data."
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
        const [
          sensorResponse,
          alertsResponse,
        ] = await Promise.all([
          getLatestSensorData(),
          getAlerts(),
        ]);


        if (!mounted) {
          return;
        }


        const latestSensor =
          sensorResponse?.data ||
          sensorResponse?.reading ||
          sensorResponse;


        setSensorData(
          latestSensor
        );


        const allAlerts =
          Array.isArray(
            alertsResponse?.data
          )
            ? alertsResponse.data
            : Array.isArray(
                alertsResponse
              )
            ? alertsResponse
            : [];


        const filteredQualityAlerts =
          allAlerts.filter((alert) => {

            const type = String(
              alert?.type ||
              alert?.alert_type ||
              alert?.category ||
              ""
            ).toUpperCase();


            return (
              type.includes("QUALITY") ||
              type.includes("WATER")
            );
          });


        setQualityAlerts(
          filteredQualityAlerts
        );

        setError("");

      } catch (err) {
        console.error(
          "Water Quality API Error:",
          err
        );


        if (mounted) {
          setError(
            "Unable to load water quality data."
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
  // LOADING STATE
  // =====================================================

  if (loading) {
    return (
      <div className="water-quality-page">

        <div className="water-quality-loading">

          <Droplets size={42} />

          <h2>
            Loading Water Quality...
          </h2>

          <p>
            Connecting to JalRakshak AI backend
          </p>

        </div>

      </div>
    );
  }


  // =====================================================
  // ERROR STATE
  // =====================================================

  if (error && !sensorData) {
    return (
      <div className="water-quality-page">

        <div className="water-quality-error">

          <AlertTriangle size={42} />

          <h2>
            Water Quality Unavailable
          </h2>

          <p>
            {error}
          </p>

          <button
            className="quality-refresh-btn"
            onClick={() =>
              loadWaterQualityData(true)
            }
          >

            <RefreshCw size={17} />

            Try Again

          </button>

        </div>

      </div>
    );
  }


  // =====================================================
  // SENSOR VALUES
  // =====================================================

  const ph = Number(
    sensorData?.ph ?? 0
  );


  const turbidity = Number(
    sensorData?.turbidity ?? 0
  );


  const tds = Number(
    sensorData?.tds ?? 0
  );


  const deviceId =
    sensorData?.device_id ||
    sensorData?.deviceId ||
    "Unknown Device";


  const zoneId =
    sensorData?.zone_id ||
    sensorData?.zoneId ||
    "Unknown Zone";


  const timestamp =
    sensorData?.timestamp ||
    sensorData?.created_at ||
    sensorData?.createdAt;


  // =====================================================
  // WATER QUALITY DETECTION
  // =====================================================

  const backendQuality =
    sensorData?.detection?.water_quality;


  let qualityStatus = "GOOD";


  let qualityReason =
    "Water quality is within normal range";


  if (backendQuality) {

    if (
      backendQuality.status
    ) {
      qualityStatus =
        String(
          backendQuality.status
        ).toUpperCase();
    }


    if (
      backendQuality.reason
    ) {
      qualityReason =
        backendQuality.reason;
    }

  } else {

    const critical =
      ph < 5.5 ||
      ph > 9.5 ||
      turbidity > 10;


    const warning =
      ph < 6.5 ||
      ph > 8.5 ||
      turbidity > 5 ||
      tds < 0;


    if (critical) {

      qualityStatus =
        "CRITICAL";


      qualityReason =
        "Critical water quality condition detected";

    } else if (warning) {

      qualityStatus =
        "WARNING";


      qualityReason =
        "Water quality requires attention";
    }
  }


  // =====================================================
  // STATUS ICON
  // =====================================================

  const getStatusIcon = () => {

    if (
      qualityStatus === "CRITICAL"
    ) {
      return (
        <AlertTriangle size={30} />
      );
    }


    if (
      qualityStatus === "WARNING"
    ) {
      return (
        <AlertTriangle size={30} />
      );
    }


    return (
      <CheckCircle2 size={30} />
    );
  };


  // =====================================================
  // STATUS CLASS
  // =====================================================

  const getStatusClass = () => {

    if (
      qualityStatus === "CRITICAL"
    ) {
      return "critical";
    }


    if (
      qualityStatus === "WARNING"
    ) {
      return "warning";
    }


    return "good";
  };


  // =====================================================
  // VALUE STATUS
  // =====================================================

  const getPhStatus = () => {

    if (
      ph < 5.5 ||
      ph > 9.5
    ) {
      return "critical";
    }


    if (
      ph < 6.5 ||
      ph > 8.5
    ) {
      return "warning";
    }


    return "good";
  };


  const getTurbidityStatus = () => {

    if (
      turbidity > 10
    ) {
      return "critical";
    }


    if (
      turbidity > 5
    ) {
      return "warning";
    }


    return "good";
  };


  const getTdsStatus = () => {

    if (
      tds < 0
    ) {
      return "critical";
    }


    return "good";
  };


  // =====================================================
  // FORMAT TIME - INDIA STANDARD TIME (IST)
  // =====================================================

  const formatTime = (value) => {

    if (!value) {
      return "No timestamp";
    }

    try {

      let timestampValue = value;

      // Backend timestamps are stored in UTC.
      // If no timezone is included, explicitly treat
      // the value as UTC before converting it to IST.
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
        "Unable to format water quality timestamp in IST:",
        error
      );

      return "No timestamp";
    }

  };


  // =====================================================
  // RENDER
  // =====================================================

  return (
    <div className="water-quality-page">


      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="water-quality-header">

        <div>

          <div className="quality-title-row">


            {/* WATER QUALITY ICON */}

            <div className="quality-title-icon">

              <Beaker
                size={30}
                strokeWidth={2.2}
              />

            </div>


            {/* TITLE CONTENT */}

            <div>

              <p className="quality-eyebrow">
                JALRAKSHAK AI
              </p>

              <h1>
                Water Quality Detection
              </h1>

              <p>
                Intelligent water quality
                monitoring and analysis
              </p>

            </div>

          </div>

        </div>


        {/* REFRESH BUTTON */}

        <button
          className="quality-refresh-btn"
          onClick={() =>
            loadWaterQualityData(true)
          }
          disabled={refreshing}
        >

          <RefreshCw
            size={17}
            className={
              refreshing
                ? "spinning"
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
          `quality-refresh-info ${
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
          ERROR NOTICE
      ================================================= */}

      {error && (

        <div className="quality-error-banner">

          <AlertTriangle size={18} />

          {error}

        </div>

      )}


      {/* =================================================
          SYSTEM INFORMATION
      ================================================= */}

      <div className="quality-info-row">


        <div className="quality-info-card">

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


        <div className="quality-info-card">

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


        <div className="quality-info-card">

          <Clock3 size={20} />

          <div>

            <span>
              Last Reading
            </span>

            <strong>
              {formatTime(timestamp)}
            </strong>

          </div>

        </div>

      </div>


      {/* =================================================
          OVERALL QUALITY STATUS
      ================================================= */}

      <div
        className={
          `quality-status-card ${
            getStatusClass()
          }`
        }
      >

        <div className="quality-status-icon">

          {getStatusIcon()}

        </div>


        <div className="quality-status-content">

          <span>
            Overall Water Quality
          </span>

          <h2>
            {qualityStatus}
          </h2>

          <p>
            {qualityReason}
          </p>

        </div>


        <div className="quality-status-badge">

          <ShieldCheck size={18} />

          AI Detection Active

        </div>

      </div>


      {/* =================================================
          SENSOR CARDS
      ================================================= */}

      <div className="quality-sensor-grid">


        {/* =================================================
            PH
        ================================================= */}

        <div
          className={
            `quality-sensor-card ${
              getPhStatus()
            }`
          }
        >

          <div className="quality-sensor-top">

            <div className="quality-sensor-icon">

              <Beaker size={23} />

            </div>

            <span className="quality-sensor-label">
              pH Level
            </span>

          </div>


          <div className="quality-value">

            {ph.toFixed(2)}

          </div>


          <div className="quality-range">
            Normal range: 6.5 – 8.5
          </div>


          <div className="quality-sensor-status">

            {getPhStatus() === "good"
              ? "Normal"
              : getPhStatus() === "warning"
              ? "Attention Required"
              : "Critical"}

          </div>

        </div>


        {/* =================================================
            TURBIDITY
        ================================================= */}

        <div
          className={
            `quality-sensor-card ${
              getTurbidityStatus()
            }`
          }
        >

          <div className="quality-sensor-top">

            <div className="quality-sensor-icon">

              <Waves size={23} />

            </div>

            <span className="quality-sensor-label">
              Turbidity
            </span>

          </div>


          <div className="quality-value">

            {turbidity.toFixed(2)}

            <small>
              NTU
            </small>

          </div>


          <div className="quality-range">
            Normal: ≤ 5 NTU
          </div>


          <div className="quality-sensor-status">

            {getTurbidityStatus() === "good"
              ? "Normal"
              : getTurbidityStatus() === "warning"
              ? "High Turbidity"
              : "Critical"}

          </div>

        </div>


        {/* =================================================
            TDS
        ================================================= */}

        <div
          className={
            `quality-sensor-card ${
              getTdsStatus()
            }`
          }
        >

          <div className="quality-sensor-top">

            <div className="quality-sensor-icon">

              <Gauge size={23} />

            </div>

            <span className="quality-sensor-label">
              TDS
            </span>

          </div>


          <div className="quality-value">

            {tds.toFixed(2)}

            <small>
              ppm
            </small>

          </div>


          <div className="quality-range">
            Total Dissolved Solids
          </div>


          <div className="quality-sensor-status">

            {getTdsStatus() === "good"
              ? "Sensor Normal"
              : "Invalid Sensor Reading"}

          </div>

        </div>

      </div>


      {/* =================================================
          DETECTION SUMMARY
      ================================================= */}

      <div className="quality-section">

        <div className="quality-section-header">

          <div>

            <h2>
              Intelligent Quality Analysis
            </h2>

            <p>
              Real-time analysis from JalRakshak AI
            </p>

          </div>

          <Activity size={22} />

        </div>


        <div className="quality-analysis-box">


          {/* PH ANALYSIS */}

          <div className="analysis-item">

            <CheckCircle2 size={20} />

            <div>

              <span>
                pH Analysis
              </span>

              <strong>

                {getPhStatus() === "good"
                  ? "Within acceptable range"
                  : "Abnormal pH detected"}

              </strong>

            </div>

          </div>


          {/* TURBIDITY ANALYSIS */}

          <div className="analysis-item">

            <CheckCircle2 size={20} />

            <div>

              <span>
                Turbidity Analysis
              </span>

              <strong>

                {getTurbidityStatus() === "good"
                  ? "Water clarity is normal"
                  : "High turbidity detected"}

              </strong>

            </div>

          </div>


          {/* TDS ANALYSIS */}

          <div className="analysis-item">

            <CheckCircle2 size={20} />

            <div>

              <span>
                TDS Analysis
              </span>

              <strong>

                {getTdsStatus() === "good"
                  ? "Sensor reading is valid"
                  : "Invalid TDS reading"}

              </strong>

            </div>

          </div>

        </div>

      </div>


      {/* =================================================
          RECENT QUALITY ALERTS
      ================================================= */}

      <div className="quality-section">

        <div className="quality-section-header">

          <div>

            <h2>
              Recent Quality Alerts
            </h2>

            <p>
              Water-quality related events
              detected by JalRakshak AI
            </p>

          </div>

          <AlertTriangle size={22} />

        </div>


        {qualityAlerts.length === 0 ? (

          <div className="no-quality-alerts">

            <CheckCircle2 size={24} />

            <div>

              <strong>
                No recent quality alerts
              </strong>

              <p>
                Water quality is currently
                being monitored normally.
              </p>

            </div>

          </div>

        ) : (

          <div className="quality-alert-list">

            {qualityAlerts
              .slice(0, 8)
              .map((alert, index) => {

                const level =
                  String(
                    alert?.level ||
                    alert?.severity ||
                    "WARNING"
                  ).toUpperCase();


                return (

                  <div
                    className={
                      `quality-alert-item ${
                        level.toLowerCase()
                      }`
                    }

                    key={
                      alert?._id ||
                      alert?.id ||
                      index
                    }
                  >

                    <div className="quality-alert-icon">

                      <AlertTriangle size={19} />

                    </div>


                    <div className="quality-alert-content">

                      <strong>

                        {alert?.message ||
                          alert?.reason ||
                          "Water quality alert detected"}

                      </strong>


                      <span>

                        {formatTime(
                          alert?.timestamp ||
                          alert?.created_at ||
                          alert?.createdAt
                        )}

                      </span>

                    </div>


                    <span className="quality-alert-level">

                      {level}

                    </span>

                  </div>

                );
              })}

          </div>

        )}

      </div>


      {/* =================================================
          MONITORING FOOTER
      ================================================= */}

      <div className="quality-auto-refresh">

        <Activity size={15} />

        <span>

          {autoRefresh
            ? `Live monitoring • Automatically refreshing every ${refreshInterval} seconds`
            : "Live monitoring • Automatic refresh disabled"}

        </span>

      </div>

    </div>
  );
}


export default WaterQuality;