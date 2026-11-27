import { useContext } from "react";

import SensorStreamContext from "../context/SensorStreamContext";

/**
 * JalRakshak AI
 * Real-time sensor updates from the shared WebSocket
 * (see context/SensorStreamProvider.jsx).
 *
 * Returns { latestUpdate, connected, subscribe }.
 */

function useSensorWebSocket() {
  const context = useContext(SensorStreamContext);

  if (!context) {
    throw new Error(
      "useSensorWebSocket must be used inside SensorStreamProvider"
    );
  }

  return context;
}

export default useSensorWebSocket;
