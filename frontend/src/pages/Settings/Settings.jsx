import { useEffect, useState } from "react";

import {
  Settings as SettingsIcon,
  Server,
  RefreshCw,
  Bell,
  Database,
  Cpu,
  ShieldCheck,
  Info,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";

import {
  getSettings,
  updateSettings,
  getSystemStatus,
} from "../../services/api";

import "./Settings.css";


function Settings() {

  // =====================================================
  // SETTINGS STATE
  // =====================================================

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState("5");
  const [notifications, setNotifications] = useState(true);


  // =====================================================
  // SYSTEM STATUS STATE
  // =====================================================

  const [systemStatus, setSystemStatus] = useState(null);


  // =====================================================
  // PAGE STATE
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");


  // =====================================================
  // LOAD SETTINGS + SYSTEM STATUS
  // =====================================================

  useEffect(() => {

    const loadSettings = async () => {

      try {

        setLoading(true);
        setError("");

        // -----------------------------------------------
        // Get saved settings
        // -----------------------------------------------

        const settingsResponse = await getSettings();

        if (
          settingsResponse &&
          settingsResponse.success &&
          settingsResponse.data
        ) {

          const settings = settingsResponse.data;

          setAutoRefresh(
            settings.auto_refresh ?? true
          );

          setRefreshInterval(
            String(
              settings.refresh_interval ?? 5
            )
          );

          setNotifications(
            settings.notifications ?? true
          );
        }


        // -----------------------------------------------
        // Get system status
        // -----------------------------------------------

        const statusResponse =
          await getSystemStatus();

        if (
          statusResponse &&
          statusResponse.success &&
          statusResponse.data
        ) {

          setSystemStatus(
            statusResponse.data
          );
        }

      } catch (err) {

        console.error(
          "Settings API Error:",
          err
        );

        setError(
          "Unable to load settings from JalRakshak AI backend."
        );

      } finally {

        setLoading(false);

      }
    };


    loadSettings();

  }, []);


  // =====================================================
  // SAVE SETTINGS
  // =====================================================

  const saveSettings = async (
    newAutoRefresh,
    newRefreshInterval,
    newNotifications
  ) => {

    try {

      setSaving(true);
      setSaveMessage("");
      setError("");

      const response = await updateSettings({
        auto_refresh: newAutoRefresh,
        refresh_interval: Number(
          newRefreshInterval
        ),
        notifications: newNotifications,
      });


      if (
        response &&
        response.success
      ) {

        setSaveMessage(
          "Settings saved successfully."
        );

        // Remove success message after 3 seconds
        setTimeout(() => {
          setSaveMessage("");
        }, 3000);

      } else {

        setError(
          response?.message ||
          "Unable to save settings."
        );
      }

    } catch (err) {

      console.error(
        "Update Settings Error:",
        err
      );

      setError(
        "Unable to save settings to the backend."
      );

    } finally {

      setSaving(false);

    }
  };


  // =====================================================
  // AUTO REFRESH HANDLER
  // =====================================================

  const handleAutoRefreshChange = (event) => {

    const value = event.target.checked;

    setAutoRefresh(value);

    saveSettings(
      value,
      refreshInterval,
      notifications
    );
  };


  // =====================================================
  // REFRESH INTERVAL HANDLER
  // =====================================================

  const handleRefreshIntervalChange = (event) => {

    const value = event.target.value;

    setRefreshInterval(value);

    saveSettings(
      autoRefresh,
      value,
      notifications
    );
  };


  // =====================================================
  // NOTIFICATION HANDLER
  // =====================================================

  const handleNotificationsChange = (event) => {

    const value = event.target.checked;

    setNotifications(value);

    saveSettings(
      autoRefresh,
      refreshInterval,
      value
    );
  };


  // =====================================================
  // STATUS HELPER
  // =====================================================

  const getStatusText = (
    section,
    defaultText
  ) => {

    if (!systemStatus) {
      return defaultText;
    }

    return (
      systemStatus[section]?.status ||
      defaultText
    );
  };


  // =====================================================
  // STATUS MESSAGE HELPER
  // =====================================================

  const getStatusMessage = (
    section,
    defaultText
  ) => {

    if (!systemStatus) {
      return defaultText;
    }

    return (
      systemStatus[section]?.message ||
      defaultText
    );
  };


  // =====================================================
  // LOADING STATE
  // =====================================================

  if (loading) {

    return (
      <div className="settings-page">

        <div className="settings-header">

          <div className="settings-title-section">

            <div className="settings-title-icon">
              <SettingsIcon
                size={34}
                strokeWidth={2.2}
              />
            </div>

            <div className="settings-title-content">

              <p className="settings-eyebrow">
                JALRAKSHAK AI
              </p>

              <h1>Settings</h1>

              <p className="settings-subtitle">
                Loading system settings...
              </p>

            </div>

          </div>

        </div>

      </div>
    );
  }


  // =====================================================
  // MAIN UI
  // =====================================================

  return (
    <div className="settings-page">

      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="settings-header">

        <div className="settings-title-section">

          <div className="settings-title-icon">

            <SettingsIcon
              size={34}
              strokeWidth={2.2}
            />

          </div>

          <div className="settings-title-content">

            <p className="settings-eyebrow">
              JALRAKSHAK AI
            </p>

            <h1>Settings</h1>

            <p className="settings-subtitle">
              Configure system preferences and monitoring options.
            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          SAVE / ERROR MESSAGE
          ===================================================== */}

      {(saveMessage || error || saving) && (

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "18px",
            padding: "12px 16px",
            borderRadius: "10px",
            background: error
              ? "rgba(239, 68, 68, 0.10)"
              : "rgba(34, 197, 94, 0.10)",
            border: error
              ? "1px solid rgba(239, 68, 68, 0.30)"
              : "1px solid rgba(34, 197, 94, 0.30)",
            color: error
              ? "#F87171"
              : "#4ADE80",
            fontSize: "14px",
          }}
        >

          {saving ? (
            <>
              <Save size={16} />
              Saving settings...
            </>
          ) : error ? (
            <>
              <AlertCircle size={16} />
              {error}
            </>
          ) : (
            <>
              <CheckCircle2 size={16} />
              {saveMessage}
            </>
          )}

        </div>

      )}


      {/* =====================================================
          SYSTEM STATUS
          ===================================================== */}

      <section className="settings-section">

        <div className="settings-section-header">

          <div className="settings-section-icon">
            <Server size={20} />
          </div>

          <div>

            <h2>System Status</h2>

            <p>
              Current JalRakshak AI system information.
            </p>

          </div>

        </div>


        <div className="settings-grid">


          {/* BACKEND */}

          <div className="settings-card">

            <div className="settings-card-icon">
              <Server size={21} />
            </div>

            <div className="settings-card-content">

              <span className="settings-label">
                Backend Server
              </span>

              <strong>
                {getStatusText(
                  "backend",
                  "CONNECTED"
                )}
              </strong>

              <div className="settings-status">

                <CheckCircle2 size={15} />

                {systemStatus?.backend?.status ===
                "CONNECTED"
                  ? "Online"
                  : getStatusMessage(
                      "backend",
                      "Backend status"
                    )}

              </div>

            </div>

          </div>


          {/* DATABASE */}

          <div className="settings-card">

            <div className="settings-card-icon">
              <Database size={21} />
            </div>

            <div className="settings-card-content">

              <span className="settings-label">
                Database
              </span>

              <strong>
                MongoDB
              </strong>

              <div className="settings-status">

                <CheckCircle2 size={15} />

                {systemStatus?.database?.status ===
                "CONNECTED"
                  ? "Connected"
                  : getStatusMessage(
                      "database",
                      "Database status"
                    )}

              </div>

            </div>

          </div>


          {/* MONITORING */}

          <div className="settings-card">

            <div className="settings-card-icon">
              <Cpu size={21} />
            </div>

            <div className="settings-card-content">

              <span className="settings-label">
                Monitoring
              </span>

              <strong>
                {getStatusText(
                  "monitoring",
                  "ACTIVE"
                )}
              </strong>

              <div className="settings-status">

                <CheckCircle2 size={15} />

                {getStatusText(
                  "monitoring",
                  "Running"
                )}

              </div>

            </div>

          </div>


          {/* AI DETECTION */}

          <div className="settings-card">

            <div className="settings-card-icon">
              <ShieldCheck size={21} />
            </div>

            <div className="settings-card-content">

              <span className="settings-label">
                AI Detection
              </span>

              <strong>
                {getStatusText(
                  "ai_detection",
                  "ENABLED"
                )}
              </strong>

              <div className="settings-status">

                <CheckCircle2 size={15} />

                {getStatusText(
                  "ai_detection",
                  "Operational"
                )}

              </div>

            </div>

          </div>


        </div>

      </section>


      {/* =====================================================
          MONITORING SETTINGS
          ===================================================== */}

      <section className="settings-section">

        <div className="settings-section-header">

          <div className="settings-section-icon">
            <RefreshCw size={20} />
          </div>

          <div>

            <h2>Monitoring Settings</h2>

            <p>
              Control dashboard data refresh behaviour.
            </p>

          </div>

        </div>


        <div className="settings-panel">


          {/* AUTO REFRESH */}

          <div className="setting-row">

            <div className="setting-info">

              <div className="setting-name">
                Auto Refresh
              </div>

              <div className="setting-description">
                Automatically refresh monitoring data.
              </div>

            </div>


            <label className="toggle">

              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={
                  handleAutoRefreshChange
                }
              />

              <span className="toggle-slider"></span>

            </label>

          </div>


          <div className="setting-divider"></div>


          {/* REFRESH INTERVAL */}

          <div className="setting-row">

            <div className="setting-info">

              <div className="setting-name">
                Refresh Interval
              </div>

              <div className="setting-description">
                Time interval used for dashboard updates.
              </div>

            </div>


            <select
              className="settings-select"
              value={refreshInterval}
              onChange={
                handleRefreshIntervalChange
              }
              disabled={!autoRefresh}
            >

              <option value="5">
                5 seconds
              </option>

              <option value="10">
                10 seconds
              </option>

              <option value="15">
                15 seconds
              </option>

              <option value="30">
                30 seconds
              </option>

              <option value="60">
                60 seconds
              </option>

            </select>

          </div>

        </div>

      </section>


      {/* =====================================================
          NOTIFICATION SETTINGS
          ===================================================== */}

      <section className="settings-section">

        <div className="settings-section-header">

          <div className="settings-section-icon">
            <Bell size={20} />
          </div>

          <div>

            <h2>Notifications</h2>

            <p>
              Configure water monitoring alerts.
            </p>

          </div>

        </div>


        <div className="settings-panel">

          <div className="setting-row">

            <div className="setting-info">

              <div className="setting-name">
                Alert Notifications
              </div>

              <div className="setting-description">
                Enable notifications for critical monitoring events.
              </div>

            </div>


            <label className="toggle">

              <input
                type="checkbox"
                checked={notifications}
                onChange={
                  handleNotificationsChange
                }
              />

              <span className="toggle-slider"></span>

            </label>

          </div>

        </div>

      </section>


      {/* =====================================================
          SENSOR THRESHOLDS
          ===================================================== */}

      <section className="settings-section">

        <div className="settings-section-header">

          <div className="settings-section-icon">
            <Info size={20} />
          </div>

          <div>

            <h2>Sensor Thresholds</h2>

            <p>
              Current detection limits used by the system.
            </p>

          </div>

        </div>


        <div className="threshold-grid">


          <div className="threshold-card">

            <span>Pressure</span>

            <strong>
              &lt; 0.5 bar
            </strong>

            <small>
              Critical leakage condition
            </small>

          </div>


          <div className="threshold-card">

            <span>Flow Rate</span>

            <strong>
              &gt; 30 L/min
            </strong>

            <small>
              Major abnormal flow
            </small>

          </div>


          <div className="threshold-card">

            <span>pH Level</span>

            <strong>
              6.5 – 8.5
            </strong>

            <small>
              Normal water quality range
            </small>

          </div>


          <div className="threshold-card">

            <span>Turbidity</span>

            <strong>
              &le; 5 NTU
            </strong>

            <small>
              Normal water quality limit
            </small>

          </div>


          <div className="threshold-card">

            <span>TDS</span>

            <strong>
              &ge; 0 ppm
            </strong>

            <small>
              Valid sensor reading
            </small>

          </div>


          <div className="threshold-card">

            <span>Theft Detection</span>

            <strong>
              &gt; 20 L/min
            </strong>

            <small>
              Possible unauthorized usage
            </small>

          </div>


        </div>

      </section>


      {/* =====================================================
          SYSTEM INFORMATION
          ===================================================== */}

      <section className="settings-section">

        <div className="settings-section-header">

          <div className="settings-section-icon">
            <Info size={20} />
          </div>

          <div>

            <h2>System Information</h2>

            <p>
              JalRakshak AI project information.
            </p>

          </div>

        </div>


        <div className="system-info-panel">

          <div className="system-info-row">

            <span>Application</span>

            <strong>
              JalRakshak AI
            </strong>

          </div>


          <div className="system-info-row">

            <span>Project</span>

            <strong>
              Smart Water Monitoring System
            </strong>

          </div>


          <div className="system-info-row">

            <span>Backend</span>

            <strong>
              FastAPI
            </strong>

          </div>


          <div className="system-info-row">

            <span>Database</span>

            <strong>
              MongoDB
            </strong>

          </div>


          <div className="system-info-row">

            <span>Frontend</span>

            <strong>
              React + Vite
            </strong>

          </div>


          <div className="system-info-row">

            <span>AI Model</span>

            <strong>
              Isolation Forest
            </strong>

          </div>

        </div>

      </section>


    </div>
  );
}


export default Settings;