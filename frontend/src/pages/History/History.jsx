import { useEffect, useState } from "react";

import {
  History as HistoryIcon,
  RefreshCw,
  Activity,
  Gauge,
  FlaskConical,
  Droplets,
  Waves,
  Clock3,
  Cpu,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Power,
} from "lucide-react";

import {
  getSensorHistory,
  getSettings,
  updateHistorySetting,
} from "../../services/api";

import "./History.css";


function History() {

  // =====================================================
  // STATE
  // =====================================================

  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [historyEnabled, setHistoryEnabled] = useState(true);

  const [settingsLoading, setSettingsLoading] = useState(true);

  const [savingSetting, setSavingSetting] = useState(false);


  // =====================================================
  // GET SETTINGS FROM BACKEND
  // =====================================================

  useEffect(() => {

    let active = true;

    async function loadSettings() {

      try {

        const response = await getSettings();

        if (!active) {
          return;
        }

        if (
          response &&
          response.success &&
          response.data
        ) {

          setHistoryEnabled(
            response.data.history_enabled !== false
          );

        }

      } catch (err) {

        console.error(
          "Unable to load History settings:",
          err
        );

      } finally {

        if (active) {
          setSettingsLoading(false);
        }

      }

    }

    loadSettings();

    return () => {
      active = false;
    };

  }, []);


  // =====================================================
  // LOAD HISTORY
  // =====================================================

  async function loadHistory(manual = false) {

    if (!historyEnabled) {
      return;
    }

    try {

      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response =
        await getSensorHistory(50);


      if (
        response &&
        response.success &&
        Array.isArray(response.data)
      ) {

        setHistory(response.data);

      } else {

        setHistory([]);

      }

    } catch (err) {

      console.error(
        "History API Error:",
        err
      );

      setError(
        "Unable to load sensor history from backend."
      );

    } finally {

      setLoading(false);
      setRefreshing(false);

    }

  }


  // =====================================================
  // INITIAL HISTORY LOAD
  // =====================================================

  useEffect(() => {

    if (settingsLoading) {
      return;
    }

    if (!historyEnabled) {
      return;
    }

    let active = true;


    async function startHistory() {

      if (!active) {
        return;
      }

      try {

        setLoading(true);
        setError("");

        const response =
          await getSensorHistory(50);

        if (!active) {
          return;
        }

        if (
          response &&
          response.success &&
          Array.isArray(response.data)
        ) {

          setHistory(response.data);

        } else {

          setHistory([]);

        }

      } catch (err) {

        if (active) {

          console.error(
            "History API Error:",
            err
          );

          setError(
            "Unable to load sensor history from backend."
          );

        }

      } finally {

        if (active) {
          setLoading(false);
        }

      }

    }


    startHistory();


    const timer = setInterval(
      async () => {

        if (!active) {
          return;
        }

        try {

          const response =
            await getSensorHistory(50);

          if (!active) {
            return;
          }

          if (
            response &&
            response.success &&
            Array.isArray(response.data)
          ) {

            setHistory(response.data);

          }

        } catch (err) {

          console.error(
            "Automatic history refresh error:",
            err
          );

        }

      },
      5000
    );


    return () => {

      active = false;

      clearInterval(timer);

    };

  }, [
    settingsLoading,
    historyEnabled,
  ]);


  // =====================================================
  // HISTORY ON / OFF
  // =====================================================

  async function handleHistoryToggle() {

    if (savingSetting) {
      return;
    }

    const newValue =
      !historyEnabled;

    setSavingSetting(true);

    setError("");


    try {

      const response =
        await updateHistorySetting(
          newValue
        );


      if (
        response &&
        response.success
      ) {

        setHistoryEnabled(
          newValue
        );


        if (!newValue) {

          setHistory([]);

          setLoading(false);

        } else {

          setLoading(true);

        }

      } else {

        setError(
          "Unable to save History setting."
        );

      }

    } catch (err) {

      console.error(
        "History setting error:",
        err
      );

      setError(
        "Unable to save History setting. Check that the backend is running."
      );

    } finally {

      setSavingSetting(false);

    }

  }


  // =====================================================
  // FORMAT DATE - INDIA STANDARD TIME (IST)
  // =====================================================

  function formatDate(value) {

    if (!value) {
      return "Not available";
    }

    try {

      let timestampValue = value;

      // Backend timestamps are stored in UTC.
      // If a timestamp arrives without a timezone suffix,
      // explicitly treat it as UTC before converting it to IST.
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
        "Unable to format history timestamp in IST:",
        error
      );

      return "Not available";
    }

  }


  // =====================================================
  // FORMAT NUMBER
  // =====================================================

  function formatNumber(value) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "--";
    }

    const number =
      Number(value);

    if (
      Number.isNaN(number)
    ) {
      return "--";
    }

    return number.toFixed(2);

  }


  // =====================================================
  // GET STATUS
  // =====================================================

  function getReadingStatus(reading) {

    const detection =
      reading?.detection || {};

    const status =
      String(
        detection?.overall_status ||
        reading?.status ||
        "NORMAL"
      ).toUpperCase();


    if (
      status === "CRITICAL" ||
      status === "DANGER"
    ) {

      return "CRITICAL";

    }


    if (
      status === "WARNING" ||
      status === "ALERT"
    ) {

      return "WARNING";

    }


    return "NORMAL";

  }


  // =====================================================
  // STATUS CLASS
  // =====================================================

  function getStatusClass(status) {

    if (
      status === "CRITICAL"
    ) {

      return "history-status-critical";

    }


    if (
      status === "WARNING"
    ) {

      return "history-status-warning";

    }


    return "history-status-normal";

  }


  // =====================================================
  // SETTINGS LOADING SCREEN
  // =====================================================

  if (settingsLoading) {

    return (

      <div className="history-page">

        <div className="history-header">

          <div className="history-title-section">

            <div className="history-title-icon">

              <HistoryIcon
                size={34}
                strokeWidth={2.2}
              />

            </div>


            <div className="history-title-content">

              <p className="history-eyebrow">
                JALRAKSHAK AI
              </p>

              <h1>
                History
              </h1>

              <p className="history-subtitle">
                Loading history settings...
              </p>

            </div>

          </div>

        </div>


        <div className="history-loading">

          <RefreshCw
            size={26}
            className="loading-spin"
          />

          <span>
            Loading History settings...
          </span>

        </div>

      </div>

    );

  }


  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (

    <div className="history-page">


      {/* =================================================
          HEADER
      ================================================= */}

      <div className="history-header">

        <div className="history-title-section">

          <div className="history-title-icon">

            <HistoryIcon
              size={34}
              strokeWidth={2.2}
            />

          </div>


          <div className="history-title-content">

            <p className="history-eyebrow">
              JALRAKSHAK AI
            </p>

            <h1>
              History
            </h1>

            <p className="history-subtitle">
              View historical water monitoring
              sensor readings.
            </p>

          </div>

        </div>


        {/* HEADER ACTIONS */}

        <div className="history-header-actions">


          {/* HISTORY BUTTON */}

          <button
            type="button"
            className={
              `history-toggle-button ${
                historyEnabled
                  ? "enabled"
                  : "disabled"
              }`
            }
            onClick={
              handleHistoryToggle
            }
            disabled={
              savingSetting
            }
          >

            <Power size={16} />

            {savingSetting
              ? "Saving..."
              : historyEnabled
              ? "History ON"
              : "History OFF"}

          </button>


          {/* REFRESH BUTTON */}

          <button
            type="button"
            className="history-refresh-button"
            onClick={() =>
              loadHistory(true)
            }
            disabled={
              refreshing ||
              !historyEnabled
            }
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

      </div>


      {/* =================================================
          STATUS BAR
      ================================================= */}

      <div
        className={
          `history-control-info ${
            historyEnabled
              ? "enabled"
              : "disabled"
          }`
        }
      >

        <HistoryIcon size={16} />

        <span>

          {historyEnabled
            ? "History tracking is enabled and connected to the backend."
            : "History tracking is disabled."}

        </span>

      </div>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (

        <div className="history-error">

          <div className="history-error-icon">

            <AlertTriangle
              size={27}
            />

          </div>


          <div>

            <h3>
              History Error
            </h3>

            <p>
              {error}
            </p>

          </div>

        </div>

      )}


      {/* =================================================
          HISTORY DISABLED
      ================================================= */}

      {!historyEnabled ? (

        <div className="history-disabled-card">

          <div className="history-disabled-icon">

            <HistoryIcon
              size={36}
            />

          </div>


          <div>

            <h2>
              History Tracking Disabled
            </h2>

            <p>
              Historical sensor readings are
              currently hidden.
            </p>


            <button
              type="button"
              className="history-enable-button"
              onClick={
                handleHistoryToggle
              }
              disabled={
                savingSetting
              }
            >

              <HistoryIcon
                size={16}
              />

              {savingSetting
                ? "Saving..."
                : "Enable History"}

            </button>

          </div>

        </div>

      ) : (

        <>


          {/* =================================================
              LOADING
          ================================================= */}

          {loading && history.length === 0 ? (

            <div className="history-loading">

              <RefreshCw
                size={26}
                className="loading-spin"
              />

              <span>
                Loading sensor history...
              </span>

            </div>

          ) : (

            <>


              {/* =================================================
                  SUMMARY
              ================================================= */}

              <div className="history-summary-grid">


                {/* TOTAL */}

                <div className="history-summary-card">

                  <div className="history-summary-icon">

                    <HistoryIcon
                      size={21}
                    />

                  </div>

                  <div>

                    <span>
                      Total Readings
                    </span>

                    <strong>
                      {history.length}
                    </strong>

                  </div>

                </div>


                {/* NORMAL */}

                <div className="history-summary-card">

                  <div className="history-summary-icon">

                    <CheckCircle2
                      size={21}
                    />

                  </div>

                  <div>

                    <span>
                      Normal
                    </span>

                    <strong>

                      {
                        history.filter(
                          (item) =>
                            getReadingStatus(
                              item
                            ) === "NORMAL"
                        ).length
                      }

                    </strong>

                  </div>

                </div>


                {/* WARNING */}

                <div className="history-summary-card">

                  <div className="history-summary-icon">

                    <AlertTriangle
                      size={21}
                    />

                  </div>

                  <div>

                    <span>
                      Warning
                    </span>

                    <strong>

                      {
                        history.filter(
                          (item) =>
                            getReadingStatus(
                              item
                            ) === "WARNING"
                        ).length
                      }

                    </strong>

                  </div>

                </div>


                {/* CRITICAL */}

                <div className="history-summary-card">

                  <div className="history-summary-icon">

                    <AlertTriangle
                      size={21}
                    />

                  </div>

                  <div>

                    <span>
                      Critical
                    </span>

                    <strong>

                      {
                        history.filter(
                          (item) =>
                            getReadingStatus(
                              item
                            ) === "CRITICAL"
                        ).length
                      }

                    </strong>

                  </div>

                </div>

              </div>


              {/* =================================================
                  HISTORY CARD
              ================================================= */}

              <div className="history-card">


                {/* CARD HEADER */}

                <div className="history-card-header">

                  <div>

                    <h2>
                      Sensor Reading History
                    </h2>

                    <p>
                      Historical data received from
                      JalRakshak AI monitoring devices.
                    </p>

                  </div>


                  <div className="history-record-count">

                    {history.length} Records

                  </div>

                </div>


                {/* =================================================
                    EMPTY
                ================================================= */}

                {history.length === 0 ? (

                  <div className="history-empty">

                    <div className="history-empty-icon">

                      <HistoryIcon
                        size={30}
                      />

                    </div>

                    <h3>
                      No history available
                    </h3>

                    <p>
                      Sensor readings will appear here
                      when JalRakshak AI receives data.
                    </p>

                  </div>

                ) : (


                  /* =================================================
                     TABLE
                  ================================================= */

                  <div className="history-table-wrapper">

                    <table className="history-table">

                      <thead>

                        <tr>

                          <th>
                            #
                          </th>

                          <th>
                            Device
                          </th>

                          <th>
                            Zone
                          </th>

                          <th>

                            <span className="history-column-title">

                              <Activity
                                size={15}
                              />

                              Flow

                            </span>

                          </th>

                          <th>

                            <span className="history-column-title">

                              <Gauge
                                size={15}
                              />

                              Pressure

                            </span>

                          </th>

                          <th>

                            <span className="history-column-title">

                              <FlaskConical
                                size={15}
                              />

                              pH

                            </span>

                          </th>

                          <th>

                            <span className="history-column-title">

                              <Waves
                                size={15}
                              />

                              Turbidity

                            </span>

                          </th>

                          <th>

                            <span className="history-column-title">

                              <Droplets
                                size={15}
                              />

                              TDS

                            </span>

                          </th>

                          <th>
                            Status
                          </th>

                          <th>

                            <span className="history-column-title">

                              <Clock3
                                size={15}
                              />

                              Time

                            </span>

                          </th>

                        </tr>

                      </thead>


                      <tbody>

                        {history.map(
                          (reading, index) => {

                            const deviceId =
                              reading?.device_id ||
                              "Unknown";


                            const zoneId =
                              reading?.zone_id ||
                              "Not assigned";


                            const status =
                              getReadingStatus(
                                reading
                              );


                            const timestamp =
                              reading?.timestamp ||
                              reading?.created_at ||
                              reading?.updated_at;


                            return (

                              <tr
                                key={
                                  reading?._id ||
                                  reading?.id ||
                                  `${deviceId}-${index}`
                                }
                              >


                                {/* NUMBER */}

                                <td>
                                  {index + 1}
                                </td>


                                {/* DEVICE */}

                                <td>

                                  <div className="history-device">

                                    <div className="history-device-icon">

                                      <Cpu
                                        size={16}
                                      />

                                    </div>

                                    <span>
                                      {deviceId}
                                    </span>

                                  </div>

                                </td>


                                {/* ZONE */}

                                <td>

                                  <div className="history-zone">

                                    <MapPin
                                      size={15}
                                    />

                                    <span>
                                      {zoneId}
                                    </span>

                                  </div>

                                </td>


                                {/* FLOW */}

                                <td>

                                  <strong>

                                    {
                                      formatNumber(
                                        reading?.flow_rate
                                      )
                                    }

                                  </strong>

                                  <small>
                                    L/min
                                  </small>

                                </td>


                                {/* PRESSURE */}

                                <td>

                                  <strong>

                                    {
                                      formatNumber(
                                        reading?.pressure_bar
                                      )
                                    }

                                  </strong>

                                  <small>
                                    bar
                                  </small>

                                </td>


                                {/* PH */}

                                <td>

                                  <strong>

                                    {
                                      formatNumber(
                                        reading?.ph
                                      )
                                    }

                                  </strong>

                                </td>


                                {/* TURBIDITY */}

                                <td>

                                  <strong>

                                    {
                                      formatNumber(
                                        reading?.turbidity
                                      )
                                    }

                                  </strong>

                                  <small>
                                    NTU
                                  </small>

                                </td>


                                {/* TDS */}

                                <td>

                                  <strong>

                                    {
                                      formatNumber(
                                        reading?.tds
                                      )
                                    }

                                  </strong>

                                  <small>
                                    ppm
                                  </small>

                                </td>


                                {/* STATUS */}

                                <td>

                                  <span
                                    className={
                                      `history-status ${
                                        getStatusClass(
                                          status
                                        )
                                      }`
                                    }
                                  >

                                    <span className="history-status-dot" />

                                    {status}

                                  </span>

                                </td>


                                {/* TIME */}

                                <td>

                                  <span className="history-time">

                                    <Clock3
                                      size={14}
                                    />

                                    {
                                      formatDate(
                                        timestamp
                                      )
                                    }

                                  </span>

                                </td>

                              </tr>

                            );

                          }
                        )}

                      </tbody>

                    </table>

                  </div>

                )}

              </div>


              {/* =================================================
                  AUTO REFRESH
              ================================================= */}

              <div className="history-auto-refresh">

                <Activity
                  size={15}
                />

                Automatically refreshing every
                5 seconds

              </div>

            </>

          )}

        </>

      )}

    </div>

  );

}


export default History;