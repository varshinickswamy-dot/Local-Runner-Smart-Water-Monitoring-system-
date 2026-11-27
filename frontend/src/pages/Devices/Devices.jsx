import { useEffect, useState } from "react";

import {
  Cpu,
  Wifi,
  WifiOff,
  Activity,
  Gauge,
  Droplets,
  FlaskConical,
  RefreshCw,
  MapPin,
  Clock3,
  AlertTriangle,
} from "lucide-react";

import { getDevices } from "../../services/api";

import "./Devices.css";


// =====================================================
// JalRakshak AI
// Device Data Loader
// =====================================================

async function fetchDevicesData(
  setDevices,
  setLoading,
  setRefreshing,
  setError,
  showRefresh = false
) {
  try {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    const response = await getDevices();

    if (
      response &&
      response.success === true &&
      Array.isArray(response.data)
    ) {
      setDevices(response.data);
    } else {
      setDevices([]);
    }
  } catch (error) {
    console.error(
      "JalRakshak AI Devices API Error:",
      error
    );

    setError(
      "Unable to load device information from JalRakshak AI backend."
    );
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}


// =====================================================
// JalRakshak AI - Devices Page
// =====================================================

function Devices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");


  // =====================================================
  // INITIAL LOAD + AUTOMATIC REFRESH
  // =====================================================

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!isMounted) {
        return;
      }

      await fetchDevicesData(
        setDevices,
        setLoading,
        setRefreshing,
        setError,
        false
      );
    };

    loadData();

    const refreshInterval = setInterval(() => {
      loadData();
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, []);


  // =====================================================
  // MANUAL REFRESH
  // =====================================================

  const handleRefresh = () => {
    fetchDevicesData(
      setDevices,
      setLoading,
      setRefreshing,
      setError,
      true
    );
  };


  // =====================================================
  // FORMAT DATE - INDIA STANDARD TIME (IST)
  // =====================================================

  const formatDate = (dateValue) => {

    if (!dateValue) {
      return "Not available";
    }

    try {

      let timestampValue = dateValue;

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
        return "Not available";
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
        "Unable to format device timestamp in IST:",
        error
      );

      return "Not available";
    }

  };


  // =====================================================
  // DEVICE STATUS
  // =====================================================

  const getDeviceStatus = (device) => {
    const status = String(
      device?.status ||
        device?.device_status ||
        ""
    ).toUpperCase();

    if (
      status === "ONLINE" ||
      status === "ACTIVE"
    ) {
      return "ONLINE";
    }

    return "OFFLINE";
  };


  // =====================================================
  // STATUS CLASS
  // =====================================================

  const getStatusClass = (status) => {
    if (status === "ONLINE") {
      return "device-online";
    }

    return "device-offline";
  };


  // =====================================================
  // LOADING SCREEN
  // =====================================================

  if (loading) {
    return (
      <div className="devices-page">

        <div className="devices-header">

          <div className="devices-title-section">

            <div className="devices-title-icon">
              <Cpu
                size={34}
                strokeWidth={2.2}
              />
            </div>

            <div className="devices-title-content">

              <p className="devices-eyebrow">
                JALRAKSHAK AI
              </p>

              <h1>
                Devices
              </h1>

              <p className="devices-subtitle">
                Monitor connected water monitoring
                devices.
              </p>

            </div>

          </div>

        </div>


        <div className="devices-loading">

          <RefreshCw
            size={26}
            className="loading-spin"
          />

          <span>
            Loading devices...
          </span>

        </div>

      </div>
    );
  }


  // =====================================================
  // ERROR SCREEN
  // =====================================================

  if (error) {
    return (
      <div className="devices-page">

        <div className="devices-header">

          <div className="devices-title-section">

            <div className="devices-title-icon">
              <Cpu
                size={34}
                strokeWidth={2.2}
              />
            </div>

            <div className="devices-title-content">

              <p className="devices-eyebrow">
                JALRAKSHAK AI
              </p>

              <h1>
                Devices
              </h1>

              <p className="devices-subtitle">
                Monitor connected water monitoring
                devices.
              </p>

            </div>

          </div>

        </div>


        <div className="devices-error">

          <div className="devices-error-icon">

            <AlertTriangle size={28} />

          </div>


          <div>

            <h3>
              Unable to load devices
            </h3>

            <p>
              {error}
            </p>


            <button
              type="button"
              className="device-refresh-button"
              onClick={handleRefresh}
            >

              <RefreshCw size={16} />

              Try Again

            </button>

          </div>

        </div>

      </div>
    );
  }


  // =====================================================
  // DEVICE COUNTS
  // =====================================================

  const onlineDevices = devices.filter(
    (device) =>
      getDeviceStatus(device) === "ONLINE"
  ).length;


  const offlineDevices = devices.filter(
    (device) =>
      getDeviceStatus(device) === "OFFLINE"
  ).length;


  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <div className="devices-page">

      {/* =================================================
          PAGE HEADER
      ================================================= */}

      <div className="devices-header">

        <div className="devices-title-section">

          {/* DEVICES ICON */}

          <div className="devices-title-icon">

            <Cpu
              size={34}
              strokeWidth={2.2}
            />

          </div>


          {/* TITLE CONTENT */}

          <div className="devices-title-content">

            <p className="devices-eyebrow">
              JALRAKSHAK AI
            </p>

            <h1>
              Devices
            </h1>

            <p className="devices-subtitle">
              Monitor and manage connected water
              monitoring devices.
            </p>

          </div>

        </div>


        {/* REFRESH BUTTON */}

        <button
          type="button"
          className="device-refresh-button"
          onClick={handleRefresh}
          disabled={refreshing}
        >

          <RefreshCw
            size={17}
            className={
              refreshing
                ? "loading-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}

        </button>

      </div>


      {/* =================================================
          DEVICE SUMMARY
      ================================================= */}

      <div className="device-summary-grid">

        {/* TOTAL DEVICES */}

        <div className="device-summary-card">

          <div className="device-summary-icon">

            <Cpu size={21} />

          </div>


          <div>

            <span>
              Total Devices
            </span>

            <strong>
              {devices.length}
            </strong>

          </div>

        </div>


        {/* ONLINE DEVICES */}

        <div className="device-summary-card">

          <div className="device-summary-icon">

            <Wifi size={21} />

          </div>


          <div>

            <span>
              Online
            </span>

            <strong>
              {onlineDevices}
            </strong>

          </div>

        </div>


        {/* OFFLINE DEVICES */}

        <div className="device-summary-card">

          <div className="device-summary-icon">

            <WifiOff size={21} />

          </div>


          <div>

            <span>
              Offline
            </span>

            <strong>
              {offlineDevices}
            </strong>

          </div>

        </div>

      </div>


      {/* =================================================
          EMPTY STATE
      ================================================= */}

      {devices.length === 0 ? (

        <div className="devices-empty">

          <div className="devices-empty-icon">

            <Cpu size={30} />

          </div>


          <h3>
            No devices found
          </h3>


          <p>
            No JalRakshak AI monitoring devices
            are currently registered.
          </p>

        </div>

      ) : (

        /* =================================================
           DEVICE CARDS
        ================================================= */

        <div className="devices-grid">

          {devices.map(
            (device, index) => {

              const status =
                getDeviceStatus(device);


              const deviceId =
                device?.device_id ||
                device?.id ||
                `DEVICE-${index + 1}`;


              const zoneId =
                device?.zone_id ||
                device?.zone ||
                "Not assigned";


              const lastSeen =
                device?.last_seen ||
                device?.timestamp ||
                device?.updated_at ||
                device?.created_at;


              return (

                <div
                  className="device-card"
                  key={`${deviceId}-${index}`}
                >

                  {/* =====================================
                      DEVICE HEADER
                  ===================================== */}

                  <div className="device-card-header">

                    <div className="device-title-group">

                      <div className="device-icon">

                        <Cpu size={22} />

                      </div>


                      <div>

                        <h2>
                          {deviceId}
                        </h2>

                        <p>
                          JalRakshak AI Monitoring
                          Device
                        </p>

                      </div>

                    </div>


                    <div
                      className={
                        `device-status ${
                          getStatusClass(status)
                        }`
                      }
                    >

                      <span className="device-status-dot" />

                      {status}

                    </div>

                  </div>


                  {/* =====================================
                      DEVICE INFORMATION
                  ===================================== */}

                  <div className="device-info-grid">

                    {/* ZONE */}

                    <div className="device-info-item">

                      <MapPin size={17} />

                      <div>

                        <span>
                          Zone
                        </span>

                        <strong>
                          {zoneId}
                        </strong>

                      </div>

                    </div>


                    {/* LAST SEEN */}

                    <div className="device-info-item">

                      <Clock3 size={17} />

                      <div>

                        <span>
                          Last Seen
                        </span>

                        <strong>
                          {formatDate(lastSeen)}
                        </strong>

                      </div>

                    </div>

                  </div>


                  {/* =====================================
                      CONNECTED SENSORS
                  ===================================== */}

                  <div className="device-sensors">

                    <div className="device-sensors-title">
                      Connected Sensors
                    </div>


                    {/* FLOW SENSOR */}

                    <div className="sensor-status-row">

                      <div>

                        <Activity size={16} />

                        <span>
                          Flow Sensor
                        </span>

                      </div>


                      <span className="sensor-ready">
                        READY
                      </span>

                    </div>


                    {/* PRESSURE SENSOR */}

                    <div className="sensor-status-row">

                      <div>

                        <Gauge size={16} />

                        <span>
                          Pressure Sensor
                        </span>

                      </div>


                      <span className="sensor-ready">
                        READY
                      </span>

                    </div>


                    {/* PH SENSOR */}

                    <div className="sensor-status-row">

                      <div>

                        <FlaskConical size={16} />

                        <span>
                          pH Sensor
                        </span>

                      </div>


                      <span className="sensor-ready">
                        READY
                      </span>

                    </div>


                    {/* WATER QUALITY */}

                    <div className="sensor-status-row">

                      <div>

                        <Droplets size={16} />

                        <span>
                          Water Quality Sensors
                        </span>

                      </div>


                      <span className="sensor-ready">
                        READY
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
  );
}


export default Devices;