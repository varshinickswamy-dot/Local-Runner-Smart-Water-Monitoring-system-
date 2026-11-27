import { useCallback, useEffect, useRef, useState } from "react";

import AlertCenterContext from "./AlertCenterContext";
import useSensorWebSocket from "../../hooks/useSensorWebSocket";
import useLanguage from "../../i18n/useLanguage";
import API from "../../services/api";
import { playAlertSound, unlockAlertSound } from "./alertSound";
import { ALERT_TITLES } from "./alertMeta";

// =====================================================
// JalRakshak AI - instant alerts
// =====================================================
//
// Listens to every real-time sensor update and turns new
// alerts into pop-up toasts, a sound, the notification bell
// list and (when the tab is hidden) a desktop notification.

// The same problem in the same zone is grouped instead of
// popping up again for this long.
const REPEAT_WINDOW_MS = 60 * 1000;

const MAX_HISTORY = 30;
const MAX_TOASTS = 4;

const SOUND_KEY = "jalrakshak_alert_sound";

function readSoundSetting() {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function AlertCenterProvider({ children }) {
  const { subscribe } = useSensorWebSocket();
  const { t } = useLanguage();

  const [alerts, setAlerts] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [soundOn, setSoundOn] = useState(readSoundSetting);
  const [zoneNames, setZoneNames] = useState({});

  // Latest values for use inside the WebSocket listener.
  const soundOnRef = useRef(soundOn);
  const zoneNamesRef = useRef(zoneNames);
  const tRef = useRef(t);
  const lastSeenRef = useRef(new Map());
  const nextIdRef = useRef(1);

  useEffect(() => {
    soundOnRef.current = soundOn;
    zoneNamesRef.current = zoneNames;
    tRef.current = t;
  }, [soundOn, zoneNames, t]);

  // ---------------------------------------------------
  // Zone names for readable alerts ("Jayanagar" not "ZONE-02")
  // ---------------------------------------------------

  useEffect(() => {
    API.get("/api/zones")
      .then((response) => {
        const names = {};
        response.data.zones.forEach((zone) => {
          names[zone.zone_id] = zone.name_en;
        });
        setZoneNames(names);
      })
      .catch(() => {
        // Alerts still work with zone IDs.
      });
  }, []);

  // Browsers only allow sound after the user has interacted
  // with the page once.
  useEffect(() => {
    window.addEventListener("pointerdown", unlockAlertSound, { once: true });
    window.addEventListener("keydown", unlockAlertSound, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAlertSound);
      window.removeEventListener("keydown", unlockAlertSound);
    };
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  // ---------------------------------------------------
  // Handle new alerts from the live feed
  // ---------------------------------------------------

  useEffect(() => {
    const showDesktopNotification = (alert) => {
      if (
        !document.hidden ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      const translate = tRef.current;
      const zoneName =
        zoneNamesRef.current[alert.zone_id] || alert.zone_id;

      try {
        new Notification(
          `${translate(ALERT_TITLES[alert.type] || "Alert")} · ${translate(zoneName)}`,
          {
            body: translate(alert.message),
            tag: `${alert.zone_id}-${alert.type}`,
          }
        );
      } catch (error) {
        console.error("JalRakshak AI desktop notification error:", error);
      }
    };

    return subscribe((message) => {
      if (message.event !== "sensor_update" || !message.alerts?.length) {
        return;
      }

      const now = Date.now();
      const fresh = [];

      message.alerts.forEach((alert) => {
        const key = `${alert.zone_id}:${alert.type}`;
        const lastSeen = lastSeenRef.current.get(key);

        lastSeenRef.current.set(key, now);

        if (lastSeen && now - lastSeen < REPEAT_WINDOW_MS) {
          // Same ongoing problem: update the existing entry.
          setAlerts((current) =>
            current.map((item) =>
              item.key === key && item.open
                ? { ...item, count: item.count + 1, receivedAt: now }
                : item
            )
          );
          return;
        }

        fresh.push({
          id: nextIdRef.current++,
          key,
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          zoneId: alert.zone_id,
          deviceId: alert.device_id,
          receivedAt: now,
          count: 1,
          read: false,
          open: true,
        });
      });

      if (!fresh.length) {
        return;
      }

      setAlerts((current) =>
        [
          ...fresh,
          // An older entry for the same problem is no longer "open".
          ...current.map((item) =>
            fresh.some((alert) => alert.key === item.key)
              ? { ...item, open: false }
              : item
          ),
        ].slice(0, MAX_HISTORY)
      );

      setToasts((current) => [...fresh, ...current].slice(0, MAX_TOASTS));

      if (soundOnRef.current) {
        const critical = fresh.some((alert) => alert.severity === "CRITICAL");
        playAlertSound(critical);
      }

      fresh.forEach(showDesktopNotification);
    });
  }, [subscribe]);

  // ---------------------------------------------------
  // Actions
  // ---------------------------------------------------

  const toggleSound = useCallback(() => {
    setSoundOn((current) => {
      const next = !current;

      try {
        localStorage.setItem(SOUND_KEY, next ? "on" : "off");
      } catch {
        // Ignore storage errors.
      }

      if (next) {
        unlockAlertSound();
        playAlertSound(false);
      }

      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts((current) => current.map((alert) => ({ ...alert, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setAlerts([]);
    setToasts([]);
  }, []);

  const unreadCount = alerts.filter((alert) => !alert.read).length;

  return (
    <AlertCenterContext.Provider
      value={{
        alerts,
        toasts,
        unreadCount,
        soundOn,
        zoneNames,
        toggleSound,
        dismissToast,
        markAllRead,
        clearAll,
      }}
    >
      {children}
    </AlertCenterContext.Provider>
  );
}

export default AlertCenterProvider;
