import { useEffect, useRef, useState } from "react";

import {
  AlertTriangle,
  ShieldAlert,
  Droplets,
  Activity,
  Clock3,
  MapPin,
  Cpu,
  RefreshCw,
  CheckCircle2,
  Filter,
  XCircle,
} from "lucide-react";

import { getAlerts, getSettings } from "../../services/api";

import useMonitoringSettings from "../../hooks/useMonitoringSettings";

import "./Alerts.css";

// =====================================================
// JalRakshak AI
// Alerts Page
// =====================================================

function Alerts() {
  const [alerts, setAlerts] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  // =====================================================
  // NOTIFICATION SETTINGS
  // =====================================================

  const [notificationsEnabled, setNotificationsEnabled] =
    useState(true);

  const knownAlertIdsRef = useRef(new Set());

  const notificationsInitializedRef = useRef(false);

  // =====================================================
  // MONITORING SETTINGS
  // =====================================================

  const {
    autoRefresh,
    refreshInterval,
  } = useMonitoringSettings();

  // =====================================================
  // FILTERS
  // =====================================================

  const [severityFilter, setSeverityFilter] =
    useState("ALL");

  const [typeFilter, setTypeFilter] =
    useState("ALL");

  // =====================================================
  // ALERT TYPE
  // =====================================================

  function getAlertType(alert) {
    return String(
      alert?.type ||
        alert?.alert_type ||
        alert?.category ||
        "SYSTEM"
    ).toUpperCase();
  }

  // =====================================================
  // ALERT LEVEL
  // =====================================================

  function getAlertLevel(alert) {
    return String(
      alert?.level ||
        alert?.severity ||
        alert?.status ||
        "WARNING"
    ).toUpperCase();
  }

  // =====================================================
  // NORMALIZED ALERT TYPE
  // =====================================================

  function getNormalizedType(alert) {
    const type = getAlertType(alert);

    if (type.includes("LEAK")) {
      return "LEAKAGE";
    }

    if (type.includes("THEFT")) {
      return "THEFT";
    }

    if (
      type.includes("QUALITY") ||
      type.includes("WATER")
    ) {
      return "WATER QUALITY";
    }

    return "SYSTEM";
  }

  // =====================================================
  // ALERT ICON
  // =====================================================

  function getAlertIcon(type) {
    if (type.includes("LEAK")) {
      return <Droplets size={20} />;
    }

    if (type.includes("THEFT")) {
      return <ShieldAlert size={20} />;
    }

    if (
      type.includes("QUALITY") ||
      type.includes("WATER")
    ) {
      return <Activity size={20} />;
    }

    return <AlertTriangle size={20} />;
  }

  // =====================================================
  // ALERT CLASS
  // =====================================================

  function getAlertClass(level) {
    if (
      level === "CRITICAL" ||
      level === "MAJOR"
    ) {
      return "alert-critical";
    }

    if (
      level === "WARNING" ||
      level === "MODERATE" ||
      level === "MINOR"
    ) {
      return "alert-warning";
    }

    return "alert-info";
  }

  // =====================================================
  // BROWSER NOTIFICATION HELPERS
  // =====================================================

  function getAlertIdentity(alert, index = 0) {
    return String(
      alert?._id ||
        alert?.id ||
        `${
          alert?.timestamp ||
          alert?.created_at ||
          "alert"
        }-${
          alert?.type ||
          alert?.alert_type ||
          "SYSTEM"
        }-${
          alert?.message ||
          alert?.reason ||
          index
        }`
    );
  }

  function showBrowserNotification(alert) {
    if (
      !notificationsEnabled ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "granted"
    ) {
      return;
    }

    const level = getAlertLevel(alert);

    const type = getNormalizedType(alert);

    const device =
      alert?.device_id ||
      "JAL-ESP32-001";

    const zone =
      alert?.zone_id ||
      "ZONE-03";

    const message =
      alert?.message ||
      alert?.reason ||
      "JalRakshak AI detected an abnormal condition.";

    try {
      new Notification(
        `JalRakshak AI • ${level}`,
        {
          body: `${type} — ${message} | ${device} | ${zone}`,
          tag: `jalrakshak-${getAlertIdentity(
            alert
          )}`,
        }
      );
    } catch (notificationError) {
      console.error(
        "JalRakshak AI Browser Notification Error:",
        notificationError
      );
    }
  }

  function processAlertNotifications(nextAlerts) {
    const currentIds = new Set(
      nextAlerts.map((alert, index) =>
        getAlertIdentity(alert, index)
      )
    );

    // Establish the initial baseline without
    // notifying for old alerts.
    if (
      !notificationsInitializedRef.current
    ) {
      knownAlertIdsRef.current = currentIds;

      notificationsInitializedRef.current = true;

      return;
    }

    if (notificationsEnabled) {
      nextAlerts.forEach((alert, index) => {
        const alertId =
          getAlertIdentity(alert, index);

        const level =
          getAlertLevel(alert);

        if (
          !knownAlertIdsRef.current.has(
            alertId
          ) &&
          [
            "CRITICAL",
            "MAJOR",
            "WARNING",
            "MODERATE",
            "MINOR",
          ].includes(level)
        ) {
          showBrowserNotification(alert);
        }
      });
    }

    knownAlertIdsRef.current = currentIds;
  }

  // =====================================================
  // LOAD NOTIFICATION SETTING
  // =====================================================

  useEffect(() => {
    let isMounted = true;

    const loadNotificationSetting =
      async () => {
        try {
          const response =
            await getSettings();

          if (
            isMounted &&
            response?.success &&
            response?.data
          ) {
            setNotificationsEnabled(
              response.data.notifications ??
                true
            );
          }
        } catch (err) {
          console.error(
            "JalRakshak AI Notification Settings Error:",
            err
          );
        }
      };

    loadNotificationSetting();

    return () => {
      isMounted = false;
    };
  }, []);

  // =====================================================
  // LOAD ALERTS
  // =====================================================

  useEffect(() => {
    let isMounted = true;

    const loadAlerts = async () => {
      try {
        if (!isMounted) {
          return;
        }

        const response =
          await getAlerts();

        if (!isMounted) {
          return;
        }

        if (
          response?.success &&
          Array.isArray(response.data)
        ) {
          processAlertNotifications(
            response.data
          );

          setAlerts(response.data);

          setError("");
        } else {
          setAlerts([]);
        }
      } catch (err) {
        console.error(
          "JalRakshak AI Alerts API Error:",
          err
        );

        if (!isMounted) {
          return;
        }

        setError(
          "Unable to load alerts from JalRakshak AI backend."
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

    loadAlerts();

    // =====================================================
    // AUTO REFRESH
    // Controlled by Settings page
    // =====================================================

    let refreshTimer = null;

    if (autoRefresh) {
      refreshTimer = setInterval(
        loadAlerts,
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
    notificationsEnabled,
  ]);

  // =====================================================
  // BROWSER NOTIFICATION PERMISSION
  // =====================================================

  useEffect(() => {
    if (
      !notificationsEnabled ||
      typeof window === "undefined" ||
      !("Notification" in window) ||
      Notification.permission !== "default"
    ) {
      return;
    }

    Notification.requestPermission().catch(
      (err) => {
        console.error(
          "JalRakshak AI Notification Permission Error:",
          err
        );
      }
    );
  }, [notificationsEnabled]);

  // =====================================================
  // MANUAL REFRESH
  // =====================================================

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      setError("");

      const response =
        await getAlerts();

      if (
        response?.success &&
        Array.isArray(response.data)
      ) {
        processAlertNotifications(
          response.data
        );

        setAlerts(response.data);
      }
    } catch (err) {
      console.error(
        "Alerts Refresh Error:",
        err
      );

      setError(
        "Unable to refresh alerts."
      );
    } finally {
      setRefreshing(false);
    }
  };

  // =====================================================
  // FORMAT DATE — IST
  // =====================================================

  const formatDate = (dateValue) => {
    if (!dateValue) {
      return "Time unavailable";
    }

    const date = new Date(dateValue);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "Time unavailable";
    }

    return date.toLocaleString(
      "en-IN",
      {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }
    );
  };

  // =====================================================
  // FILTERED ALERTS
  // =====================================================

  const filteredAlerts = alerts.filter(
    (alert) => {
      const level =
        getAlertLevel(alert);

      const type =
        getNormalizedType(alert);

      // ===================================================
      // SEVERITY FILTER
      // ===================================================

      const severityMatches =
        severityFilter === "ALL" ||
        (
          severityFilter === "CRITICAL" &&
          (
            level === "CRITICAL" ||
            level === "MAJOR"
          )
        ) ||
        (
          severityFilter === "WARNING" &&
          (
            level === "WARNING" ||
            level === "MODERATE" ||
            level === "MINOR"
          )
        );

      // ===================================================
      // TYPE FILTER
      // ===================================================

      const typeMatches =
        typeFilter === "ALL" ||
        type === typeFilter;

      return (
        severityMatches &&
        typeMatches
      );
    }
  );

  // =====================================================
  // SUMMARY
  // =====================================================

  const totalAlerts =
    alerts.length;

  const leakageAlerts =
    alerts.filter(
      (alert) =>
        getAlertType(alert)
          .includes("LEAK")
    ).length;

  const theftAlerts =
    alerts.filter(
      (alert) =>
        getAlertType(alert)
          .includes("THEFT")
    ).length;

  const criticalAlerts =
    alerts.filter(
      (alert) => {
        const level =
          getAlertLevel(alert);

        return (
          level === "CRITICAL" ||
          level === "MAJOR"
        );
      }
    ).length;

  const warningAlerts =
    alerts.filter(
      (alert) => {
        const level =
          getAlertLevel(alert);

        return (
          level === "WARNING" ||
          level === "MODERATE" ||
          level === "MINOR"
        );
      }
    ).length;

  // =====================================================
  // CLEAR FILTERS
  // =====================================================

  const clearFilters = () => {
    setSeverityFilter("ALL");
    setTypeFilter("ALL");
  };

  const filtersActive =
    severityFilter !== "ALL" ||
    typeFilter !== "ALL";

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <div className="alerts-page">

        <div className="alerts-loading">

          <RefreshCw
            size={26}
            className="loading-spin"
          />

          <span>
            Loading alerts...
          </span>

        </div>

      </div>
    );
  }

  // =====================================================
  // MAIN PAGE
  // =====================================================

  return (
    <div className="alerts-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="alerts-header">

        <div className="alerts-title-section">

          <div className="alerts-title-icon">

            <AlertTriangle
              size={34}
              strokeWidth={2.2}
            />

          </div>

          <div className="alerts-title-content">

            <p className="alerts-eyebrow">
              JALRAKSHAK AI
            </p>

            <h1>
              Alerts
            </h1>

            <p className="alerts-subtitle">
              Monitor leakage, theft and water
              quality alerts.
            </p>

          </div>

        </div>

        {/* REFRESH */}

        <button
          type="button"
          className="alerts-refresh-button"
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
          AUTO REFRESH STATUS
      ================================================= */}

      <div
        className={
          `alerts-refresh-info ${
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

        <div className="alerts-error">

          <AlertTriangle size={18} />

          <span>
            {error}
          </span>

        </div>

      )}

      {/* =================================================
          ALERT SUMMARY
      ================================================= */}

      <div className="alerts-summary-grid">

        {/* TOTAL */}

        <div className="alert-summary-card">

          <div className="alert-summary-icon">

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

        {/* LEAKAGE */}

        <div className="alert-summary-card">

          <div className="alert-summary-icon">

            <Droplets size={21} />

          </div>

          <div>

            <span>
              Leakage
            </span>

            <strong>
              {leakageAlerts}
            </strong>

          </div>

        </div>

        {/* THEFT */}

        <div className="alert-summary-card">

          <div className="alert-summary-icon">

            <ShieldAlert size={21} />

          </div>

          <div>

            <span>
              Theft
            </span>

            <strong>
              {theftAlerts}
            </strong>

          </div>

        </div>

        {/* CRITICAL */}

        <div className="alert-summary-card">

          <div className="alert-summary-icon">

            <AlertTriangle size={21} />

          </div>

          <div>

            <span>
              Critical
            </span>

            <strong>
              {criticalAlerts}
            </strong>

          </div>

        </div>

        {/* WARNING */}

        <div className="alert-summary-card">

          <div className="alert-summary-icon">

            <Activity size={21} />

          </div>

          <div>

            <span>
              Warning
            </span>

            <strong>
              {warningAlerts}
            </strong>

          </div>

        </div>

      </div>

      {/* =================================================
          FILTER BAR
      ================================================= */}

      <div className="alerts-filter-panel">

        <div className="alerts-filter-heading">

          <Filter size={17} />

          <span>
            Filter Alerts
          </span>

        </div>

        {/* SEVERITY */}

        <div className="alerts-filter-group">

          <label>
            Severity
          </label>

          <select
            value={severityFilter}
            onChange={(e) =>
              setSeverityFilter(
                e.target.value
              )
            }
          >

            <option value="ALL">
              All Severities
            </option>

            <option value="CRITICAL">
              Critical
            </option>

            <option value="WARNING">
              Warning
            </option>

          </select>

        </div>

        {/* TYPE */}

        <div className="alerts-filter-group">

          <label>
            Type
          </label>

          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(
                e.target.value
              )
            }
          >

            <option value="ALL">
              All Types
            </option>

            <option value="LEAKAGE">
              Leakage
            </option>

            <option value="THEFT">
              Theft
            </option>

            <option value="WATER QUALITY">
              Water Quality
            </option>

            <option value="SYSTEM">
              System
            </option>

          </select>

        </div>

        {/* RESULT COUNT */}

        <div className="alerts-filter-result">

          <span>
            Showing
          </span>

          <strong>
            {filteredAlerts.length}
          </strong>

          <span>
            of {totalAlerts}
          </span>

        </div>

        {/* CLEAR */}

        {filtersActive && (

          <button
            type="button"
            className="alerts-clear-button"
            onClick={clearFilters}
          >

            <XCircle size={15} />

            Clear

          </button>

        )}

      </div>

      {/* =================================================
          ALERT LIST
      ================================================= */}

      {filteredAlerts.length === 0 ? (

        <div className="alerts-empty">

          <div className="alerts-empty-icon">

            {alerts.length === 0 ? (
              <CheckCircle2 size={30} />
            ) : (
              <Filter size={30} />
            )}

          </div>

          <h3>

            {alerts.length === 0
              ? "No alerts detected"
              : "No matching alerts"}

          </h3>

          <p>

            {alerts.length === 0
              ? "JalRakshak AI has not detected any active alerts."
              : "Try changing the selected filters to view other alerts."}

          </p>

          {alerts.length > 0 &&
            filtersActive && (

              <button
                type="button"
                className="alerts-empty-button"
                onClick={clearFilters}
              >
                Clear Filters
              </button>

            )}

        </div>

      ) : (

        <div className="alerts-list">

          {filteredAlerts.map(
            (alert, index) => {

              const type =
                getAlertType(alert);

              const level =
                getAlertLevel(alert);

              const alertClass =
                getAlertClass(level);

              return (

                <div
                  className={
                    `alert-item ${alertClass}`
                  }

                  key={
                    alert?._id ||
                    alert?.id ||
                    getAlertIdentity(
                      alert,
                      index
                    )
                  }
                >

                  {/* =====================================
                      ICON
                  ===================================== */}

                  <div className="alert-icon">

                    {getAlertIcon(type)}

                  </div>

                  {/* =====================================
                      CONTENT
                  ===================================== */}

                  <div className="alert-content">

                    <div className="alert-title-row">

                      <div className="alert-title-group">

                        <h3>
                          {type.replace(
                            /_/g,
                            " "
                          )}
                        </h3>

                        <span className="alert-type-badge">

                          {getNormalizedType(
                            alert
                          )}

                        </span>

                      </div>

                      <span className="alert-level">

                        {level}

                      </span>

                    </div>

                    {/* MESSAGE */}

                    <p>

                      {alert?.message ||
                        alert?.reason ||
                        "JalRakshak AI detected an abnormal condition."}

                    </p>

                    {/* META */}

                    <div className="alert-meta">

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
  );
}

export default Alerts;