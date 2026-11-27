import { Activity, AlertTriangle, Cpu, Gauge, Droplets, FlaskConical } from "lucide-react";
import "./Controls.css";

function Controls() {
  return (
    <div className="controls-page">
      <div className="controls-header">
        <div className="controls-title-icon"><Activity size={42} /></div>
        <div className="controls-title-area">
          <span className="controls-brand">JALRAKSHAK AI</span>
          <h1>Device Monitoring</h1>
          <p>Live monitoring from your physical ESP32 sensor unit.</p>
        </div>
      </div>

      <div className="controls-simulation-banner">
        <div className="controls-banner-icon"><AlertTriangle size={22} /></div>
        <div>
          <strong>Sensor-only IoT configuration</strong>
          <span>
            Your current ESP32 setup contains monitoring sensors only.
            Motor, valve, automatic-control and emergency-shutdown actions
            are unavailable because no relay or actuator hardware is connected.
          </span>
        </div>
      </div>

      <section className="controls-status-grid">
        <div className="controls-status-card">
          <div className="controls-card-top"><div className="controls-card-icon"><Cpu size={24} /></div><span className="controls-status-pill status-active">ESP32</span></div>
          <h3>Physical device telemetry</h3>
          <p>Only readings explicitly tagged by the ESP32 firmware or USB bridge are accepted by the backend.</p>
        </div>
        <div className="controls-status-card">
          <div className="controls-card-top"><div className="controls-card-icon"><Gauge size={24} /></div><span className="controls-status-pill status-active">MONITOR</span></div>
          <h3>Flow and pressure</h3>
          <p>Live flow-rate and pressure measurements are used for monitoring and anomaly detection.</p>
        </div>
        <div className="controls-status-card">
          <div className="controls-card-top"><div className="controls-card-icon"><FlaskConical size={24} /></div><span className="controls-status-pill status-active">MONITOR</span></div>
          <h3>Water quality sensors</h3>
          <p>pH, turbidity and TDS measurements feed the water-quality analysis.</p>
        </div>
        <div className="controls-status-card">
          <div className="controls-card-top"><div className="controls-card-icon"><Droplets size={24} /></div><span className="controls-status-pill status-inactive">NOT INSTALLED</span></div>
          <h3>Motor and smart valve</h3>
          <p>These actions remain disabled until physical relays and actuators are installed and wired to the ESP32.</p>
        </div>
      </section>
    </div>
  );
}

export default Controls;
