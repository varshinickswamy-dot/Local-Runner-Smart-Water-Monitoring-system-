import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellRing,
  CheckCheck,
  Languages,
  MapPin,
  Trash2,
  Volume2,
  VolumeX,
  Wifi,
  WifiOff,
} from "lucide-react";

import useAlertCenter from "../AlertCenter/useAlertCenter";
import {
  ALERT_ICONS,
  ALERT_TITLES,
  formatAlertTime,
  severityTone,
} from "../AlertCenter/alertMeta";
import useSensorWebSocket from "../../hooks/useSensorWebSocket";
import useLanguage from "../../i18n/useLanguage";
import { LANGUAGES } from "../../i18n/languages";

import "./TopBar.css";

// =====================================================
// JalRakshak AI - top bar
// Live connection status, language switch, alert sound
// and the notification bell.
// =====================================================

function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className="topbar-language"
      role="group"
      aria-label="Change language"
      title="Change language"
    >
      <Languages size={16} aria-hidden="true" />

      {LANGUAGES.map((option) => (
        <button
          key={option.code}
          type="button"
          lang={option.code}
          data-no-translate
          className={language === option.code ? "active" : ""}
          aria-pressed={language === option.code}
          onClick={() => setLanguage(option.code)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function NotificationPermission() {
  const [permission, setPermission] = useState(() =>
    "Notification" in window ? Notification.permission : "unsupported"
  );

  if (permission !== "default") {
    return null;
  }

  return (
    <button
      type="button"
      className="bell-panel__permission"
      onClick={() =>
        Notification.requestPermission()
          .then(setPermission)
          .catch(() => {})
      }
    >
      <BellRing size={16} />
      <span>
        <strong>Enable desktop notifications</strong>
        <small>Get alerts even when this tab is in the background.</small>
      </span>
    </button>
  );
}

function AlertBell() {
  const { alerts, unreadCount, zoneNames, markAllRead, clearAll } =
    useAlertCenter();
  const [open, setOpen] = useState(false);
  const [, setTick] = useState(0);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Keep "Just now" / times fresh while the panel is open.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const timer = setInterval(() => setTick((tick) => tick + 1), 10000);

    return () => clearInterval(timer);
  }, [open]);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const onPointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
        markAllRead();
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        markAllRead();
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, markAllRead]);

  const toggle = () => {
    // Closing the panel marks everything in it as seen.
    if (open) {
      markAllRead();
    }
    setOpen(!open);
  };

  const goTo = (path) => {
    setOpen(false);
    markAllRead();
    navigate(path);
  };

  return (
    <div className="topbar-bell" ref={containerRef}>
      <button
        type="button"
        className={`topbar-icon-button ${unreadCount ? "has-unread" : ""}`}
        onClick={toggle}
        aria-label="Open live alerts"
        aria-expanded={open}
        title="Live alerts"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="topbar-badge" data-no-translate>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="bell-panel" role="dialog" aria-label="Live alerts">
          <div className="bell-panel__header">
            <strong>Live alerts</strong>

            <div className="bell-panel__actions">
              <button
                type="button"
                onClick={markAllRead}
                title="Mark all as read"
                aria-label="Mark all as read"
              >
                <CheckCheck size={16} />
              </button>
              <button
                type="button"
                onClick={clearAll}
                title="Clear all"
                aria-label="Clear all"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <NotificationPermission />

          {alerts.length === 0 ? (
            <div className="bell-panel__empty">
              <Bell size={28} />
              <strong>No new alerts</strong>
              <span>New alerts will appear here the moment they are detected.</span>
            </div>
          ) : (
            <ul className="bell-panel__list">
              {alerts.map((alert) => {
                const Icon = ALERT_ICONS[alert.type];
                const time = formatAlertTime(alert.receivedAt);

                return (
                  <li key={alert.id}>
                    <button
                      type="button"
                      className={`bell-item bell-item--${severityTone(alert.severity)} ${
                        alert.read ? "" : "unread"
                      }`}
                      onClick={() =>
                        goTo(`/zone-map?zone=${encodeURIComponent(alert.zoneId)}`)
                      }
                    >
                      <span className="bell-item__icon">
                        {Icon && <Icon size={16} />}
                      </span>

                      <span className="bell-item__text">
                        <span className="bell-item__title">
                          <strong>{ALERT_TITLES[alert.type] || "Alert"}</strong>
                          {alert.count > 1 && (
                            <span className="bell-item__count" data-no-translate>
                              ×{alert.count}
                            </span>
                          )}
                        </span>
                        <span>{alert.message}</span>
                        <span className="bell-item__meta">
                          <MapPin size={12} />
                          <span>{zoneNames[alert.zoneId] || alert.zoneId}</span>
                          <span aria-hidden="true">·</span>
                          {time ? (
                            <span data-no-translate>{time}</span>
                          ) : (
                            <span>Just now</span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            className="bell-panel__footer"
            onClick={() => goTo("/alerts")}
          >
            View all alerts
          </button>
        </div>
      )}
    </div>
  );
}

function TopBar() {
  const { connected } = useSensorWebSocket();
  const { soundOn, toggleSound } = useAlertCenter();

  return (
    <header className="topbar">
      <div
        className={`topbar-live ${connected ? "online" : "offline"}`}
        title={connected ? "Live connection active" : "Live connection lost. Reconnecting..."}
      >
        {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
        <span>{connected ? "Live" : "Reconnecting..."}</span>
      </div>

      <div className="topbar-actions">
        <LanguageSwitch />

        <button
          type="button"
          className={`topbar-icon-button ${soundOn ? "" : "muted"}`}
          onClick={toggleSound}
          aria-pressed={soundOn}
          aria-label={soundOn ? "Turn alert sound off" : "Turn alert sound on"}
          title={soundOn ? "Alert sound on" : "Alert sound off"}
        >
          {soundOn ? <Volume2 size={19} /> : <VolumeX size={19} />}
        </button>

        <AlertBell />
      </div>
    </header>
  );
}

export default TopBar;
