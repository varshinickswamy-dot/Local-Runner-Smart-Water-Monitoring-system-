import { useEffect, useState } from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  LockKeyhole,
  Power,
  RefreshCw,
  ShieldAlert,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  Unlock,
} from "lucide-react";

import "./Controls.css";


import { API_BASE_URL } from "../../config";


function Controls() {

  const [controlState, setControlState] = useState(null);

  const [loading, setLoading] = useState(true);

  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);


  // =========================================================
  // GET AUTH TOKEN
  // =========================================================

  const getToken = () =>
    localStorage.getItem(
      "jalrakshak_access_token"
    );


  // =========================================================
  // LOAD CURRENT CONTROL STATE
  // =========================================================

  useEffect(() => {

    let cancelled = false;


    async function loadControls() {

      const token = getToken();


      if (!token) {

        if (!cancelled) {

          setError(
            "Authentication required. Please log in again."
          );

          setLoading(false);

        }

        return;

      }


      try {

        setLoading(true);


        const response = await fetch(
          `${API_BASE_URL}/api/controls`,
          {
            method: "GET",

            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );


        const result =
          await response.json();


        if (!response.ok) {

          throw new Error(
            result.detail ||
            "Unable to load control status."
          );

        }


        if (!cancelled) {

          setControlState(
            result.data
          );

          setError("");

        }

      }

      catch (err) {

        if (!cancelled) {

          setError(
            err.message ||
            "Unable to connect to the Controls API."
          );

        }

      }

      finally {

        if (!cancelled) {

          setLoading(false);

        }

      }

    }


    loadControls();


    return () => {

      cancelled = true;

    };

  }, [refreshKey]);


  // =========================================================
  // PERFORM CONTROL ACTION
  // =========================================================

  const performAction = async (
    actionKey,
    url,
    method,
    body = null
  ) => {

    const token = getToken();


    if (!token) {

      setError(
        "Authentication required. Please log in again."
      );

      return;

    }


    setActionLoading(actionKey);

    setError("");

    setMessage("");


    try {

      const options = {

        method,

        headers: {

          Authorization:
            `Bearer ${token}`,

          Accept:
            "application/json",

        },

      };


      if (body !== null) {

        options.headers[
          "Content-Type"
        ] = "application/json";

        options.body =
          JSON.stringify(body);

      }


      const response = await fetch(
        `${API_BASE_URL}${url}`,
        options
      );


      const result =
        await response.json();


      if (!response.ok) {

        throw new Error(
          result.detail ||
          "Control action failed."
        );

      }


      setControlState(
        result.data
      );


      setMessage(
        result.message ||
        "Control updated successfully."
      );

    }

    catch (err) {

      setError(
        err.message ||
        "Unable to perform control action."
      );

    }

    finally {

      setActionLoading("");

    }

  };


  // =========================================================
  // EMERGENCY SHUTDOWN
  // =========================================================

  const handleEmergencyShutdown = async () => {

    const confirmed =
      window.confirm(
        "Activate emergency shutdown?\n\nThe simulated valve will be CLOSED and the simulated motor will be STOPPED."
      );


    if (!confirmed) {

      return;

    }


    await performAction(
      "emergency",
      "/api/controls/emergency-shutdown",
      "POST"
    );

  };


  // =========================================================
  // FORMAT TIME
  // =========================================================

  const formatTime = (value) => {

    if (!value) {

      return "Not changed";

    }


    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "Unknown";

    }


    return date.toLocaleString(
      "en-IN",
      {
        timeZone:
          "Asia/Kolkata",

        dateStyle:
          "medium",

        timeStyle:
          "short",
      }
    );

  };


  // =========================================================
  // CURRENT STATES
  // =========================================================

  const valveOpen =
    controlState?.valve?.state ===
    "OPEN";


  const motorRunning =
    controlState?.motor?.state ===
    "RUNNING";


  const autoMode =
    controlState?.auto_mode === true;


  const emergencyActive =
    controlState?.emergency_shutdown ===
    true;


  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {

    return (

      <div className="controls-page">

        <div className="controls-loading">

          <RefreshCw
            className="controls-spin"
            size={24}
          />

          <span>
            Loading control status...
          </span>

        </div>

      </div>

    );

  }


  // =========================================================
  // PAGE
  // =========================================================

  return (

    <div className="controls-page">


      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="controls-header">


        {/* LARGE LEFT ICON */}

        <div className="controls-title-icon">

          <SlidersHorizontal
            size={42}
          />

        </div>


        {/* TITLE */}

        <div className="controls-title-area">

          <span className="controls-brand">
            JALRAKSHAK AI
          </span>


          <h1>
            Controls
          </h1>


          <p>
            Manage and control smart water
            monitoring equipment.
          </p>

        </div>


        {/* REFRESH */}

        <button
          type="button"
          className="controls-refresh-btn"

          onClick={() =>
            setRefreshKey(
              (value) =>
                value + 1
            )
          }

          disabled={
            actionLoading !== ""
          }
        >

          <RefreshCw
            size={21}
          />

          Refresh

        </button>

      </div>


      {/* =====================================================
          SOFTWARE SIMULATION
          ===================================================== */}

      <div className="controls-simulation-banner">

        <div className="controls-banner-icon">

          <Gauge size={22} />

        </div>


        <div>

          <strong>
            Software Simulation Mode
          </strong>

          <span>
            These controls currently simulate
            valve and motor states. No physical
            IoT device is connected.
          </span>

        </div>

      </div>


      {/* =====================================================
          SUCCESS MESSAGE
          ===================================================== */}

      {message && (

        <div className="controls-message controls-message-success">

          <CheckCircle2
            size={18}
          />

          <span>
            {message}
          </span>

        </div>

      )}


      {/* =====================================================
          ERROR MESSAGE
          ===================================================== */}

      {error && (

        <div className="controls-message controls-message-error">

          <AlertTriangle
            size={18}
          />

          <span>
            {error}
          </span>

        </div>

      )}


      {/* =====================================================
          CONTROL CARDS
          ===================================================== */}

      <section className="controls-status-grid">


        {/* ===================================================
            VALVE
            =================================================== */}

        <div className="controls-status-card">

          <div className="controls-card-top">

            <div className="controls-card-icon valve-icon">

              <Gauge
                size={24}
              />

            </div>


            <span
              className={
                `controls-status-pill ${
                  valveOpen
                    ? "status-active"
                    : "status-inactive"
                }`
              }
            >

              {valveOpen
                ? "OPEN"
                : "CLOSED"}

            </span>

          </div>


          <h3>
            Smart Valve
          </h3>


          <p>

            Last changed:{" "}

            {formatTime(
              controlState
                ?.valve
                ?.updated_at
            )}

          </p>


          <div className="controls-action-row">


            <button
              type="button"

              className={
                `controls-action-btn ${
                  valveOpen
                    ? "selected"
                    : ""
                }`
              }

              disabled={
                actionLoading !== "" ||
                valveOpen ||
                emergencyActive
              }

              onClick={() =>
                performAction(
                  "valve-open",
                  "/api/controls/valve",
                  "PUT",
                  {
                    state: "OPEN",
                  }
                )
              }
            >

              <Unlock
                size={16}
              />

              Open Valve

            </button>


            <button
              type="button"

              className={
                `controls-action-btn ${
                  !valveOpen
                    ? "selected"
                    : ""
                }`
              }

              disabled={
                actionLoading !== "" ||
                !valveOpen
              }

              onClick={() =>
                performAction(
                  "valve-close",
                  "/api/controls/valve",
                  "PUT",
                  {
                    state: "CLOSED",
                  }
                )
              }
            >

              <LockKeyhole
                size={16}
              />

              Close Valve

            </button>

          </div>

        </div>


        {/* ===================================================
            MOTOR
            =================================================== */}

        <div className="controls-status-card">

          <div className="controls-card-top">

            <div className="controls-card-icon motor-icon">

              <Power
                size={24}
              />

            </div>


            <span
              className={
                `controls-status-pill ${
                  motorRunning
                    ? "status-active"
                    : "status-inactive"
                }`
              }
            >

              {motorRunning
                ? "RUNNING"
                : "STOPPED"}

            </span>

          </div>


          <h3>
            Water Motor
          </h3>


          <p>

            Last changed:{" "}

            {formatTime(
              controlState
                ?.motor
                ?.updated_at
            )}

          </p>


          <div className="controls-action-row">


            <button
              type="button"

              className={
                `controls-action-btn ${
                  motorRunning
                    ? "selected"
                    : ""
                }`
              }

              disabled={
                actionLoading !== "" ||
                motorRunning
              }

              onClick={() =>
                performAction(
                  "motor-start",
                  "/api/controls/motor",
                  "PUT",
                  {
                    state: "RUNNING",
                  }
                )
              }
            >

              <Power
                size={16}
              />

              Start Motor

            </button>


            <button
              type="button"

              className={
                `controls-action-btn ${
                  !motorRunning
                    ? "selected"
                    : ""
                }`
              }

              disabled={
                actionLoading !== "" ||
                !motorRunning
              }

              onClick={() =>
                performAction(
                  "motor-stop",
                  "/api/controls/motor",
                  "PUT",
                  {
                    state: "STOPPED",
                  }
                )
              }
            >

              <Power
                size={16}
              />

              Stop Motor

            </button>

          </div>

        </div>


        {/* ===================================================
            AUTOMATIC MODE
            =================================================== */}

        <div className="controls-status-card">

          <div className="controls-card-top">

            <div className="controls-card-icon auto-icon">

              {autoMode ? (

                <ToggleRight
                  size={25}
                />

              ) : (

                <ToggleLeft
                  size={25}
                />

              )}

            </div>


            <span
              className={
                `controls-status-pill ${
                  autoMode
                    ? "status-active"
                    : "status-inactive"
                }`
              }
            >

              {autoMode
                ? "ENABLED"
                : "DISABLED"}

            </span>

          </div>


          <h3>
            Automatic Mode
          </h3>


          <p>

            {autoMode
              ? "Automatic control is currently enabled."
              : "Manual control mode is currently active."}

          </p>


          <button
            type="button"

            className={
              `controls-toggle-btn ${
                autoMode
                  ? "toggle-on"
                  : ""
              }`
            }

            disabled={
              actionLoading !== ""
            }

            onClick={() =>
              performAction(
                "auto-mode",
                "/api/controls/auto-mode",
                "PUT",
                {
                  enabled:
                    !autoMode,
                }
              )
            }
          >

            {autoMode ? (

              <>
                <ToggleRight
                  size={18}
                />

                Disable Automatic Mode
              </>

            ) : (

              <>
                <ToggleLeft
                  size={18}
                />

                Enable Automatic Mode
              </>

            )}

          </button>

        </div>

      </section>


      {/* =====================================================
          EMERGENCY RESPONSE
          ===================================================== */}

      <section className="controls-emergency-card">

        <div className="controls-emergency-content">

          <div className="controls-emergency-icon">

            <ShieldAlert
              size={25}
            />

          </div>


          <div>

            <span className="controls-section-label">
              Emergency Response
            </span>


            <h2>

              {emergencyActive
                ? "Emergency Shutdown Active"
                : "Emergency Shutdown"}

            </h2>


            <p>

              {emergencyActive
                ? "The simulated valve is closed and the simulated motor is stopped."
                : "Immediately close the simulated valve and stop the simulated motor."}

            </p>

          </div>

        </div>


        <div className="controls-emergency-actions">

          {emergencyActive ? (

            <button
              type="button"

              className="controls-reset-btn"

              disabled={
                actionLoading !== ""
              }

              onClick={() =>
                performAction(
                  "reset-emergency",
                  "/api/controls/reset-emergency",
                  "POST"
                )
              }
            >

              <Activity
                size={17}
              />

              Clear Emergency

            </button>

          ) : (

            <button
              type="button"

              className="controls-emergency-btn"

              disabled={
                actionLoading !== ""
              }

              onClick={
                handleEmergencyShutdown
              }
            >

              <ShieldAlert
                size={17}
              />

              Emergency Stop

            </button>

          )}

        </div>

      </section>


      {/* =====================================================
          LAST CONTROL ACTION
          ===================================================== */}

      <section className="controls-last-action">

        <div className="controls-last-action-icon">

          <Activity
            size={19}
          />

        </div>


        <div>

          <span>
            Last Control Action
          </span>


          <strong>

            {controlState?.last_action ||
              "System initialized"}

          </strong>

        </div>


        <div className="controls-system-state">

          <span
            className={
              `controls-state-dot ${
                emergencyActive
                  ? "critical"
                  : "normal"
              }`
            }
          />

          {emergencyActive
            ? "Emergency Active"
            : "System Ready"}

        </div>

      </section>


    </div>

  );

}


export default Controls;