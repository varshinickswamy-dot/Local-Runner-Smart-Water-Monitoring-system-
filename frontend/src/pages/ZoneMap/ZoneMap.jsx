import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  MapContainer,
  TileLayer,
  Circle,
  Polyline,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Gauge,
  Home,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Maximize2,
  WifiOff,
  X,
} from "lucide-react";

import "leaflet/dist/leaflet.css";
import "./ZoneMap.css";

import API from "../../services/api";
import useSensorWebSocket from "../../hooks/useSensorWebSocket";
import useTheme from "../../context/useTheme";
import { ALERT_ICONS, ALERT_TITLES } from "../../components/AlertCenter/alertMeta";

// =====================================================
// JalRakshak AI - Live Zone Map
// =====================================================

const STATUS_TONE = {
  NORMAL: "normal",
  WARNING: "warning",
  CRITICAL: "critical",
  OFFLINE: "offline",
};

const STATUS_LABEL = {
  NORMAL: "Normal",
  WARNING: "Warning",
  CRITICAL: "Critical",
  OFFLINE: "Offline",
};

// Free OpenStreetMap tiles (no API key). In dark mode the
// tiles are darkened with a CSS filter (see ZoneMap.css).
const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const TILE_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

// Background refresh, mainly to notice zones going offline.
const REFRESH_MS = 30000;

const ZONE_RADIUS_METRES = 2200;

function toneOf(status) {
  return STATUS_TONE[status] || "offline";
}

function formatTime(iso) {
  if (!iso) {
    return null;
  }

  return new Date(iso).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatNumber(value, digits = 1) {
  return typeof value === "number" ? value.toFixed(digits) : "–";
}

// Plain-language explanation of what is wrong in a zone.
function describeZone(zone) {
  if (zone.status === "OFFLINE") {
    return ["This zone's sensor has stopped reporting."];
  }

  const detection = zone.detection;
  const reasons = [];

  if (detection?.leakage?.detected) reasons.push(detection.leakage.reason);
  if (detection?.theft?.suspicious) reasons.push(detection.theft.reason);
  if (detection?.water_quality?.problem) reasons.push(detection.water_quality.reason);
  if (detection?.sensor_health?.status === "FAULT") reasons.push(detection.sensor_health.reason);

  return reasons.length ? reasons : ["Everything looks normal in this zone."];
}

function waterSafety(zone) {
  if (zone.status === "OFFLINE" || !zone.detection) {
    return "unknown";
  }

  return zone.detection.water_quality?.problem ? "unsafe" : "safe";
}

function flowSpeed(flowRate) {
  if (!flowRate) return "slow";
  if (flowRate > 20) return "fast";
  if (flowRate < 11) return "slow";
  return "normal";
}

// ---------------------------------------------------
// Map markers (plain HTML so they can pulse with CSS)
// ---------------------------------------------------

// Icons are cached so live updates only rebuild a marker
// when its status or selection actually changes.
const iconCache = new Map();

function zoneIcon(zone, selected) {
  const tone = toneOf(zone.status);
  const cacheKey = `${zone.zone_id}|${tone}|${selected}`;

  if (iconCache.has(cacheKey)) {
    return iconCache.get(cacheKey);
  }

  const icon = L.divIcon({
    className: "zone-marker-wrapper",
    iconSize: [0, 0],
    html: `
      <div class="zone-marker zone-marker--${tone}${selected ? " is-selected" : ""}">
        <span class="zone-marker__pulse"></span>
        <span class="zone-marker__dot"></span>
        <span class="zone-marker__label">${zone.name_en}</span>
      </div>`,
  });

  iconCache.set(cacheKey, icon);
  return icon;
}

const reservoirIcon = L.divIcon({
  className: "zone-marker-wrapper",
  iconSize: [0, 0],
  html: `
    <div class="reservoir-marker">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/></svg>
    </div>`,
});

// Moves the map when the selected zone changes.
function MapController({ zones, reservoir, selectedZone, fitAllSignal, zoomSignal }) {
  const map = useMap();
  const firstRunRef = useRef(true);

  useEffect(() => {
    if (selectedZone) {
      map.flyTo([selectedZone.lat, selectedZone.lng], 13, { duration: 0.8 });
    }
  }, [map, selectedZone?.zone_id, zoomSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Opened with ?zone=... (e.g. from an alert): keep that zone in view.
    const firstRun = firstRunRef.current;
    firstRunRef.current = false;

    if (!zones.length || (firstRun && selectedZone)) return;

    const points = zones.map((zone) => [zone.lat, zone.lng]);
    if (reservoir) points.push([reservoir.lat, reservoir.lng]);

    map.flyToBounds(points, { padding: [40, 40], duration: 0.8 });
  }, [map, fitAllSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ---------------------------------------------------
// Side panel: details of one zone
// ---------------------------------------------------

function ZoneDetails({ zone, onClose, onZoom }) {
  const tone = toneOf(zone.status);
  const safety = waterSafety(zone);
  const reading = zone.reading || {};
  const reasons = describeZone(zone);
  const updated = formatTime(zone.last_seen);

  const readings = [
    { label: "Flow", value: formatNumber(reading.flow_rate), unit: "L/min" },
    { label: "Pressure", value: formatNumber(reading.pressure_bar, 2), unit: "bar" },
    { label: "pH Level", value: formatNumber(reading.ph, 2), unit: "" },
    { label: "Turbidity", value: formatNumber(reading.turbidity), unit: "NTU" },
    { label: "TDS", value: formatNumber(reading.tds, 0), unit: "ppm" },
    { label: "Total Water", value: formatNumber(reading.total_litres, 0), unit: "L" },
  ];

  return (
    <section className={`zone-details zone-details--${tone}`} aria-live="polite">
      <header className="zone-details__header">
        <div>
          <h2>{zone.name_en}</h2>
          <p>
            <span data-no-translate>{zone.zone_id}</span>
            <span aria-hidden="true"> · </span>
            <Home size={13} aria-hidden="true" />
            <span data-no-translate> {zone.households.toLocaleString("en-IN")} </span>
            <span>Households</span>
          </p>
        </div>

        <div className="zone-details__header-actions">
          <button type="button" onClick={onZoom} title="Zoom to zone" aria-label="Zoom to zone">
            <LocateFixed size={17} />
          </button>
          <button type="button" onClick={onClose} title="Close details" aria-label="Close details">
            <X size={17} />
          </button>
        </div>
      </header>

      <span className={`zone-status zone-status--${tone}`}>
        {STATUS_LABEL[zone.status] || zone.status}
      </span>

      <div className={`zone-safety zone-safety--${safety}`}>
        {safety === "safe" && <CheckCircle2 size={22} />}
        {safety === "unsafe" && <AlertTriangle size={22} />}
        {safety === "unknown" && <WifiOff size={22} />}
        <div>
          <span>Is the water safe to drink?</span>
          <strong>
            {safety === "safe" && "Yes, water quality is normal"}
            {safety === "unsafe" && "Not right now. Boil or filter before drinking."}
            {safety === "unknown" && "No recent data"}
          </strong>
        </div>
      </div>

      <div className="zone-details__section">
        <h3>What is happening</h3>
        <ul className="zone-reasons">
          {reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </div>

      <div className="zone-readings">
        {readings.map((item) => (
          <div key={item.label} className="zone-reading">
            <span>{item.label}</span>
            <strong>
              <span data-no-translate>{item.value}</span>
              {item.unit && <small data-no-translate> {item.unit}</small>}
            </strong>
          </div>
        ))}
      </div>

      <p className="zone-details__meta">
        {zone.ai_detection?.risk && (
          <>
            <span>AI risk</span>
            <span>: </span>
            <strong>{zone.ai_detection.risk}</strong>
            <span aria-hidden="true"> · </span>
          </>
        )}
        <span>Updated</span>
        <span>: </span>
        <span data-no-translate>{updated || "–"}</span>
      </p>

      <div className="zone-details__section">
        <h3>Recent alerts in this zone</h3>

        {zone.recent_alerts.length === 0 ? (
          <p className="zone-details__empty">No alerts in this zone</p>
        ) : (
          <ul className="zone-alerts">
            {zone.recent_alerts.map((alert, index) => {
              const Icon = ALERT_ICONS[alert.type] || AlertTriangle;

              return (
                <li
                  key={`${alert.timestamp}-${alert.type}-${index}`}
                  className={alert.severity === "CRITICAL" ? "critical" : "warning"}
                >
                  <Icon size={15} />
                  <span className="zone-alerts__text">
                    <strong>{ALERT_TITLES[alert.type] || alert.type}</strong>
                    <span>{alert.message}</span>
                  </span>
                  <time data-no-translate>{formatTime(alert.timestamp)}</time>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------
// Page
// ---------------------------------------------------

function ZoneMap() {
  const [zones, setZones] = useState([]);
  const [reservoir, setReservoir] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [fitAllSignal, setFitAllSignal] = useState(0);
  const [zoomSignal, setZoomSignal] = useState(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const selectedZoneId = searchParams.get("zone");

  const { subscribe } = useSensorWebSocket();
  const { theme } = useTheme();

  // Initial load + slow background refresh
  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await API.get("/api/zones");
        if (!active) return;

        setZones(response.data.zones);
        setReservoir(response.data.reservoir);
        setError("");
      } catch (err) {
        console.error("JalRakshak AI Zone Map Error:", err);
        if (active) setError("Unable to load the zone map.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    const timer = setInterval(load, REFRESH_MS);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // Instant updates from the live feed
  useEffect(
    () =>
      subscribe((message) => {
        if (message.event !== "sensor_update") return;

        setZones((current) =>
          current.map((zone) => {
            if (zone.zone_id !== message.zone_id) return zone;

            const newAlerts = (message.alerts || []).map((alert) => ({
              type: alert.type,
              severity: alert.severity,
              message: alert.message,
              timestamp: alert.timestamp,
            }));

            return {
              ...zone,
              status: message.detection?.overall_status || "NORMAL",
              last_seen: message.timestamp,
              reading: message.sensor_data,
              detection: message.detection,
              ai_detection: message.ai_detection,
              recent_alerts: [...newAlerts, ...zone.recent_alerts].slice(0, 5),
            };
          })
        );
      }),
    [subscribe]
  );

  const selectZone = useCallback(
    (zoneId) => {
      setSearchParams(zoneId ? { zone: zoneId } : {}, { replace: true });
    },
    [setSearchParams]
  );

  const selectedZone = zones.find((zone) => zone.zone_id === selectedZoneId) || null;

  const summary = useMemo(() => {
    const count = (status) => zones.filter((zone) => zone.status === status).length;

    return {
      normal: count("NORMAL"),
      attention: count("WARNING") + count("CRITICAL"),
      offline: count("OFFLINE"),
      flow: zones.reduce(
        (total, zone) =>
          zone.status !== "OFFLINE" ? total + (zone.reading?.flow_rate || 0) : total,
        0
      ),
    };
  }, [zones]);

  // Problems first, then by name
  const sortedZones = useMemo(() => {
    const rank = { CRITICAL: 0, WARNING: 1, OFFLINE: 2, NORMAL: 3 };
    return [...zones].sort(
      (a, b) => rank[a.status] - rank[b.status] || a.name_en.localeCompare(b.name_en)
    );
  }, [zones]);

  if (loading) {
    return (
      <div className="zone-map-page">
        <div className="zone-map-state">
          <div className="zone-map-spinner" />
          <p>Loading zone map...</p>
        </div>
      </div>
    );
  }

  if (error && !zones.length) {
    return (
      <div className="zone-map-page">
        <div className="zone-map-state zone-map-state--error">
          <AlertTriangle size={32} />
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="zone-map-page">
      <header className="zone-map-header">
        <div className="zone-map-header__icon">
          <MapIcon size={24} />
        </div>
        <div>
          <h1>Live Zone Map</h1>
          <p>Every zone of the water network, updated live.</p>
        </div>
      </header>

      <div className="zone-map-stats">
        <div className="zone-stat zone-stat--normal">
          <CheckCircle2 size={20} />
          <div>
            <strong data-no-translate>{summary.normal}</strong>
            <span>Zones normal</span>
          </div>
        </div>
        <div className={`zone-stat zone-stat--attention ${summary.attention ? "is-active" : ""}`}>
          <AlertTriangle size={20} />
          <div>
            <strong data-no-translate>{summary.attention}</strong>
            <span>Need attention</span>
          </div>
        </div>
        <div className="zone-stat zone-stat--offline">
          <WifiOff size={20} />
          <div>
            <strong data-no-translate>{summary.offline}</strong>
            <span>Zones offline</span>
          </div>
        </div>
        <div className="zone-stat zone-stat--flow">
          <Activity size={20} />
          <div>
            <strong>
              <span data-no-translate>{summary.flow.toFixed(1)}</span>
              <small data-no-translate> L/min</small>
            </strong>
            <span>Water flowing now</span>
          </div>
        </div>
      </div>

      <div className="zone-map-layout">
        <div className="zone-map-canvas">
          <MapContainer
            center={reservoir ? [reservoir.lat, reservoir.lng] : [12.97, 77.6]}
            zoom={11}
            scrollWheelZoom
            className="zone-map-leaflet"
          >
            <TileLayer
              key={theme}
              url={TILE_URL}
              attribution={TILE_ATTRIBUTION}
              maxZoom={19}
              className={theme === "light" ? "map-tiles" : "map-tiles map-tiles--dark"}
            />

            <MapController
              zones={zones}
              reservoir={reservoir}
              selectedZone={selectedZone}
              fitAllSignal={fitAllSignal}
              zoomSignal={zoomSignal}
            />

            {reservoir &&
              zones.map((zone) => {
                const tone = toneOf(zone.status);
                const positions = [
                  [reservoir.lat, reservoir.lng],
                  [zone.lat, zone.lng],
                ];

                return [
                  <Polyline
                    key={`${zone.zone_id}-pipe`}
                    positions={positions}
                    pathOptions={{ className: `pipe-base pipe-base--${tone}` }}
                    interactive={false}
                  />,
                  zone.status !== "OFFLINE" && (
                    <Polyline
                      key={`${zone.zone_id}-flow-${tone}-${flowSpeed(zone.reading?.flow_rate)}`}
                      positions={positions}
                      pathOptions={{
                        className: `pipe-flow pipe-flow--${tone} pipe-flow--${flowSpeed(
                          zone.reading?.flow_rate
                        )}`,
                      }}
                      interactive={false}
                    />
                  ),
                ];
              })}

            {zones.map((zone) => {
              const tone = toneOf(zone.status);

              return (
                <Circle
                  key={`${zone.zone_id}-area-${tone}`}
                  center={[zone.lat, zone.lng]}
                  radius={ZONE_RADIUS_METRES}
                  pathOptions={{ className: `zone-area zone-area--${tone}` }}
                  eventHandlers={{ click: () => selectZone(zone.zone_id) }}
                />
              );
            })}

            {reservoir && (
              <Marker position={[reservoir.lat, reservoir.lng]} icon={reservoirIcon}>
                <Tooltip direction="top" offset={[0, -18]}>
                  <strong>Central Reservoir</strong>
                  <br />
                  <span>Water source for all zones</span>
                </Tooltip>
              </Marker>
            )}

            {zones.map((zone) => (
              <Marker
                key={`${zone.zone_id}-marker`}
                position={[zone.lat, zone.lng]}
                icon={zoneIcon(zone, zone.zone_id === selectedZoneId)}
                eventHandlers={{ click: () => selectZone(zone.zone_id) }}
                keyboard
                title={zone.name_en}
              />
            ))}
          </MapContainer>

          <div className="zone-map-legend" aria-label="Legend">
            <span><i className="legend-dot legend-dot--normal" />Normal</span>
            <span><i className="legend-dot legend-dot--warning" />Warning</span>
            <span><i className="legend-dot legend-dot--critical" />Critical</span>
            <span><i className="legend-dot legend-dot--offline" />Offline</span>
            <span><i className="legend-pipe" />Pipeline</span>
          </div>

          <button
            type="button"
            className="zone-map-fit"
            onClick={() => setFitAllSignal((value) => value + 1)}
            title="Show all zones"
            aria-label="Show all zones"
          >
            <Maximize2 size={17} />
          </button>
        </div>

        <aside className="zone-map-side">
          {selectedZone ? (
            <ZoneDetails
              zone={selectedZone}
              onClose={() => selectZone(null)}
              onZoom={() => setZoomSignal((value) => value + 1)}
            />
          ) : (
            <div className="zone-map-hint">
              <MapPin size={22} />
              <div>
                <strong>Select a zone</strong>
                <span>Click a zone on the map or in the list to see its live readings.</span>
              </div>
            </div>
          )}

          <div className="zone-list">
            <h3>All zones</h3>

            <ul>
              {sortedZones.map((zone) => {
                const tone = toneOf(zone.status);

                return (
                  <li key={zone.zone_id}>
                    <button
                      type="button"
                      className={`zone-list__item zone-list__item--${tone} ${
                        zone.zone_id === selectedZoneId ? "is-selected" : ""
                      }`}
                      onClick={() => selectZone(zone.zone_id)}
                      aria-pressed={zone.zone_id === selectedZoneId}
                    >
                      <span className={`zone-list__dot zone-list__dot--${tone}`} />
                      <span className="zone-list__name">{zone.name_en}</span>
                      <span className="zone-list__flow">
                        <Droplets size={13} />
                        <span data-no-translate>
                          {zone.status === "OFFLINE" ? "–" : formatNumber(zone.reading?.flow_rate)}
                        </span>
                      </span>
                      <span className="zone-list__flow">
                        <Gauge size={13} />
                        <span data-no-translate>
                          {zone.status === "OFFLINE" ? "–" : formatNumber(zone.reading?.pressure_bar, 2)}
                        </span>
                      </span>
                      <span className={`zone-status zone-status--${tone}`}>
                        {STATUS_LABEL[zone.status] || zone.status}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ZoneMap;
