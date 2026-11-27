import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  History as HistoryIcon,
  RefreshCw,
  User,
  XCircle,
  Filter,
  RotateCcw,
} from "lucide-react";

import "./ControlHistory.css";

import { API_BASE_URL } from "../../config";

function ControlHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [actionFilter, setActionFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // --------------------------------------------------
  // FORMAT IST
  // --------------------------------------------------

  const formatIST = (timestamp) => {
    if (!timestamp) return "—";

    try {
      return new Date(timestamp).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "—";
    }
  };

  // --------------------------------------------------
  // LOAD HISTORY
  // --------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadHistory = async () => {
      const token = localStorage.getItem("jalrakshak_access_token");

      if (!token) {
        if (!cancelled) {
          setError("Authentication token not found.");
          setLoading(false);
        }
        return;
      }

      try {
        if (refreshKey > 0) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await fetch(
          `${API_BASE_URL}/api/controls/history?limit=100`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Session expired. Please login again.");
          }

          throw new Error("Unable to load control history.");
        }

        const result = await response.json();

        if (!cancelled) {
          setHistory(Array.isArray(result.data) ? result.data : []);
        }
      } catch (err) {
        console.error("Control History Error:", err);

        if (!cancelled) {
          setError(
            err.message || "Unable to load control history."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    loadHistory();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  // --------------------------------------------------
  // REFRESH
  // --------------------------------------------------

  const handleRefresh = () => {
    setRefreshKey((current) => current + 1);
  };

  // --------------------------------------------------
  // RESET FILTERS
  // --------------------------------------------------

  const resetFilters = () => {
    setActionFilter("ALL");
    setUserFilter("ALL");
    setStatusFilter("ALL");
  };

  // --------------------------------------------------
  // ACTION LABELS
  // --------------------------------------------------

  const getActionLabel = (action) => {
    const labels = {
      VALVE_OPEN: "Valve Opened",
      VALVE_CLOSE: "Valve Closed",

      MOTOR_START: "Motor Started",
      MOTOR_STOP: "Motor Stopped",

      AUTO_MODE_ENABLE: "Automatic Mode Enabled",
      AUTO_MODE_DISABLE: "Automatic Mode Disabled",

      EMERGENCY_STOP: "Emergency Shutdown",
      EMERGENCY_RESET: "Emergency Reset",
    };

    return labels[action] || action || "Unknown Action";
  };

  // --------------------------------------------------
  // ACTION CLASS
  // --------------------------------------------------

  const getActionClass = (action) => {
    if (!action) {
      return "control-action-default";
    }

    if (action === "EMERGENCY_STOP") {
      return "control-action-critical";
    }

    if (
      action.includes("OPEN") ||
      action.includes("START") ||
      action.includes("ENABLE")
    ) {
      return "control-action-positive";
    }

    if (
      action.includes("CLOSE") ||
      action.includes("STOP") ||
      action.includes("DISABLE")
    ) {
      return "control-action-warning";
    }

    if (action.includes("RESET")) {
      return "control-action-reset";
    }

    return "control-action-default";
  };

  // --------------------------------------------------
  // TARGET LABELS
  // --------------------------------------------------

  const getTargetLabel = (target) => {
    const targets = {
      SMART_VALVE: "Smart Valve",
      WATER_MOTOR: "Water Motor",
      AUTOMATIC_MODE: "Automatic Mode",
      SYSTEM: "System",
    };

    return targets[target] || target || "—";
  };

  // --------------------------------------------------
  // STATUS CLASS
  // --------------------------------------------------

  const getStatusClass = (status) => {
    return status === "SUCCESS"
      ? "control-history-success"
      : "control-history-failed";
  };

  // --------------------------------------------------
  // UNIQUE USERS
  // --------------------------------------------------

  const users = useMemo(() => {
    const uniqueUsers = history
      .map((item) => item.username)
      .filter(Boolean);

    return [...new Set(uniqueUsers)].sort();
  }, [history]);

  // --------------------------------------------------
  // FILTERED HISTORY
  // --------------------------------------------------

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const matchesAction =
        actionFilter === "ALL" ||
        item.action === actionFilter;

      const matchesUser =
        userFilter === "ALL" ||
        item.username === userFilter;

      const matchesStatus =
        statusFilter === "ALL" ||
        item.status === statusFilter;

      return (
        matchesAction &&
        matchesUser &&
        matchesStatus
      );
    });
  }, [
    history,
    actionFilter,
    userFilter,
    statusFilter,
  ]);

  // --------------------------------------------------
  // SUMMARY COUNTS
  // --------------------------------------------------

  const successfulCount = history.filter(
    (item) => item.status === "SUCCESS"
  ).length;

  const activeFilterCount = [
    actionFilter !== "ALL",
    userFilter !== "ALL",
    statusFilter !== "ALL",
  ].filter(Boolean).length;

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <div className="control-history-page">
        <div className="control-history-loading">
          <RefreshCw
            size={22}
            className="control-history-spin"
          />
          <span>Loading control history...</span>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <div className="control-history-page">

      {/* HEADER */}
      <div className="control-history-header">

        <div className="control-history-title-icon">
          <HistoryIcon size={42} />
        </div>

        <div className="control-history-title-area">
          <span className="control-history-brand">
            JALRAKSHAK AI
          </span>

          <h1>Control History</h1>

          <p>
            View the history of actions performed on smart
            water control systems.
          </p>
        </div>

        <button
          type="button"
          className="control-history-refresh-btn"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            size={19}
            className={
              refreshing
                ? "control-history-spin"
                : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="control-history-error">
          <XCircle size={19} />

          <span>{error}</span>

          <button
            type="button"
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      )}

      {/* SUMMARY */}
      <section className="control-history-summary">

        <div className="control-history-summary-card">
          <div className="control-history-summary-icon">
            <Activity size={20} />
          </div>

          <div>
            <span>Total Actions</span>
            <strong>{history.length}</strong>
          </div>
        </div>

        <div className="control-history-summary-card">
          <div className="control-history-summary-icon success">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Successful</span>
            <strong>{successfulCount}</strong>
          </div>
        </div>

        <div className="control-history-summary-card">
          <div className="control-history-summary-icon">
            <User size={20} />
          </div>

          <div>
            <span>Users</span>
            <strong>{users.length}</strong>
          </div>
        </div>

        <div className="control-history-summary-card">
          <div className="control-history-summary-icon">
            <Clock3 size={20} />
          </div>

          <div>
            <span>Latest Action</span>

            <strong>
              {history.length > 0
                ? formatIST(history[0].timestamp)
                : "—"}
            </strong>
          </div>
        </div>

      </section>

      {/* HISTORY PANEL */}
      <section className="control-history-panel">

        {/* PANEL HEADER */}
        <div className="control-history-panel-header">

          <div>
            <span className="control-history-section-label">
              ACTIVITY LOG
            </span>

            <h2>Control Actions</h2>

            <p>
              Every successful control operation is
              recorded with user and state information.
            </p>
          </div>

          <span className="control-history-count">
            {filteredHistory.length} Records
          </span>

        </div>

        {/* FILTER BAR */}
        <div className="control-history-filters">

          <div className="control-history-filter-title">
            <Filter size={18} />
            <span>Filters</span>

            {activeFilterCount > 0 && (
              <span className="control-history-filter-count">
                {activeFilterCount}
              </span>
            )}
          </div>

          {/* ACTION FILTER */}
          <div className="control-history-filter-group">

            <label htmlFor="action-filter">
              Action
            </label>

            <select
              id="action-filter"
              value={actionFilter}
              onChange={(event) =>
                setActionFilter(event.target.value)
              }
            >
              <option value="ALL">
                All Actions
              </option>

              <option value="VALVE_OPEN">
                Valve Opened
              </option>

              <option value="VALVE_CLOSE">
                Valve Closed
              </option>

              <option value="MOTOR_START">
                Motor Started
              </option>

              <option value="MOTOR_STOP">
                Motor Stopped
              </option>

              <option value="AUTO_MODE_ENABLE">
                Automatic Mode Enabled
              </option>

              <option value="AUTO_MODE_DISABLE">
                Automatic Mode Disabled
              </option>

              <option value="EMERGENCY_STOP">
                Emergency Shutdown
              </option>

              <option value="EMERGENCY_RESET">
                Emergency Reset
              </option>
            </select>

          </div>

          {/* USER FILTER */}
          <div className="control-history-filter-group">

            <label htmlFor="user-filter">
              User
            </label>

            <select
              id="user-filter"
              value={userFilter}
              onChange={(event) =>
                setUserFilter(event.target.value)
              }
            >
              <option value="ALL">
                All Users
              </option>

              {users.map((username) => (
                <option
                  key={username}
                  value={username}
                >
                  {username}
                </option>
              ))}
            </select>

          </div>

          {/* STATUS FILTER */}
          <div className="control-history-filter-group">

            <label htmlFor="status-filter">
              Status
            </label>

            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value)
              }
            >
              <option value="ALL">
                All Status
              </option>

              <option value="SUCCESS">
                Successful
              </option>

              <option value="FAILED">
                Failed
              </option>
            </select>

          </div>

          {/* RESET */}
          <button
            type="button"
            className="control-history-reset-btn"
            onClick={resetFilters}
            disabled={activeFilterCount === 0}
          >
            <RotateCcw size={16} />
            Reset
          </button>

        </div>

        {/* FILTER RESULT MESSAGE */}
        {activeFilterCount > 0 && (
          <div className="control-history-filter-result">

            <span>
              Showing{" "}
              <strong>
                {filteredHistory.length}
              </strong>{" "}
              of{" "}
              <strong>
                {history.length}
              </strong>{" "}
              records
            </span>

            <button
              type="button"
              onClick={resetFilters}
            >
              Clear filters
            </button>

          </div>
        )}

        {/* EMPTY */}
        {filteredHistory.length === 0 ? (

          <div className="control-history-empty">

            <HistoryIcon size={38} />

            <h3>
              {history.length === 0
                ? "No Control Actions Yet"
                : "No Matching Records"}
            </h3>

            <p>
              {history.length === 0
                ? "Control actions performed from the Controls page will appear here."
                : "Try changing the selected filters to view other control actions."}
            </p>

            {history.length > 0 &&
              activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                >
                  Clear Filters
                </button>
              )}

          </div>

        ) : (

          /* TABLE */
          <div className="control-history-table-wrapper">

            <table className="control-history-table">

              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Target</th>
                  <th>State Change</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {filteredHistory.map((item) => (

                  <tr key={item.id}>

                    {/* DATE */}
                    <td>
                      <div className="control-history-time">

                        <Clock3 size={15} />

                        <span>
                          {formatIST(
                            item.timestamp
                          )}
                        </span>

                      </div>
                    </td>

                    {/* USER */}
                    <td>

                      <div className="control-history-user">

                        <div className="control-history-user-icon">
                          <User size={15} />
                        </div>

                        <div>

                          <strong>
                            {item.full_name ||
                              item.username ||
                              "Unknown"}
                          </strong>

                          <span>
                            @{item.username ||
                              "unknown"}
                          </span>

                        </div>

                      </div>

                    </td>

                    {/* ACTION */}
                    <td>

                      <span
                        className={`control-history-action ${getActionClass(
                          item.action
                        )}`}
                      >
                        {getActionLabel(
                          item.action
                        )}
                      </span>

                    </td>

                    {/* TARGET */}
                    <td>

                      <span className="control-history-target">
                        {getTargetLabel(
                          item.target
                        )}
                      </span>

                    </td>

                    {/* STATE CHANGE */}
                    <td>

                      <div className="control-history-state-change">

                        <span className="control-history-old-state">
                          {item.previous_state ||
                            "—"}
                        </span>

                        <span className="control-history-arrow">
                          →
                        </span>

                        <span className="control-history-new-state">
                          {item.new_state ||
                            "—"}
                        </span>

                      </div>

                    </td>

                    {/* STATUS */}
                    <td>

                      <span
                        className={`control-history-status ${getStatusClass(
                          item.status
                        )}`}
                      >

                        {item.status ===
                        "SUCCESS" ? (
                          <CheckCircle2
                            size={14}
                          />
                        ) : (
                          <XCircle
                            size={14}
                          />
                        )}

                        {item.status ||
                          "UNKNOWN"}

                      </span>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}

export default ControlHistory;