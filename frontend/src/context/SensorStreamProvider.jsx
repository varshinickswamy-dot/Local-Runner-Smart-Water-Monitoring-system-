import { useCallback, useEffect, useRef, useState } from "react";

import SensorStreamContext from "./SensorStreamContext";
import { WS_BASE_URL } from "../config";

/**
 * JalRakshak AI
 * One real-time WebSocket connection shared by the whole app.
 *
 * - `latestUpdate` / `connected` for components that only need
 *   the newest reading (e.g. the Dashboard).
 * - `subscribe(listener)` for components that must see EVERY
 *   message (zone map, instant alerts). Six zones report at
 *   almost the same moment, so React state alone would drop
 *   messages when updates are batched.
 */

const SOCKET_URL = `${WS_BASE_URL}/ws/sensor-data`;

function SensorStreamProvider({ children }) {
  const [latestUpdate, setLatestUpdate] = useState(null);
  const [connected, setConnected] = useState(false);

  const listenersRef = useRef(new Set());

  useEffect(() => {
    let socket = null;
    let reconnectTimer = null;
    let attempts = 0;
    let active = true;

    const scheduleReconnect = () => {
      attempts += 1;

      // 1s → 2s → 4s → 8s → 10s
      const delay = Math.min(
        1000 * 2 ** (Math.min(attempts, 5) - 1),
        10000
      );

      reconnectTimer = setTimeout(connect, delay);
    };

    function connect() {
      if (!active) {
        return;
      }

      try {
        socket = new WebSocket(SOCKET_URL);
      } catch (error) {
        console.error("JalRakshak AI WebSocket connection failed:", error);
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        if (!active) return;
        attempts = 0;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        if (!active) return;

        let message;

        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.error("JalRakshak AI WebSocket message parsing error:", error);
          return;
        }

        setLatestUpdate(message);

        listenersRef.current.forEach((listener) => {
          try {
            listener(message);
          } catch (error) {
            console.error("JalRakshak AI WebSocket listener error:", error);
          }
        });
      };

      socket.onclose = () => {
        if (!active) return;
        setConnected(false);
        socket = null;
        scheduleReconnect();
      };
    }

    connect();

    return () => {
      active = false;
      clearTimeout(reconnectTimer);

      if (socket) {
        socket.close();
      }
    };
  }, []);

  const subscribe = useCallback((listener) => {
    listenersRef.current.add(listener);

    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  return (
    <SensorStreamContext.Provider
      value={{ latestUpdate, connected, subscribe }}
    >
      {children}
    </SensorStreamContext.Provider>
  );
}

export default SensorStreamProvider;
