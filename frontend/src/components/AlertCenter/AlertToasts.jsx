import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, X } from "lucide-react";

import useAlertCenter from "./useAlertCenter";
import { ALERT_ICONS, ALERT_TITLES, severityTone } from "./alertMeta";

import "./AlertCenter.css";

// Critical alerts stay longer so they are not missed.
const DISPLAY_MS = { critical: 12000, warning: 7000 };

function AlertToast({ alert, zoneName, onDismiss, onViewMap }) {
  const tone = severityTone(alert.severity);
  const Icon = ALERT_ICONS[alert.type];
  const [paused, setPaused] = useState(false);
  const remainingRef = useRef(DISPLAY_MS[tone]);

  // Auto-dismiss, paused while the pointer is over the toast.
  useEffect(() => {
    if (paused) {
      return undefined;
    }

    const startedAt = Date.now();
    const timer = setTimeout(onDismiss, remainingRef.current);

    return () => {
      clearTimeout(timer);
      remainingRef.current -= Date.now() - startedAt;
    };
  }, [paused, onDismiss]);

  return (
    <div
      className={`alert-toast alert-toast--${tone}`}
      role={tone === "critical" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="alert-toast__icon">
        {Icon && <Icon size={20} />}
      </div>

      <div className="alert-toast__body">
        <div className="alert-toast__title">
          <strong>{ALERT_TITLES[alert.type] || "Alert"}</strong>
          <span className="alert-toast__zone">{zoneName}</span>
        </div>

        <p>{alert.message}</p>

        <button
          type="button"
          className="alert-toast__action"
          onClick={onViewMap}
        >
          <MapPin size={14} />
          <span>View on map</span>
        </button>
      </div>

      <button
        type="button"
        className="alert-toast__close"
        onClick={onDismiss}
        aria-label="Dismiss alert"
        title="Dismiss"
      >
        <X size={16} />
      </button>

      <div
        className="alert-toast__timer"
        style={{
          animationDuration: `${DISPLAY_MS[tone]}ms`,
          animationPlayState: paused ? "paused" : "running",
        }}
      />
    </div>
  );
}

function AlertToasts() {
  const { toasts, dismissToast, zoneNames } = useAlertCenter();
  const navigate = useNavigate();

  return (
    <div className="alert-toasts" aria-live="polite">
      {toasts.map((alert) => (
        <AlertToast
          key={alert.id}
          alert={alert}
          zoneName={zoneNames[alert.zoneId] || alert.zoneId}
          onDismiss={() => dismissToast(alert.id)}
          onViewMap={() => {
            dismissToast(alert.id);
            navigate(`/zone-map?zone=${encodeURIComponent(alert.zoneId)}`);
          }}
        />
      ))}
    </div>
  );
}

export default AlertToasts;
